/**
 * Middleware de rate limiting específico para solicitudes de entradas gratuitas
 * Límite: máximo 5 solicitudes por usuario por evento en 1 hora
 */

const freeTicketRequestsStore = new Map(); // userId:eventId -> { count, resetTime }

const freeTicketRateLimiter = (req, res, next) => {
    try {
        const userId = req.uid; // Del JWT
        const { eventId } = req.body;

        if (!userId || !eventId) {
            return res.status(400).json({
                status: 0,
                msg: 'Usuario y evento requeridos'
            });
        }

        const key = `${userId}:${eventId}`;
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        // Obtener registro actual
        let record = freeTicketRequestsStore.get(key);

        // Si no existe o expiró, crear nuevo
        if (!record || now > record.resetTime) {
            record = {
                count: 0,
                resetTime: now + ONE_HOUR
            };
        }

        // Incrementar contador
        record.count++;
        freeTicketRequestsStore.set(key, record);

        // Verificar límite (máximo 5 solicitudes por hora)
        if (record.count > 5) {
            const timeRemaining = Math.ceil((record.resetTime - now) / 1000 / 60); // minutos
            return res.status(429).json({
                status: 0,
                msg: `Has excedido el límite de solicitudes. Intenta de nuevo en ${timeRemaining} minutos.`,
                retryAfter: timeRemaining
            });
        }

        // Pasar al siguiente middleware
        next();
    } catch (error) {
        console.error('Error en freeTicketRateLimiter:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error en validación de límite de solicitudes'
        });
    }
};

module.exports = freeTicketRateLimiter;
