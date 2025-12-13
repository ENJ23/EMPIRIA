const { MercadoPagoConfig, Preference, Payment: MPPayment } = require('mercadopago');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Client = require('../models/Client');

// Initialize Mercado Pago
// NOTE: Set your ACCESS_TOKEN in .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const createPayment = async (req, res) => {
    try {
        const { eventID, quantity, ticketType, clientData } = req.body;

        // 1. Validate Event & Stock
        const event = await Event.findById(eventID);
        if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
        if (event.stock < quantity) return res.status(400).json({ message: 'Sin stock disponible' });

        // 2. Find or Create Client
        let clientDoc = await Client.findOne({ email: clientData.email });
        if (!clientDoc) {
            clientDoc = await new Client(clientData).save();
        }

        // 3. Create MP Preference
        const externalRef = new mongoose.Types.ObjectId().toString();
        const unitPrice = ticketType === 'vip' ? event.price * 2 : event.price; // Example VIP logic

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{
                    id: eventID,
                    title: `Entrada: ${event.title} (${ticketType})`,
                    quantity: quantity,
                    unit_price: unitPrice,
                    currency_id: 'ARS'
                }],
                payer: {
                    email: clientDoc.email,
                    name: clientDoc.name
                },
                back_urls: {
                    success: 'http://localhost:4200/success',
                    failure: 'http://localhost:4200/failure',
                    pending: 'http://localhost:4200/pending'
                },
                auto_return: 'approved',
                notification_url: process.env.WEBHOOK_URL || 'https://tu-dominio.com/api/payments/webhook',
                external_reference: externalRef
            }
        });

        // 4. Save Pending Payment
        const newPayment = new Payment({
            _id: externalRef,
            amount: unitPrice * quantity,
            status: 'pending',
            mp_preference_id: result.id,
            external_reference: externalRef,
            client: clientDoc._id,
            event: event._id,
            ticketType,
            quantity
        });
        await newPayment.save();

        res.status(201).json({
            init_point: result.init_point,
            paymentId: newPayment._id
        });

    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'Error interno al crear el pago' });
    }
};

const handleWebhook = async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment') {
            const paymentId = data.id;
            // Consult payment status from MP
            const mpPayment = new MPPayment(client);
            const paymentInfo = await mpPayment.get({ id: paymentId });

            // Find local payment by external_reference
            const localPayment = await Payment.findById(paymentInfo.external_reference)
                .populate('event')
                .populate('client');

            if (localPayment) {
                if (paymentInfo.status === 'approved' && localPayment.status !== 'approved') {
                    // Update Payment
                    localPayment.status = 'approved';
                    localPayment.mp_payment_id = paymentId;
                    await localPayment.save();

                    // Decrement Stock
                    const event = await Event.findById(localPayment.event._id);
                    event.stock -= localPayment.quantity;
                    await event.save();

                    // Generate Tickets
                    const tickets = [];
                    for (let i = 0; i < localPayment.quantity; i++) {
                        tickets.push({
                            qrCode: `${localPayment._id}-${i}-${Date.now()}`, // Simple unique string for now
                            event: localPayment.event._id,
                            client: localPayment.client._id,
                            payment: localPayment._id,
                            status: 'valid'
                        });
                    }
                    await Ticket.insertMany(tickets);
                    console.log(`✅ ${localPayment.quantity} tickets generated for order ${localPayment._id}`);
                } else {
                    localPayment.status = paymentInfo.status;
                    await localPayment.save();
                }
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    }
};

module.exports = { createPayment, handleWebhook };
