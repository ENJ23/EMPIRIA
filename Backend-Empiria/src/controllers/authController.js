const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generarJWT } = require('../helpers/jwt');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '694732029000-ff12fftijqn22d7kiuaicdqs9dvkh98b.apps.googleusercontent.com');

const loginManual = async (req, res) => {
    const { correo, contraseña } = req.body;

    try {
        const usuario = await User.findOne({ correo });

        if (!usuario) {
            return res.status(401).json({ status: 0, msg: "Usuario no encontrado" });
        }

        if (usuario.proveedor !== 'manual') {
            return res.status(401).json({ status: 0, msg: "Por favor, inicie sesión con Google" });
        }

        const validPass = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!validPass) {
            return res.status(401).json({ status: 0, msg: "Contraseña incorrecta" });
        }

        // Generate JWT
        const token = await generarJWT(usuario._id, usuario.nombre);

        res.json({
            status: 1,
            msg: "Login exitoso",
            user: {
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                tipo: usuario.tipo,
                userid: usuario._id
            },
            token
        });
    } catch (error) {
        console.error('Error login manual:', error);
        res.status(500).json({ status: 0, msg: "Error interno del servidor" });
    }
};

const loginGoogle = async (req, res) => {
    const { credential } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID || "694732029000-ff12fftijqn22d7kiuaicdqs9dvkh98b.apps.googleusercontent.com"
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const nombre = payload.given_name;
        const apellido = payload.family_name || "";

        let usuario = await User.findOne({ correo: email });

        if (!usuario) {
            // Create new user if not exists
            usuario = new User({
                nombre,
                apellido,
                correo: email,
                contraseña: '-', // Dummy password for google users
                proveedor: 'google',
                tipo: 'Cliente' // Default role
            });
            await usuario.save();
        }

        // Generate JWT
        const token = await generarJWT(usuario._id, usuario.nombre);

        res.json({
            status: 1,
            msg: 'Login con Google exitoso',
            user: {
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                tipo: usuario.tipo,
                userid: usuario._id
            },
            token
        });

    } catch (error) {
        console.error('Error Google Login:', error);
        res.status(401).json({
            status: 0,
            msg: 'Token inválido de Google'
        });
    }
};

// Register new user manually
const register = async (req, res) => {
    const { nombre, apellido, correo, contraseña } = req.body;

    try {
        let usuario = await User.findOne({ correo });

        if (usuario) {
            return res.status(400).json({ status: 0, msg: "El correo ya está registrado" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(contraseña, salt);

        usuario = new User({
            nombre,
            apellido,
            correo,
            contraseña: passwordHash,
            proveedor: 'manual',
            tipo: 'Cliente'
        });

        await usuario.save();

        // Generate JWT
        const token = await generarJWT(usuario._id, usuario.nombre);

        res.status(201).json({
            status: 1,
            msg: "Registro exitoso",
            user: {
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                tipo: usuario.tipo,
                userid: usuario._id
            },
            token
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ status: 0, msg: "Error interno del servidor" });
    }
};

// Seed route to create an initial admin manually (for testing)
const registerAdmin = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;
        const exists = await User.findOne({ correo });
        if (exists) return res.status(400).json({ msg: 'Usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contraseña, salt);

        const admin = new User({
            nombre: 'Admin',
            correo,
            contraseña: hash,
            proveedor: 'manual',
            tipo: 'Admin'
        });
        await admin.save();
        res.json({ msg: 'Admin creado' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { loginManual, loginGoogle, registerAdmin, register };
