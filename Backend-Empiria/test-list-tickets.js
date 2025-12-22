require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket');
const Event = require('./src/models/Event');
const User = require('./src/models/User');

async function testListTickets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Count all tickets
        const total = await Ticket.countDocuments();
        console.log(`\n📊 Total tickets in DB: ${total}`);

        // Get all tickets with populated fields
        const tickets = await Ticket.find()
            .sort({ purchasedAt: -1 })
            .populate('event', 'title date location')
            .populate('user', 'nombre apellido correo')
            .limit(10);

        console.log(`\n📋 First 10 tickets:\n`);
        tickets.forEach((t, i) => {
            const userName = t.user ? `${t.user.nombre || ''} ${t.user.apellido || ''}`.trim() : 'N/A';
            const userEmail = t.user?.correo || 'N/A';
            console.log(`${i + 1}. ID: ${t._id}`);
            console.log(`   User: ${userName} (${userEmail})`);
            console.log(`   Event: ${t.event?.title || 'N/A'}`);
            console.log(`   Amount: $${t.amount}`);
            console.log(`   Status: ${t.status}`);
            console.log(`   Purchased: ${t.purchasedAt}`);
            console.log('');
        });

        // Count by status
        const approved = await Ticket.countDocuments({ status: 'approved' });
        const pending = await Ticket.countDocuments({ status: 'pending' });
        const rejected = await Ticket.countDocuments({ status: 'rejected' });

        console.log(`\n📈 By Status:`);
        console.log(`   Approved: ${approved}`);
        console.log(`   Pending: ${pending}`);
        console.log(`   Rejected: ${rejected}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

testListTickets();
