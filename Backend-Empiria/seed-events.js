const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./src/models/Event');

const events = [
    {
        title: 'Neon Nights Festival',
        description: 'Una experiencia sensorial única con música electrónica y arte visual en vivo.',
        date: new Date('2025-11-20T22:00:00'),
        location: 'Ciudad Cultural, San Salvador de Jujuy',
        imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
        priceRange: { min: 2000, max: 5000 },
        capacity: 500,
        ticketsSold: 120,
        isPreventa: true,
        preventaPrice: 1500,
        preventaLimit: 100,
        categories: ['Música', 'Arte']
    },
    {
        title: 'Jazz Under the Stars',
        description: 'Noche de jazz elegante con los mejores saxofonistas de la región.',
        date: new Date('2025-12-05T20:00:00'),
        location: 'Teatro Mitre, San Salvador de Jujuy',
        imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
        priceRange: { min: 3000, max: 8000 },
        capacity: 300,
        ticketsSold: 50,
        isPreventa: false,
        categories: ['Música', 'Concierto']
    },
    {
        title: 'Gastronomía Andina',
        description: 'Feria gastronómica celebrando los sabores ancestrales de Jujuy.',
        date: new Date('2025-12-15T12:00:00'),
        location: 'Plaza Belgrano',
        imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
        priceRange: { min: 0, max: 0 },
        capacity: 1000,
        ticketsSold: 0,
        isPreventa: false,
        categories: ['Gastronomía', 'Feria']
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://elias:elias123@cluster0.p7bd8.mongodb.net/empiriadb');
        console.log('✅ Connected to MongoDB');

        await Event.deleteMany({});
        console.log('🗑️  Cleared existing events');

        await Event.insertMany(events);
        console.log('🌱 Seeded 3 events successfully');

        mongoose.connection.close();
        console.log('👋 Connection closed');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
