const MercadoPago = require('mercadopago');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

// Configure Mercado Pago
const client = new MercadoPago.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN
});

const preference = new MercadoPago.Preference(client);
const mpPayment = new MercadoPago.Payment(client);

/**
 * Create a Mercado Pago Preference
 * This initializes a payment and saves it to the Payment table
 */
const createPreference = async (req, res) => {
    try {
        const { eventId, quantity, ticketType = 'general' } = req.body;
        const userId = req.uid;

        // Validaciones
        if (!eventId || !quantity || quantity < 1) {
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

        // Verificar que el usuario exista
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
        }

        // Determine price based on ticket type
        let price = event.priceRange.min;
        if (ticketType === 'vip' && event.priceRange.max) {
            price = event.priceRange.max;
        } else if (event.isPreventa && event.preventaPrice) {
            price = event.preventaPrice;
        }

        const totalAmount = price * quantity;

        console.log(`[createPreference] User: ${userId}, Event: ${eventId}, Quantity: ${quantity}, TicketType: ${ticketType}, Price: ${price}, Total: ${totalAmount}`);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

        // Create external reference that will be returned in webhook
        const externalData = { u: userId, e: eventId };
        const externalReference = JSON.stringify(externalData);

        // Create preference in Mercado Pago
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: `${event.title} - ${ticketType}`,
                        quantity: Number(quantity),
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
                notification_url: process.env.WEBHOOK_URL || '',
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
            quantity: Number(quantity),
            ticketType: ticketType,
            mp_preference_id: result.id,
            external_reference: externalReference,
            status: 'pending',
            transaction_amount: totalAmount
        });

        const savedPayment = await payment.save();
        console.log(`[createPreference] Payment record saved: ${savedPayment._id}`);

        res.json({
            status: 1,
            msg: 'Preferencia creada',
            init_point: result.init_point,
            preference_id: result.id,
            payment_id: savedPayment._id
        });

    } catch (error) {
        console.error('[createPreference] Error:', error.message);
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
        
        if (!paymentRecord) {
            console.log(`[webhook] Payment not found by mp_payment_id, searching by user and event...`);
            // Try to find by preference_id if not found by payment_id
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

        // If payment is approved, create a Ticket
        if (mpPaymentData.status === 'approved') {
            // Check if ticket already exists for this payment
            const ticketExists = await Ticket.findOne({ payment: paymentRecord._id });
            
            if (ticketExists) {
                console.log(`[webhook] Ticket already exists for this payment: ${ticketExists._id}`);
                return res.sendStatus(200);
            }

            // Create new Ticket
            const ticket = new Ticket({
                user: userId,
                event: eventId,
                payment: paymentRecord._id,
                paymentId: paymentId, // legacy field
                status: 'approved',
                amount: mpPaymentData.transaction_amount || paymentRecord.amount,
                purchasedAt: new Date()
            });

            try {
                await ticket.save();
                console.log(`[webhook] ✅ Ticket created: ${ticket._id} for User: ${userId}, Event: ${eventId}`);
            } catch (e) {
                if (e && e.code === 11000) {
                    console.warn('[webhook] Duplicate ticket creation attempted, ignoring.');
                } else {
                    throw e;
                }
            }
        } else {
            console.log(`[webhook] Payment status is '${mpPaymentData.status}', not creating ticket`);
        }

        // Always return 200 to acknowledge webhook receipt
        res.sendStatus(200);

    } catch (error) {
        console.error('[webhook] Unexpected error:', error.message, error.stack);
        res.sendStatus(500);
    }
};

module.exports = {
    createPreference,
    receiveWebhook
};
