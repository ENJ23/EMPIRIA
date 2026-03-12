const MercadoPago = require('mercadopago');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const emailService = require('../services/emailService');

// Configure Mercado Pago
const client = new MercadoPago.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN
});

const preference = new MercadoPago.Preference(client);
const mpPayment = new MercadoPago.Payment(client);

const getActiveReservedCount = async (eventId) => {
    const activeReservations = await Reservation.aggregate([
        {
            $match: {
                event: eventId,
                confirmed: false,
                reservedUntil: { $gt: new Date() }
            }
        },
        {
            $group: {
                _id: null,
                totalReserved: { $sum: '$quantity' }
            }
        }
    ]);

    return activeReservations.length > 0 ? activeReservations[0].totalReserved : 0;
};

const syncReservedTickets = async (eventId) => {
    const reservedCount = await getActiveReservedCount(eventId);
    await Event.findByIdAndUpdate(eventId, { reservedTickets: reservedCount });
    return reservedCount;
};

const reserveStockAtomically = async (eventId, quantity) => {
    return Event.findOneAndUpdate(
        {
            _id: eventId,
            $expr: {
                $lte: [
                    {
                        $add: [
                            { $ifNull: ['$ticketsSold', 0] },
                            { $ifNull: ['$reservedTickets', 0] },
                            Number(quantity)
                        ]
                    },
                    '$capacity'
                ]
            }
        },
        { $inc: { reservedTickets: Number(quantity) } },
        { new: true }
    );
};

const releaseReservedStock = async (eventId, quantity) => {
    await Event.updateOne(
        { _id: eventId },
        [
            {
                $set: {
                    reservedTickets: {
                        $max: [
                            0,
                            {
                                $subtract: [
                                    { $ifNull: ['$reservedTickets', 0] },
                                    Number(quantity)
                                ]
                            }
                        ]
                    }
                }
            }
        ]
    );
};

const rollbackSoldTickets = async (eventId, quantity) => {
    await Event.updateOne(
        { _id: eventId },
        [
            {
                $set: {
                    ticketsSold: {
                        $max: [
                            0,
                            {
                                $subtract: [
                                    { $ifNull: ['$ticketsSold', 0] },
                                    Number(quantity)
                                ]
                            }
                        ]
                    }
                }
            }
        ]
    );
};

/**
 * Create a Mercado Pago Preference
 * This initializes a payment and saves it to the Payment table
 */
const createPreference = async (req, res) => {
    let stockLocked = false;
    let lockedQuantity = 0;
    let lockedEventId = null;
    try {
        const { eventId, quantity, ticketType = 'general' } = req.body;
        const userId = req.uid;
        const qty = Number(quantity);

        // Validaciones
        if (!eventId || !qty || qty < 1) {
            return res.status(400).json({
                status: 0,
                msg: 'Parámetros inválidos: eventId y quantity son requeridos'
            });
        }

        // Verificar que el evento exista
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        // ✅ VALIDAR: Si el evento es GRATUITO, no permitir pago
        if (event.isFree) {
            return res.status(400).json({
                status: 0,
                msg: 'Este es un evento gratuito. Usa el endpoint de solicitud de entradas gratuitas en su lugar.'
            });
        }

        // ✅ VALIDAR: Si onlyGeneralPrice es true, rechazar solicitudes VIP
        if (event.onlyGeneralPrice && ticketType === 'vip') {
            return res.status(400).json({
                status: 0,
                msg: 'Este evento solo ofrece entradas de precio general. VIP no está disponible.'
            });
        }

        // Verificar que el usuario exista
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
        }

        // Sync reservas activas para evitar stock fantasma por TTL
        const reservedCount = await syncReservedTickets(event._id);
        const ticketsSold = event.ticketsSold || 0;
        const availableTickets = event.capacity - ticketsSold - reservedCount;

        if (availableTickets <= 0) {
            return res.status(400).json({
                status: 0,
                msg: 'Entradas agotadas para este evento',
                available: 0,
                soldOut: true
            });
        }

        // Verificar que la cantidad solicitada no exceda la disponibilidad
        if (qty > availableTickets) {
            return res.status(400).json({
                status: 0,
                msg: `Solo hay ${availableTickets} entrada(s) disponible(s)`,
                available: availableTickets,
                requested: qty
            });
        }

        // Reserva atómica del stock para evitar overselling concurrente
        const lockedEvent = await reserveStockAtomically(event._id, qty);
        if (!lockedEvent) {
            const latestEvent = await Event.findById(event._id).select('capacity ticketsSold reservedTickets');
            const latestAvailable = Math.max(0, (latestEvent?.capacity || 0) - (latestEvent?.ticketsSold || 0) - (latestEvent?.reservedTickets || 0));
            return res.status(400).json({
                status: 0,
                msg: `Solo hay ${latestAvailable} entrada(s) disponible(s)`,
                available: latestAvailable,
                requested: qty
            });
        }
        stockLocked = true;
        lockedQuantity = qty;
        lockedEventId = event._id;

        // Determine price based on ticket type
        let price = event.priceRange.min;
        if (ticketType === 'vip' && event.priceRange.max) {
            price = event.priceRange.max;
        } else if (event.isPreventa && event.preventaPrice) {
            price = event.preventaPrice;
        }

        const totalAmount = price * qty;

        console.log(`[createPreference] User: ${userId}, Event: ${eventId}, Quantity: ${qty}, TicketType: ${ticketType}, Price: ${price}, Total: ${totalAmount}`);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

        // Create external reference that will be returned in webhook
        // Include timestamp and random to avoid collisions on unique external_reference
        const externalData = { u: userId, e: eventId, t: Date.now(), r: Math.random().toString(36).slice(2, 8) };
        const externalReference = JSON.stringify(externalData);

        // Create preference in Mercado Pago
        const webhookSecret = process.env.WEBHOOK_SECRET || '';
        const webhookBase = process.env.WEBHOOK_URL || '';
        const notificationUrl = webhookBase ? (webhookSecret ? `${webhookBase}?token=${encodeURIComponent(webhookSecret)}` : webhookBase) : '';

        const result = await preference.create({
            body: {
                items: [
                    {
                        title: `${event.title} - ${ticketType}`,
                        quantity: Number(qty),
                        unit_price: Number(price),
                        currency_id: 'ARS',
                        picture_url: event.imageUrl || ''
                    }
                ],
                back_urls: {
                    success: `${frontendUrl}/success`,
                    failure: `${frontendUrl}/failure`,
                    pending: `${frontendUrl}/pending`
                },
                notification_url: notificationUrl,
                auto_return: 'approved',
                external_reference: externalReference
            }
        });

        console.log(`[createPreference] MP Preference created: ${result.id}`);

        // Save payment record to database with "pending" status
        const payment = new Payment({
            user: userId,
            event: eventId,
            amount: totalAmount,
            quantity: Number(qty),
            ticketType: ticketType,
            mp_preference_id: result.id,
            mp_init_point: result.init_point,
            external_reference: externalReference,
            status: 'pending',
            transaction_amount: totalAmount
        });

        const savedPayment = await payment.save();
        console.log(`[createPreference] Payment record saved: ${savedPayment._id}`);

        // Create a reservation to hold stock for 10 minutes
        const reservedUntil = new Date(Date.now() + 600000); // 10 minutes
        const reservation = new Reservation({
            user: userId,
            event: eventId,
            payment: savedPayment._id,
            quantity: Number(qty),
            reservedUntil,
            confirmed: false
        });
        await reservation.save();
        console.log(`[createPreference] ✅ Reservation created: ${reservation._id}, expires at ${reservedUntil}`);

        res.json({
            status: 1,
            msg: 'Preferencia creada',
            init_point: result.init_point,
            preference_id: result.id,
            payment_id: savedPayment._id
        });

    } catch (error) {
        console.error('[createPreference] Error:', error.message);
        if (stockLocked && lockedEventId && lockedQuantity > 0) {
            try {
                await releaseReservedStock(lockedEventId, lockedQuantity);
            } catch (rollbackError) {
                console.error('[createPreference] Error rolling back reserved stock:', rollbackError.message);
            }
        }
        res.status(500).json({ status: 0, msg: 'Error al procesar el pago' });
    }
};

/**
 * Handle Mercado Pago Webhook
 * MP sends: POST /webhook?topic=payment&id=PAYMENT_ID
 */
const receiveWebhook = async (req, res) => {
    try {
        console.log('[webhook] Received webhook request');
        console.log('[webhook] Query params:', req.query);
        console.log('[webhook] Body:', req.body);
        // Validate webhook secret token if configured
        const expectedToken = process.env.WEBHOOK_SECRET || '';
        if (expectedToken) {
            if (req.query.token !== expectedToken) {
                console.warn('[webhook] Invalid or missing webhook token; ignoring');
                return res.sendStatus(200);
            }
        }

        // Mercado Pago sends topic in query string and optionally id
        const topic = req.query.topic || req.body.type;
        const paymentId = req.query.id || req.body.data?.id;

        console.log(`[webhook] Topic: ${topic}, PaymentId: ${paymentId}`);

        // Only process payment notifications
        if (topic !== 'payment') {
            console.log('[webhook] Ignoring non-payment topic');
            return res.sendStatus(200);
        }

        if (!paymentId) {
            console.error('[webhook] Missing payment ID');
            return res.sendStatus(200);
        }

        // Query Mercado Pago API to get full payment details
        console.log(`[webhook] Fetching payment details from MP: ${paymentId}`);
        let mpPaymentData;
        try {
            mpPaymentData = await mpPayment.get({ id: paymentId });
        } catch (error) {
            console.error('[webhook] Error fetching payment from MP:', error.message);
            // Return 200 to acknowledge webhook, but log the error
            return res.sendStatus(200);
        }

        console.log('[webhook] MP Payment Data:', JSON.stringify(mpPaymentData, null, 2));

        // Extract user and event info from external_reference
        let userId, eventId;
        if (mpPaymentData.external_reference) {
            try {
                const refs = JSON.parse(mpPaymentData.external_reference);
                userId = refs.u;
                eventId = refs.e;
                console.log(`[webhook] Extracted refs - User: ${userId}, Event: ${eventId}`);
            } catch (e) {
                console.error('[webhook] Error parsing external_reference:', e.message);
            }
        }

        if (!userId || !eventId) {
            console.error('[webhook] Missing user_id or event_id from external_reference');
            return res.sendStatus(200);
        }

        // Find or update the Payment record
        let paymentRecord = await Payment.findOne({ mp_payment_id: paymentId });

        // Prefer exact external_reference match (strongest link)
        if (!paymentRecord && mpPaymentData.external_reference) {
            paymentRecord = await Payment.findOne({
                external_reference: mpPaymentData.external_reference
            });
            if (paymentRecord) {
                console.log(`[webhook] Payment matched by external_reference: ${paymentRecord._id}`);
            }
        }

        // Last resort fallback by latest pending user/event
        if (!paymentRecord) {
            console.log(`[webhook] Payment not found by mp_payment_id/external_reference, searching by user and event...`);
            const payments = await Payment.find({
                user: userId,
                event: eventId,
                status: 'pending'
            }).sort({ createdAt: -1 }).limit(1);

            if (!payments || payments.length === 0) {
                console.error('[webhook] Payment record not found for this user and event');
                return res.sendStatus(200);
            }

            paymentRecord = payments[0];
        }

        // Update payment record with MP payment details
        paymentRecord.mp_payment_id = paymentId;
        paymentRecord.status = mpPaymentData.status;
        paymentRecord.mp_status_detail = mpPaymentData.status_detail || null;
        paymentRecord.transaction_amount = mpPaymentData.transaction_amount || paymentRecord.amount;
        paymentRecord.installments = mpPaymentData.installments || 1;
        paymentRecord.payment_method_id = mpPaymentData.payment_method?.id || null;
        paymentRecord.webhookReceivedAt = new Date();
        paymentRecord.lastWebhookData = mpPaymentData;

        if (mpPaymentData.status === 'approved') {
            paymentRecord.approvedAt = new Date();
        }

        await paymentRecord.save();
        console.log(`[webhook] Payment record updated: ${paymentRecord._id}, Status: ${mpPaymentData.status}`);

        // If payment is approved, create Ticket(s) based on the Reservation
        // ✅ NO revalidamos capacidad aquí; ya fue validada en createPreference
        if (mpPaymentData.status === 'approved') {
            try {
                const qty = Number(paymentRecord.quantity || 1);

                // Determine how many tickets already exist for this payment (idempotency)
                const existingCount = await Ticket.countDocuments({ payment: paymentRecord._id });
                const remainingToCreate = Math.max(0, qty - existingCount);

                if (remainingToCreate === 0) {
                    console.log(`[webhook] Tickets already created for payment ${paymentRecord._id}. Existing: ${existingCount}/${qty}`);
                } else {
                    // ✅ Crear tickets sin revalidar capacidad
                    // (confiamos en que fue validado en createPreference)
                    console.log(`[webhook] Creating ${remainingToCreate} ticket(s) for Payment: ${paymentRecord._id}`);
                    const perTicketAmount = (mpPaymentData.transaction_amount || paymentRecord.amount) / qty;
                    const bulkTickets = [];
                    for (let i = 0; i < remainingToCreate; i++) {
                        bulkTickets.push({
                            user: userId,
                            event: eventId,
                            payment: paymentRecord._id,
                            paymentId: paymentId, // legacy field
                            status: 'approved',
                            amount: perTicketAmount,
                            purchasedAt: new Date()
                        });
                    }
                    const createdTickets = await Ticket.insertMany(bulkTickets, { ordered: false });
                    console.log(`[webhook] ✅ Created ${remainingToCreate} ticket(s) for User: ${userId}, Event: ${eventId}`);

                    // Generate QR codes for each created ticket
                    console.log(`[webhook] Generating QR codes for ${createdTickets.length} tickets...`);
                    const qrPromises = createdTickets.map(async (ticket) => {
                        try {
                            const qrData = JSON.stringify({
                                ticketId: ticket._id.toString(),
                                eventId: ticket.event.toString(),
                                userId: ticket.user.toString(),
                                timestamp: ticket.purchasedAt.getTime()
                            });
                            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                                errorCorrectionLevel: 'H',
                                type: 'image/png',
                                width: 300,
                                margin: 2
                            });
                            ticket.entryQr = qrCodeDataURL;
                            await ticket.save();
                            console.log(`[webhook] ✅ QR generated for ticket: ${ticket._id}`);
                        } catch (qrError) {
                            console.error(`[webhook] ❌ QR generation failed for ticket ${ticket._id}:`, qrError.message);
                        }
                    });
                    await Promise.all(qrPromises);
                    console.log(`[webhook] ✅ All QR codes generated successfully`);

                    // Increment ticketsSold for the event
                    await Event.findByIdAndUpdate(
                        eventId,
                        { $inc: { ticketsSold: remainingToCreate } },
                        { new: true }
                    );
                    console.log(`[webhook] ✅ Event ticketsSold +${remainingToCreate} for event: ${eventId}`);
                }

                // Mark reservation as confirmed once and release reserved stock once
                const reservation = await Reservation.findOneAndUpdate(
                    { payment: paymentRecord._id, confirmed: false },
                    { confirmed: true },
                    { new: false }
                );
                if (reservation && reservation.quantity > 0) {
                    await releaseReservedStock(eventId, reservation.quantity);
                    console.log(`[webhook] ✅ Reserved stock released: -${reservation.quantity} for event ${eventId}`);
                }
            } catch (e) {
                console.error('[webhook] Error creating tickets:', e?.message || e);
            }
        } else {
            console.log(`[webhook] Payment status is '${mpPaymentData.status}', not creating ticket`);
            // Clean up reservation if payment failed/rejected/cancelled
            const reservation = await Reservation.findOneAndDelete({ payment: paymentRecord._id, confirmed: false });
            if (reservation && reservation.quantity > 0) {
                await releaseReservedStock(eventId, reservation.quantity);
                console.log(`[webhook] ✅ Reserved stock released after failed payment: -${reservation.quantity} for event ${eventId}`);
            }
            console.log(`[webhook] Reservation deleted for payment: ${paymentRecord._id}`);
        }

        // Always return 200 to acknowledge webhook receipt
        res.sendStatus(200);

    } catch (error) {
        console.error('[webhook] Unexpected error:', error.message, error.stack);
        res.sendStatus(500);
    }
};

/**
 * Get user's own payments with event and reservation details
 * Allows users to track payment status and rescind QR codes before expiry
 */
const getMyPayments = async (req, res) => {
    try {
        const userId = req.uid;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
        }

        // Fetch all payments for this user, populating event
        const payments = await Payment.find({ user: userId })
            .populate('event', 'title date location capacity')
            .sort({ createdAt: -1 });

        // Fetch reservations linked to these payments (since Payment has no direct reservation field)
        const paymentIds = payments.map(p => p._id);
        const reservations = await Reservation.find({ payment: { $in: paymentIds } })
            .select('payment quantity reservedUntil confirmed')
            .lean();
        const reservationByPayment = new Map(reservations.map(r => [String(r.payment), r]));

        // Enrich with reservation data and computed fields
        const enrichedPayments = payments.map(payment => {
            const reservation = reservationByPayment.get(String(payment._id));
            const isActive = reservation && !reservation.confirmed && reservation.reservedUntil > new Date();
            const timeRemainingMs = isActive ? reservation.reservedUntil - new Date() : 0;
            const timeRemainingMinutes = Math.ceil(timeRemainingMs / 60000);

            return {
                id: payment._id,
                event: payment.event,
                quantity: payment.quantity || 1,
                ticketType: payment.ticketType || 'general',
                mp_payment_id: payment.mp_payment_id,
                status: payment.status, // 'pending', 'approved', 'rejected', 'cancelled'
                amount: payment.amount,
                transaction_amount: payment.transaction_amount,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,

                // Reservation info for QR re-access
                isReserved: !!reservation,
                reservationConfirmed: reservation?.confirmed || false,
                reservedUntil: reservation?.reservedUntil || null,
                isReservationActive: isActive,
                timeRemainingMinutes: timeRemainingMinutes,

                // Mercado Pago link (only if still pending/in reservation window)
                canAccessQR: isActive || payment.status === 'pending',
                mp_init_point: payment.mp_init_point || null
            };
        });

        res.json({
            status: 1,
            msg: 'Pagos obtenidos correctamente',
            data: enrichedPayments,
            count: enrichedPayments.length
        });

    } catch (error) {
        console.error('[getMyPayments] Error:', error.message);
        res.status(500).json({
            status: 0,
            msg: 'Error al obtener los pagos',
            error: error.message
        });
    }
};

/**
 * Request free tickets for free events (no payment required)
 * Creates tickets directly without Mercado Pago
 */
const requestFreeTickets = async (req, res) => {
    let soldCommitted = false;
    let committedEventId = null;
    let committedQty = 0;
    try {
        const { eventId, quantity } = req.body;
        const userId = req.uid;
        const qty = Number(quantity);

        // Validations
        if (!eventId || !qty || qty < 1) {
            return res.status(400).json({
                status: 0,
                msg: 'Parámetros inválidos: eventId y quantity son requeridos'
            });
        }

        // Verify event exists and is free
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        if (!event.isFree) {
            return res.status(400).json({
                status: 0,
                msg: 'Este evento no es gratuito. Usa create-preference para eventos pagos.'
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
        }

        // ✅ VERIFICAR: Límite de entradas por usuario (máximo 4 entradas gratuitas por evento)
        const userExistingTickets = await Ticket.countDocuments({
            user: userId,
            event: eventId,
            status: { $in: ['approved', 'pending'] }
        });

        const maxFreeTickets = 4;
        if (userExistingTickets >= maxFreeTickets) {
            return res.status(400).json({
                status: 0,
                msg: `Ya tienes el máximo de ${maxFreeTickets} entradas gratuitas para este evento. No puedes solicitar más.`,
                currentTickets: userExistingTickets,
                maxAllowed: maxFreeTickets
            });
        }

        // Calcular cuántas entradas adicionales puede solicitar
        const canRequest = maxFreeTickets - userExistingTickets;
        if (qty > canRequest) {
            return res.status(400).json({
                status: 0,
                msg: `Solo puedes solicitar ${canRequest} entrada(s) más para este evento.`,
                currentTickets: userExistingTickets,
                canRequest: canRequest,
                requested: qty
            });
        }

        // Sync reservas activas y tomar cupo atómicamente en ticketsSold
        const reservedCount = await syncReservedTickets(event._id);
        const latestEvent = await Event.findOneAndUpdate(
            {
                _id: event._id,
                $expr: {
                    $lte: [
                        {
                            $add: [
                                { $ifNull: ['$ticketsSold', 0] },
                                { $ifNull: ['$reservedTickets', 0] },
                                Number(qty)
                            ]
                        },
                        '$capacity'
                    ]
                }
            },
            { $inc: { ticketsSold: Number(qty) } },
            { new: true }
        );

        const ticketsSold = event.ticketsSold || 0;
        const availableTickets = event.capacity - ticketsSold - reservedCount;

        if (availableTickets <= 0) {
            return res.status(400).json({
                status: 0,
                msg: 'Entradas agotadas para este evento',
                available: 0,
                soldOut: true
            });
        }

        if (!latestEvent || qty > availableTickets) {
            return res.status(400).json({
                status: 0,
                msg: `Solo hay ${availableTickets} entrada(s) disponible(s)`,
                available: availableTickets,
                requested: qty
            });
        }
        soldCommitted = true;
        committedEventId = event._id;
        committedQty = qty;

        // Create a Payment record for tracking (price = 0 for free events)
        const payment = new Payment({
            user: userId,
            event: eventId,
            amount: 0,
            status: 'free_approved',
            ticketType: 'general',
            quantity: qty,
            mp_preference_id: 'FREE_PREF_' + userId + '_' + eventId + '_' + Date.now(),
            mp_payment_id: 'FREE_PAY_' + userId + '_' + eventId + '_' + Date.now(),
            external_reference: 'FREE_' + userId + '_' + eventId + '_' + Date.now(),
            mp_init_point: null,
            createdAt: new Date()
        });
        await payment.save();

        // Create tickets directly
        const ticketsToCreate = Array(qty).fill(null).map(() => ({
            user: userId,
            event: eventId,
            payment: payment._id,
            status: 'approved',
            amount: 0,
            purchasedAt: new Date()
        }));

        const createdTickets = await Ticket.insertMany(ticketsToCreate);

        // Generate QR codes for each created ticket
        const qrPromises = createdTickets.map(async (ticket) => {
            try {
                const qrData = JSON.stringify({
                    ticketId: ticket._id.toString(),
                    eventId: ticket.event.toString(),
                    userId: ticket.user.toString(),
                    timestamp: ticket.purchasedAt.getTime()
                });
                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: 300,
                    margin: 2
                });
                ticket.entryQr = qrCodeDataURL;
                await ticket.save();
                console.log(`✅ QR generado para entrada: ${ticket._id}`);
            } catch (qrError) {
                console.error(`❌ Error generando QR para entrada ${ticket._id}:`, qrError.message);
            }
        });
        await Promise.all(qrPromises);

        // Enviar email de confirmación
        try {
            await emailService.sendFreeTicketConfirmation(user, event, qty, createdTickets);
            console.log(`📧 Email de confirmación enviado a ${user.correo}`);
        } catch (emailError) {
            console.error('❌ Error enviando email de confirmación:', emailError.message);
            // No detener el flujo si falla el email
        }

        res.json({
            status: 1,
            msg: `Entradas gratuitas solicitadas con éxito. Total: ${qty}`,
            payment: {
                id: payment._id,
                status: 'free_approved',
                quantity: qty,
                amount: 0
            },
            tickets: createdTickets.map(t => ({
                id: t._id,
                status: t.status,
                ticketType: t.ticketType
            }))
        });

    } catch (error) {
        console.error('Error en requestFreeTickets:', error);
        if (soldCommitted && committedEventId && committedQty > 0) {
            try {
                await rollbackSoldTickets(committedEventId, committedQty);
            } catch (rollbackError) {
                console.error('Error haciendo rollback de ticketsSold en requestFreeTickets:', rollbackError.message);
            }
        }
        res.status(500).json({
            status: 0,
            msg: 'Error al solicitar entradas gratuitas',
            error: error.message
        });
    }
};

module.exports = {
    createPreference,
    receiveWebhook,
    getMyPayments,
    requestFreeTickets
};

