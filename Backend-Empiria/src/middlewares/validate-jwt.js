const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
    // x-token headers
    const token = req.header('x-token');

    // Debug headers to see why token might be missing
    if (!token) {
        console.log('⚠️ Missing Token. Headers received:', JSON.stringify(req.headers, null, 2));
    }

    if (!token) {
        console.log('validarJWT: No token received in headers');
        return res.status(401).json({
            status: 0,
            msg: 'No hay token en la petición'
        });
    }

    try {
        const payload = jwt.verify(
            token,
            process.env.SECRET_JWT_SEED || 'Est0EsUnaS3m1llA-S3cr3t4'
        );

        req.uid = payload.uid;
        req.name = payload.name;
        // console.log('validarJWT: Token valid for user', req.uid);

    } catch (error) {
        console.error('validarJWT: Token verification failed:', error.message);
        return res.status(401).json({
            status: 0,
            msg: 'Token no válido'
        });
    }

    next();
};

module.exports = {
    validarJWT
};
