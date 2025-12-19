const MercadoPago = require('mercadopago');
const Event = require('../models/Event');

// Configure Mercado Pago
const client = new MercadoPago.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN
});

const preference = new MercadoPago.Preference(client);

const createPreference = async (req, res) => {
    try {
        const { eventId, quantity } = req.body;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        // Determine price (check if preventa is active)
        let price = event.priceRange.min;
        if (event.isPreventa && event.preventaPrice) {
            price = event.preventaPrice;
        }
        // TODO: Handle logic for price selection if multiple tiers exist
        // For now, simple logic: preventa > min price

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

        const result = await preference.create({
            body: {
                items: [
                    {
                        title: event.title,
                        quantity: Number(quantity),
                        unit_price: Number(price),
                        currency_id: 'ARS',
                        picture_url: event.imageUrl
                    }
                ],
                back_urls: {
                    success: `${frontendUrl}/success`,
                    failure: `${frontendUrl}/failure`,
                    pending: `${frontendUrl}/pending`
                },
                notification_url: process.env.WEBHOOK_URL,
                auto_return: 'approved',
                metadata: {
                    userId: req.uid, // From JWT
                    eventId: eventId
                }
            }
        });

        res.json({
            status: 1,
            msg: 'Preferencia creada',
            init_point: result.init_point, // For redirection
            id: result.id
        });

    } catch (error) {
        console.error('Error creando preferencia MP:', error);
        res.status(500).json({ status: 0, msg: 'Error al procesar el pago' });
    }
};

const Payment = new MercadoPago.Payment(client);
const Ticket = require('../models/Ticket');

/**
 * Handle Mercado Pago Webhook
 * @param {object} req 
 * @param {object} res 
 */
const receiveWebhook = async (req, res) => {
    try {
        const { type, data } = req.body;
        const topic = req.query.topic || req.query.type; // Some versions use query, others body
        const id = req.query.id || req.query['data.id'] || data?.id;

        // Validamos que sea una notificación de pago
        if (topic === 'payment' || type === 'payment') {
            if (!id) return res.sendStatus(200);

            // Consultamos el estado del pago a Mercado Pago
            const payment = await Payment.get({ id });

            if (payment.status === 'approved') {
                const { userId, eventId } = payment.metadata;

                // Verificar si ya existe el ticket para evitar duplicados
                const ticketExists = await Ticket.findOne({ paymentId: id });
                if (ticketExists) return res.sendStatus(200);

                // Crear el Ticket
                const ticket = new Ticket({
                    user: userId,
                    event: eventId,
                    paymentId: id,
                    status: payment.status,
                    amount: payment.transaction_amount
                });

                await ticket.save();
                console.log(`Ticket creado para usuario ${userId} evento ${eventId}`);
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
};

module.exports = {
    createPreference,
    receiveWebhook
};
