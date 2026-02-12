const mongoose = require('mongoose');
const Review = require('../models/Review');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');

const getEventReviews = async (req, res) => {
    const { id } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const skip = (page - 1) * limit;
    try {
        const [reviews, total] = await Promise.all([
            Review.find({ event: id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'nombre apellido'),
            Review.countDocuments({ event: id })
        ]);

        const ratingStats = await Review.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$event',
                    average: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const summary = ratingStats.length
            ? {
                average: Number(ratingStats[0].average.toFixed(2)),
                count: ratingStats[0].count
            }
            : { average: 0, count: 0 };

        res.json({
            status: 1,
            msg: 'Reseñas obtenidas con éxito',
            summary,
            reviews,
            pagination: {
                page,
                limit,
                total,
                hasMore: page * limit < total
            }
        });
    } catch (error) {
        console.error('Error getting reviews:', error);
        res.status(500).json({ status: 0, msg: 'Error al obtener reseñas' });
    }
};

const createReview = async (req, res) => {
    const { id } = req.params;
    const userId = req.uid;
    const { rating, comment } = req.body;

    try {
        if (!rating || rating < 1 || rating > 5 || !comment) {
            return res.status(400).json({
                status: 0,
                msg: 'Calificación y comentario son requeridos (1-5).'
            });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }

        const hasTicket = await Ticket.exists({
            user: userId,
            event: id,
            status: 'approved'
        });

        if (!hasTicket) {
            return res.status(403).json({
                status: 0,
                msg: 'Solo asistentes con entrada pueden dejar reseñas.'
            });
        }

        const existing = await Review.findOne({ user: userId, event: id });
        if (existing) {
            return res.status(400).json({
                status: 0,
                msg: 'Ya dejaste una reseña para este evento.'
            });
        }

        const review = await Review.create({
            user: userId,
            event: id,
            rating: Number(rating),
            comment: String(comment).trim()
        });

        const stats = await Review.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$event',
                    average: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (stats.length) {
            await Event.findByIdAndUpdate(id, {
                ratingAverage: Number(stats[0].average.toFixed(2)),
                ratingCount: stats[0].count
            });
        }

        const populated = await Review.findById(review._id).populate('user', 'nombre apellido');

        res.status(201).json({
            status: 1,
            msg: 'Reseña creada',
            review: populated,
            summary: stats.length
                ? {
                    average: Number(stats[0].average.toFixed(2)),
                    count: stats[0].count
                }
                : { average: 0, count: 0 }
        });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ status: 0, msg: 'Error al crear reseña' });
    }
};

const updateReview = async (req, res) => {
    const { id, reviewId } = req.params;
    const userId = req.uid;
    const { rating, comment } = req.body;

    try {
        if (!rating || rating < 1 || rating > 5 || !comment) {
            return res.status(400).json({
                status: 0,
                msg: 'Calificación y comentario son requeridos (1-5).'
            });
        }

        const review = await Review.findById(reviewId);
        if (!review || review.event.toString() !== id) {
            return res.status(404).json({ status: 0, msg: 'Reseña no encontrada' });
        }

        if (review.user.toString() !== userId) {
            return res.status(403).json({ status: 0, msg: 'No puedes editar esta reseña.' });
        }

        review.rating = Number(rating);
        review.comment = String(comment).trim();
        await review.save();

        const stats = await Review.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$event',
                    average: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (stats.length) {
            await Event.findByIdAndUpdate(id, {
                ratingAverage: Number(stats[0].average.toFixed(2)),
                ratingCount: stats[0].count
            });
        }

        const populated = await Review.findById(review._id).populate('user', 'nombre apellido');

        res.json({
            status: 1,
            msg: 'Reseña actualizada',
            review: populated,
            summary: stats.length
                ? {
                    average: Number(stats[0].average.toFixed(2)),
                    count: stats[0].count
                }
                : { average: 0, count: 0 }
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ status: 0, msg: 'Error al actualizar reseña' });
    }
};

const deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;
    const userId = req.uid;

    try {
        const review = await Review.findById(reviewId);
        if (!review || review.event.toString() !== id) {
            return res.status(404).json({ status: 0, msg: 'Reseña no encontrada' });
        }

        if (review.user.toString() !== userId) {
            return res.status(403).json({ status: 0, msg: 'No puedes eliminar esta reseña.' });
        }

        await Review.findByIdAndDelete(reviewId);

        const stats = await Review.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: '$event',
                    average: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const summary = stats.length
            ? {
                average: Number(stats[0].average.toFixed(2)),
                count: stats[0].count
            }
            : { average: 0, count: 0 };

        await Event.findByIdAndUpdate(id, {
            ratingAverage: summary.average,
            ratingCount: summary.count
        });

        res.json({
            status: 1,
            msg: 'Reseña eliminada',
            summary
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ status: 0, msg: 'Error al eliminar reseña' });
    }
};

module.exports = {
    getEventReviews,
    createReview,
    updateReview,
    deleteReview
};
