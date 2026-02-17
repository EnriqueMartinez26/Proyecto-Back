require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Función simple para random
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);

const generateTraffic = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado.');

        // 1. Obtener Productos Reales
        const products = await Product.find({ activo: true });
        if (products.length === 0) {
            console.error('❌ No hay productos. Corré primero un seed de productos.');
            process.exit(1);
        }
        console.log(`📦 Se encontraron ${products.length} productos para comprar.`);

        // 2. Crear Usuarios Bots
        const bots = [];
        console.log('🤖 Creando 15 usuarios bots...');
        for (let i = 0; i < 15; i++) {
            const name = `Bot_${randomInt(1000, 9999)}`;
            const email = `bot_${Date.now()}_${i}@test.com`;
            try {
                let user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({
                        name,
                        email,
                        password: 'password123',
                        role: 'user',
                        isVerified: true
                    });
                }
                bots.push(user);
            } catch (e) {
                console.warn(`⚠️ Error al procesar usuario ${email}:`, e.message);
            }
        }

        if (bots.length === 0) {
            console.error('❌ No se pudieron crear bots. Abortando.');
            process.exit(1);
        }
        console.log(`✅ ${bots.length} bots listos para gastar dinero.`);

        // 3. Generar Órdenes Históricas (Últimos 60 días)
        console.log('💸 Generando historial de transacciones...');
        const ordersToCreate = 60;

        for (let i = 0; i < ordersToCreate; i++) {
            const bot = randomElem(bots);
            if (!bot) continue;

            const numItems = randomInt(1, 4);
            const orderItems = [];
            let itemsPrice = 0;

            for (let j = 0; j < numItems; j++) {
                const prod = randomElem(products);
                const qty = randomInt(1, 2);

                const priceBase = Number(prod.price) || 0;
                const discount = Number(prod.descuentoPorcentaje) || 0;

                // Calculamos precio unitario con descuento
                let unitPrice = priceBase * ((100 - discount) / 100);
                unitPrice = Number(unitPrice.toFixed(2));

                // Imagen default si no existe
                const img = prod.imageId || 'https://via.placeholder.com/150';

                orderItems.push({
                    name: prod.name,
                    quantity: qty,
                    image: img,
                    price: unitPrice,
                    product: prod._id
                });

                itemsPrice += unitPrice * qty;

                // Bajar Stock (Simulación básica)
                // Ignoramos errores de update para velocidad
                Product.updateOne({ _id: prod._id }, { $inc: { stock: -qty } }).catch(() => { });
            }

            itemsPrice = Number(itemsPrice.toFixed(2));
            const shippingPrice = Number(parseFloat(randomFloat(5, 20)).toFixed(2));
            const totalPrice = Number((itemsPrice + shippingPrice).toFixed(2));

            // Generar fecha aleatoria en los últimos 60 días
            const daysAgo = randomInt(0, 60);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            // Crear la orden con Schema Strict: false para evitar errores triviales? No, respetemos el schema
            try {
                await Order.create({
                    user: bot._id,
                    orderItems,
                    shippingAddress: {
                        fullName: bot.name,
                        street: "Calle Falsa 123",
                        city: "Springfield",
                        zip: "12345",
                        country: "Argentina"
                    },
                    paymentMethod: "MercadoPago",
                    paymentResult: {
                        id: `PAY-${randomInt(100000, 999999)}`,
                        status: "approved",
                        payment_type: "credit_card",
                        email: bot.email
                    },
                    itemsPrice,
                    shippingPrice,
                    totalPrice,
                    orderStatus: 'delivered',
                    isPaid: true,
                    paidAt: date,
                    isDelivered: true,
                    deliveredAt: new Date(date.getTime() + 86400000),
                    createdAt: date
                });
                process.stdout.write('.');
            } catch (err) {
                console.error(`\n❌ Error creando orden para ${bot.email}:`, err.message);
                if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
            }
        }

        console.log('\n\n✅ Simulación completada.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
};

generateTraffic();
