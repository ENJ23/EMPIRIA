require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');
const Event = require('./src/models/Event');
const User = require('./src/models/User');

async function testFilterTickets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get first event
        const firstEvent = await Event.findOne();
        console.log('Testing with event:', firstEvent.title, '(', firstEvent._id, ')\n');

        // Test filter
        const query = { event: firstEvent._id };
        const filtered = await Ticket.find(query)
            .populate('event', 'title')
            .populate('user', 'nombre correo');

        console.log(`📊 Tickets for "${firstEvent.title}":`, filtered.length);
        filtered.forEach((t, i) => {
            console.log(`  ${i + 1}. User: ${t.user?.nombre} - Event: ${t.event?.title}`);
        });

        // Test all tickets
        const all = await Ticket.find();
        console.log(`\n📊 Total tickets (no filter):`, all.length);

        // Group by event
        console.log('\n📊 Tickets by event:');
        const events = await Event.find();
        for (const ev of events) {
            const count = await Ticket.countDocuments({ event: ev._id });
            if (count > 0) {
                console.log(`  ${ev.title}: ${count} tickets`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

testFilterTickets();
