const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
    // x-token headers
    const token = req.header('x-token');

    if (!token) {
        return res.status(401).json({
            status: 0,
            msg: 'No hay token en la petición'
        });
    }

    try {
        const { uid, name } = jwt.verify(
            token,
            process.env.SECRET_JWT_SEED || 'Est0EsUnaS3m1llA-S3cr3t4'
        );

        req.uid = uid;
        req.name = name;

    } catch (error) {
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
