require('dotenv').config();
const mongoose = require('mongoose');
const prisma = require('./lib/prisma');

// ── Modelos Mongoose ──────────────────────────────────────────────────────────
const UserMongo = require('./models/User');
const PlatformMongo = require('./models/Platform');
const GenreMongo = require('./models/Genre');
const ProductMongo = require('./models/Product');
const OrderMongo = require('./models/Order');
const CartMongo = require('./models/Cart');
const WishlistMongo = require('./models/Wishlist');
const ReviewMongo = require('./models/Review');
const DigitalKeyMongo = require('./models/DigitalKey');
const CouponMongo = require('./models/Coupon');

// Mapa de IDs viejos (ObjectId Mongo) → nuevos (UUID Supabase)
const idMap = { users: {}, platforms: {}, genres: {}, products: {}, orders: {} };

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const warn = (msg) => console.warn(`  ⚠️  ${msg}`);

async function migrate() {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅', 'Conectado a MongoDB');

    // ── 1. Platforms ──────────────────────────────────────────────────────────
    log('📦', 'Migrando Plataformas...');
    const platforms = await PlatformMongo.find({}).lean();
    for (const p of platforms) {
        const created = await prisma.platform.create({
            data: {
                slug: p.id,
                nombre: p.nombre,
                activo: p.activo ?? true,
                imageId: p.imageId || null,
                createdAt: p.createdAt || new Date(),
            }
        });
        idMap.platforms[p.id] = created.id;            // slug → UUID
        idMap.platforms[p._id.toString()] = created.id; // ObjectId → UUID
    }
    log('✓', `${platforms.length} plataformas migradas`);

    // ── 2. Genres ─────────────────────────────────────────────────────────────
    log('📦', 'Migrando Géneros...');
    const genres = await GenreMongo.find({}).lean();
    for (const g of genres) {
        const created = await prisma.genre.create({
            data: {
                slug: g.id,
                nombre: g.nombre,
                activo: g.activo ?? true,
                imageId: g.imageId || null,
                createdAt: g.createdAt || new Date(),
            }
        });
        idMap.genres[g.id] = created.id;
        idMap.genres[g._id.toString()] = created.id;
    }
    log('✓', `${genres.length} géneros migrados`);

    // ── 3. Users ──────────────────────────────────────────────────────────────
    log('👤', 'Migrando Usuarios...');
    const users = await UserMongo.find({}).select('+password').lean();
    for (const u of users) {
        const created = await prisma.user.create({
            data: {
                name: u.name,
                email: u.email,
                password: u.password,
                avatar: u.avatar || null,
                phone: u.phone || null,
                address: u.address || null,
                role: u.role === 'admin' ? 'admin' : 'user',
                isVerified: u.isVerified ?? false,
                verificationToken: u.verificationToken || null,
                verificationTokenExp: u.verificationTokenExpire || null,
                resetPasswordToken: u.resetPasswordToken || null,
                resetPasswordExp: u.resetPasswordExpire || null,
                createdAt: u.createdAt || new Date(),
            }
        });
        idMap.users[u._id.toString()] = created.id;
    }
    log('✓', `${users.length} usuarios migrados`);

    // ── 4. Coupons ────────────────────────────────────────────────────────────
    log('🎟️', 'Migrando Cupones...');
    const coupons = await CouponMongo.find({}).lean();
    for (const c of coupons) {
        await prisma.coupon.create({
            data: {
                code: c.code,
                discountType: c.discountType === 'fixed' ? 'fixed' : 'percentage',
                value: c.value,
                minPurchase: c.minPurchase ?? 0,
                usageLimit: c.usageLimit || null,
                usedCount: c.usedCount ?? 0,
                isActive: c.isActive ?? true,
                expiryDate: c.expiryDate || null,
                createdAt: c.createdAt || new Date(),
            }
        });
    }
    log('✓', `${coupons.length} cupones migrados`);

    // ── 5. Products ───────────────────────────────────────────────────────────
    log('🎮', 'Migrando Productos...');
    const products = await ProductMongo.find({}).lean();
    let skippedProducts = 0;
    for (const p of products) {
        const platformId = idMap.platforms[p.plataformaId];
        const genreId = idMap.genres[p.generoId];

        if (!platformId) { warn(`Producto "${p.nombre}": plataforma desconocida "${p.plataformaId}"`); skippedProducts++; continue; }
        if (!genreId) { warn(`Producto "${p.nombre}": género desconocido "${p.generoId}"`); skippedProducts++; continue; }

        // Normalizar requisitos (Mixed→3NF)
        const requirementsData = [];
        if (p.requisitos && typeof p.requisitos === 'object') {
            for (const [tipo, specs] of Object.entries(p.requisitos)) {
                if (specs && typeof specs === 'object') {
                    for (const [key, value] of Object.entries(specs)) {
                        if (value != null) requirementsData.push({ tipo, key, value: String(value) });
                    }
                }
            }
        }

        const created = await prisma.product.create({
            data: {
                nombre: p.nombre,
                descripcion: p.descripcion,
                precio: p.precio,
                platformId,
                genreId,
                tipo: p.tipo === 'Fisico' ? 'Fisico' : 'Digital',
                fechaLanzamiento: p.fechaLanzamiento || new Date(),
                desarrollador: p.desarrollador,
                imagenUrl: p.imagenUrl || 'https://placehold.co/600x400?text=No+Image',
                trailerUrl: p.trailerUrl || null,
                calificacion: p.calificacion ?? 0,
                stock: p.stock ?? 0,
                cantidadVendida: p.cantidadVendida ?? 0,
                activo: p.activo ?? true,
                specPreset: p.specPreset || null,
                descuentoPorcentaje: p.descuentoPorcentaje ?? 0,
                descuentoFechaFin: p.descuentoFechaFin || null,
                orden: p.orden ?? 0,
                createdAt: p.createdAt || new Date(),
                requirements: { create: requirementsData }
            }
        });
        idMap.products[p._id.toString()] = created.id;
    }
    log('✓', `${products.length - skippedProducts} productos migrados (${skippedProducts} omitidos)`);

    // ── 6. Orders ─────────────────────────────────────────────────────────────
    log('📋', 'Migrando Órdenes...');
    const orders = await OrderMongo.find({}).lean();
    let skippedOrders = 0;
    for (const o of orders) {
        const userId = idMap.users[o.user?.toString()];
        if (!userId) { skippedOrders++; continue; }

        const orderItemsData = [];
        for (const item of o.orderItems || []) {
            const productId = idMap.products[item.product?.toString()];
            if (productId) {
                orderItemsData.push({
                    productId,
                    name: item.name || '',
                    quantity: item.quantity,
                    price: item.price,
                    image: item.image || null,
                });
            }
        }

        const created = await prisma.order.create({
            data: {
                userId,
                paymentMethod: o.paymentMethod || 'mercadopago',
                mpPaymentId: o.paymentResult?.id || null,
                mpStatus: o.paymentResult?.status || null,
                mpPaymentType: o.paymentResult?.payment_type || null,
                mpEmail: o.paymentResult?.email || null,
                externalId: o.externalId || null,
                itemsPrice: o.itemsPrice ?? 0,
                shippingPrice: o.shippingPrice ?? 0,
                totalPrice: o.totalPrice ?? 0,
                orderStatus: o.orderStatus || 'pending',
                isPaid: o.isPaid ?? false,
                paidAt: o.paidAt || null,
                isDelivered: o.isDelivered ?? false,
                deliveredAt: o.deliveredAt || null,
                createdAt: o.createdAt || new Date(),
                shippingAddress: o.shippingAddress ? {
                    create: {
                        fullName: o.shippingAddress.fullName || '',
                        street: o.shippingAddress.street || '',
                        city: o.shippingAddress.city || '',
                        zip: o.shippingAddress.zip || '',
                        country: o.shippingAddress.country || '',
                    }
                } : undefined,
                orderItems: { create: orderItemsData }
            }
        });
        idMap.orders[o._id.toString()] = created.id;
    }
    log('✓', `${orders.length - skippedOrders} órdenes migradas (${skippedOrders} omitidas)`);

    // ── 7. Carts ──────────────────────────────────────────────────────────────
    log('🛒', 'Migrando Carritos...');
    const carts = await CartMongo.find({}).lean();
    let skippedCarts = 0;
    for (const c of carts) {
        const userId = idMap.users[c.user?.toString()];
        if (!userId) { skippedCarts++; continue; }

        const itemsData = [];
        for (const item of c.items || []) {
            const productId = idMap.products[item.product?.toString()];
            if (productId) itemsData.push({ productId, quantity: item.quantity || 1 });
        }
        await prisma.cart.create({ data: { userId, items: { create: itemsData } } });
    }
    log('✓', `${carts.length - skippedCarts} carritos migrados`);

    // ── 8. Wishlists ──────────────────────────────────────────────────────────
    log('💜', 'Migrando Wishlists...');
    const wishlists = await WishlistMongo.find({}).lean();
    let skippedWishlists = 0;
    for (const w of wishlists) {
        const userId = idMap.users[w.usuarioId?.toString()];
        if (!userId) { skippedWishlists++; continue; }

        const itemsData = [];
        for (const item of w.productos || []) {
            const productId = idMap.products[item.productoId?.toString()];
            if (productId) itemsData.push({ productId, fechaAgregado: item.fechaAgregado || new Date() });
        }
        await prisma.wishlist.create({ data: { userId, items: { create: itemsData } } });
    }
    log('✓', `${wishlists.length - skippedWishlists} wishlists migradas`);

    // ── 9. Reviews ────────────────────────────────────────────────────────────
    log('⭐', 'Migrando Reseñas...');
    const reviews = await ReviewMongo.find({}).lean();
    let skippedReviews = 0;
    for (const r of reviews) {
        const userId = idMap.users[r.user?.toString()];
        const productId = idMap.products[r.product?.toString()];
        if (!userId || !productId) { skippedReviews++; continue; }

        const votesData = [];
        for (const voterId of r.helpfulVoters || []) {
            const voterUserId = idMap.users[voterId?.toString()];
            if (voterUserId) votesData.push({ userId: voterUserId });
        }

        await prisma.review.create({
            data: {
                userId,
                productId,
                rating: r.rating,
                title: r.title || null,
                text: r.text,
                sentiment: r.sentiment || null,
                sentimentScore: r.sentimentScore ?? null,
                sentimentKeywords: r.sentimentKeywords || [],
                verified: r.verified ?? false,
                helpfulCount: r.helpfulCount ?? 0,
                createdAt: r.createdAt || new Date(),
                helpfulVotes: { create: votesData }
            }
        });
    }
    log('✓', `${reviews.length - skippedReviews} reseñas migradas`);

    // ── 10. Digital Keys ──────────────────────────────────────────────────────
    log('🔑', 'Migrando Claves Digitales...');
    const keys = await DigitalKeyMongo.find({}).lean();
    let skippedKeys = 0;
    for (const k of keys) {
        const productId = idMap.products[k.productoId?.toString()];
        if (!productId) { skippedKeys++; continue; }
        const orderId = k.pedidoId ? (idMap.orders[k.pedidoId.toString()] || null) : null;

        await prisma.digitalKey.create({
            data: {
                productId,
                clave: k.clave,
                estado: k.estado || 'DISPONIBLE',
                orderId: orderId || null,
                fechaVenta: k.fechaVenta || null,
                createdAt: k.createdAt || new Date(),
            }
        });
    }
    log('✓', `${keys.length - skippedKeys} claves digitales migradas`);

    console.log('\n🎉 ¡Migración completa!');
}

migrate()
    .catch(err => { console.error('\n❌ Error en migración:', err); process.exit(1); })
    .finally(async () => {
        await mongoose.disconnect();
        await prisma.$disconnect();
    });
