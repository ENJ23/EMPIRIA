const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('./src/models/Payment');
const Ticket = require('./src/models/Ticket');

const testTickets = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://elias:elias123@cluster0.p7bd8.mongodb.net/empiriadb');
        console.log('✅ Connected to MongoDB');

        // Get the last 5 payments
        console.log('\n--- ÚLTIMOS 5 PAYMENTS ---');
        const payments = await Payment.find().sort({ createdAt: -1 }).limit(5);
        payments.forEach(p => {
            console.log(`Payment: ${p._id.toString().slice(0, 8)}... | Status: ${p.status} | MP ID: ${p.mp_payment_id}`);
        });

        // Get the last 5 tickets
        console.log('\n--- ÚLTIMOS 5 TICKETS ---');
        const tickets = await Ticket.find().sort({ purchasedAt: -1 }).limit(5);
        tickets.forEach(t => {
            console.log(`Ticket: ${t._id.toString().slice(0, 8)}... | Payment: ${t.payment?.toString().slice(0, 8) || 'NULL'}... | Status: ${t.status}`);
        });

        // Test specific Payment ID from URL
        const testPaymentId = '69487653d9d832f83bc0d58e';
        console.log(`\n--- VERIFICANDO PAYMENT ESPECÍFICO: ${testPaymentId} ---`);
        const payment = await Payment.findById(testPaymentId);
        if (payment) {
            console.log(`✅ Payment encontrado:`);
            console.log(`   ID: ${payment._id}`);
            console.log(`   Status: ${payment.status}`);
            console.log(`   MP Payment ID: ${payment.mp_payment_id}`);
            console.log(`   User: ${payment.user}`);
            console.log(`   Event: ${payment.event}`);
            
            // Find ticket for this payment
            const ticket = await Ticket.findOne({ payment: payment._id });
            if (ticket) {
                console.log(`✅ Ticket encontrado para este payment:`);
                console.log(`   ID: ${ticket._id}`);
                console.log(`   Status: ${ticket.status}`);
            } else {
                console.log(`❌ NO hay ticket para este payment`);
            }
        } else {
            console.log(`❌ Payment NO encontrado`);
        }

        mongoose.connection.close();
        console.log('\n✅ Test completado');
    } catch (e) {
        console.error('❌ Error:', e.message);
        mongoose.connection.close();
    }
}
testTickets();
