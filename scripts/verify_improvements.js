const mongoose = require('mongoose');
require('dotenv').config();
const AuthService = require('../services/authService');
const OrderService = require('../services/orderService');
const Order = require('../models/Order');
const User = require('../models/User');

async function verifyImprovements() {
    console.log('--- Verifying Security & Architecture Improvements ---');
    if (!process.env.MONGODB_URI) {
        console.error('❌ Missing MONGODB_URI');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Verify Auth Refactor (Generic Errors)
        console.log('\n--- 1. Auth Logic ---');
        try {
            await AuthService.register({ name: 'Test', email: 'existing@test.com', password: '123' });
        } catch (e) {
            if (e.message === 'Credenciales inválidas') {
                console.log('✅ Auth registration returns generic error (Security OK)');
            } else if (e.message.includes('email')) {
                console.log('❌ Auth registration leaked specific error:', e.message);
            } else {
                // If user doesn't exist, it might succeed, which is fine for this test script logic
                // Ideally we shouldn't create junk users.
                console.log('ℹ️ Auth result:', e.message);
            }
        }

        // 2. Verify Order Service Logic
        console.log('\n--- 2. Order Service ---');
        const order = await Order.findOne().lean();
        if (order) {
            const orders = await OrderService.getUserOrders(order.user);
            if (orders && orders.length > 0) {
                console.log(`✅ OrderService.getUserOrders returned ${orders.length} orders`);
                const first = orders[0];
                if (first.orderItems && first.orderItems[0].image && first.orderItems[0].image.startsWith('http')) {
                    console.log('✅ Order items have images (Constants applied)');
                }
            } else {
                console.log('⚠️ No orders returned for user.');
            }
        } else {
            console.log('⚠️ No orders in DB to test.');
        }

        // 3. Verify Index (via Mongoose API)
        console.log('\n--- 3. Database Indexes ---');
        const indexes = await Order.collection.getIndexes();
        if (indexes['user_1_createdAt_-1']) {
            console.log('✅ Order Index { user: 1, createdAt: -1 } exists');
        } else {
            console.log('❌ Order Index MISSING');
            console.log('Current Indexes:', Object.keys(indexes));
        }


    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n--- Verification Complete ---');
    }
}

verifyImprovements();
