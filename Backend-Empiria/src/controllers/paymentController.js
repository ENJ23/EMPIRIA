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
                    success: 'http://localhost:4200/success',
                    failure: 'http://localhost:4200/failure',
                    pending: 'http://localhost:4200/pending'
                },
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

module.exports = {
    createPreference
};
