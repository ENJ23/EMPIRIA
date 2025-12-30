// src/routes/promotion.routes.js
const { Router } = require('express');
const Promotion = require('../models/Promotion');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');

const router = Router();

/**
 * CREAR PROMOCIÓN (Solo Admin)
 * POST /api/promotions
 */
router.post('/', validarJWT, requireAdmin, async (req, res) => {
    try {
        const {
            titulo,
            descripcion,
            asunto,
            descuento,
            codigo,
            tipo,
            evento,
            fechaFin,
            usuariosDestino
        } = req.body;

        // Validar datos requeridos
        if (!titulo || !descripcion || !descuento || !codigo || !tipo || !fechaFin) {
            return res.status(400).json({
                status: 0,
                msg: 'Faltan campos requeridos: titulo, descripcion, descuento, codigo, tipo, fechaFin'
            });
        }

        // Validar que el código sea único
        const existingCode = await Promotion.findOne({ codigo: codigo.toUpperCase() });
        if (existingCode) {
            return res.status(400).json({
                status: 0,
                msg: 'El código de promoción ya existe'
            });
        }

        const promotion = new Promotion({
            titulo,
            descripcion,
            asunto: asunto || null,
            descuento,
            codigo: codigo.toUpperCase(),
            tipo,
            evento: evento || null,
            fechaInicio: new Date(),
            fechaFin: new Date(fechaFin),
            usuariosDestino: usuariosDestino || 'todos',
            enviados: false,
            activo: true
        });

        await promotion.save();

        res.status(201).json({
            status: 1,
            msg: 'Promoción creada exitosamente',
            promotion
        });
    } catch (error) {
        console.error('Error creating promotion:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error al crear la promoción',
            error: error.message
        });
    }
});

/**
 * OBTENER TODAS LAS PROMOCIONES (Solo Admin)
 * GET /api/promotions
 */
router.get('/', validarJWT, requireAdmin, async (req, res) => {
    try {
        const { activas, enviadas, page = 1, limit = 10 } = req.query;

        let filter = {};
        
        if (activas === 'true') {
            filter.activo = true;
        }
        
        if (enviadas === 'true') {
            filter.enviados = true;
        }

        const skip = (page - 1) * limit;

        const promotions = await Promotion.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Promotion.countDocuments(filter);

        res.json({
            status: 1,
            promotions,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            }
        });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error al obtener promociones'
        });
    }
});

/**
 * OBTENER PROMOCIÓN POR ID (Solo Admin)
 * GET /api/promotions/:id
 */
router.get('/:id', validarJWT, requireAdmin, async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id).populate('evento');

        if (!promotion) {
            return res.status(404).json({
                status: 0,
                msg: 'Promoción no encontrada'
            });
        }

        res.json({
            status: 1,
            promotion
        });
    } catch (error) {
        console.error('Error fetching promotion:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error al obtener la promoción'
        });
    }
});

/**
 * ACTUALIZAR PROMOCIÓN (Solo Admin)
 * PUT /api/promotions/:id
 */
router.put('/:id', validarJWT, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // No permitir cambiar el código de promoción
        if (updates.codigo) {
            delete updates.codigo;
        }

        const promotion = await Promotion.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!promotion) {
            return res.status(404).json({
                status: 0,
                msg: 'Promoción no encontrada'
            });
        }

        res.json({
            status: 1,
            msg: 'Promoción actualizada',
            promotion
        });
    } catch (error) {
        console.error('Error updating promotion:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error al actualizar la promoción'
        });
    }
});

/**
 * DESACTIVAR PROMOCIÓN (Solo Admin)
 * DELETE /api/promotions/:id
 */
router.delete('/:id', validarJWT, requireAdmin, async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!promotion) {
            return res.status(404).json({
                status: 0,
                msg: 'Promoción no encontrada'
            });
        }

        res.json({
            status: 1,
            msg: 'Promoción desactivada',
            promotion
        });
    } catch (error) {
        console.error('Error deleting promotion:', error);
        res.status(500).json({
            status: 0,
            msg: 'Error al desactivar la promoción'
        });
    }
});

module.exports = router;
