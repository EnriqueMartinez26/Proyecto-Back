/**
 * Script de seed: Actualiza géneros a los principales globales
 * e inserta 20+ juegos populares con precios en USD (keys de segunda mano).
 * Uso: node scripts/seed-genres-products.js
 */
const mongoose = require('mongoose');
require('../models/Platform');
require('../models/Genre');
require('../models/Product');

const MONGO_URI = process.env.MONGODB_URI;

const GENRES = [
    { id: 'action', nombre: 'Action' },
    { id: 'adventure', nombre: 'Adventure' },
    { id: 'rpg', nombre: 'RPG' },
    { id: 'shooter', nombre: 'Shooter' },
    { id: 'strategy', nombre: 'Strategy' },
    { id: 'simulation', nombre: 'Simulation' },
    { id: 'sports', nombre: 'Sports' },
    { id: 'racing', nombre: 'Racing' },
    { id: 'horror', nombre: 'Horror' },
    { id: 'fighting', nombre: 'Fighting' },
    { id: 'puzzle', nombre: 'Puzzle' },
    { id: 'platformer', nombre: 'Platformer' },
    { id: 'survival', nombre: 'Survival' },
    { id: 'open-world', nombre: 'Open World' },
    { id: 'battle-royale', nombre: 'Battle Royale' },
];

const PRODUCTS = [
    {
        nombre: 'Grand Theft Auto V',
        descripcion: 'Explora Los Santos en este épico juego de mundo abierto con historia, online y caos sin límites.',
        precio: 9.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        desarrollador: 'Rockstar Games',
        stock: 50,
    },
    {
        nombre: 'Red Dead Redemption 2',
        descripcion: 'Una odisea épica por el corazón del salvaje Oeste americano. Historia, exploración y detalle sin igual.',
        precio: 11.99,
        plataformaId: 'pc',
        generoId: 'adventure',
        tipo: 'Digital',
        desarrollador: 'Rockstar Games',
        stock: 40,
    },
    {
        nombre: 'Elden Ring',
        descripcion: 'Acción RPG de FromSoftware y George R. R. Martin. Un mundo abierto oscuro lleno de desafíos legendarios.',
        precio: 29.99,
        plataformaId: 'pc',
        generoId: 'rpg',
        tipo: 'Digital',
        desarrollador: 'FromSoftware',
        stock: 45,
    },
    {
        nombre: 'Cyberpunk 2077',
        descripcion: 'Sumérgete en Night City, una megalópolis futurista obsesionada con el poder, la tecnología y las modificaciones corporales.',
        precio: 22.99,
        plataformaId: 'pc',
        generoId: 'rpg',
        tipo: 'Digital',
        desarrollador: 'CD Projekt Red',
        stock: 60,
    },
    {
        nombre: 'Hogwarts Legacy',
        descripcion: 'Vive la magia: explora Hogwarts, aprende hechizos, cría bestias y descubre una aventura épica ambientada en los 1800s.',
        precio: 14.99,
        plataformaId: 'pc',
        generoId: 'adventure',
        tipo: 'Digital',
        desarrollador: 'Avalanche Software',
        stock: 35,
    },
    {
        nombre: "Baldur's Gate 3",
        descripcion: 'RPG épico basado en Dungeons & Dragons. Libertad total, decisiones significativas y combate táctico por turnos.',
        precio: 39.99,
        plataformaId: 'pc',
        generoId: 'rpg',
        tipo: 'Digital',
        desarrollador: 'Larian Studios',
        stock: 30,
    },
    {
        nombre: 'The Witcher 3: Wild Hunt - GOTY',
        descripcion: 'La obra maestra de CD Projekt Red. Geralt de Rivia en una aventura épica con todas las expansiones incluidas.',
        precio: 9.99,
        plataformaId: 'pc',
        generoId: 'rpg',
        tipo: 'Digital',
        desarrollador: 'CD Projekt Red',
        stock: 70,
    },
    {
        nombre: 'God of War Ragnarök',
        descripcion: 'Kratos y Atreus viajan por los nueve reinos en busca de respuestas mientras las fuerzas Asgard se preparan para la guerra.',
        precio: 35.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        desarrollador: 'Santa Monica Studio',
        stock: 25,
    },
    {
        nombre: 'Resident Evil 4 Remake',
        descripcion: 'El clásico reinventado. Leon S. Kennedy se enfrenta a horrores renovados en esta obra maestra del survival horror.',
        precio: 24.99,
        plataformaId: 'pc',
        generoId: 'horror',
        tipo: 'Digital',
        desarrollador: 'Capcom',
        stock: 40,
    },
    {
        nombre: "Marvel's Spider-Man Remastered",
        descripcion: 'Balancéate por Nueva York como Spider-Man en esta aventura de acción con mundo abierto espectacular.',
        precio: 27.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        desarrollador: 'Insomniac Games',
        stock: 35,
    },
    {
        nombre: 'Minecraft: Java & Bedrock Edition',
        descripcion: 'El juego de sandbox definitivo. Construye, explora y sobrevive en mundos generados infinitamente.',
        precio: 22.99,
        plataformaId: 'pc',
        generoId: 'survival',
        tipo: 'Digital',
        desarrollador: 'Mojang Studios',
        stock: 100,
    },
    {
        nombre: 'Helldivers 2',
        descripcion: 'Cooperativa caótica: Defiende la Super Tierra contra hordas alienígenas en este shooter PvE de acción frenética.',
        precio: 29.99,
        plataformaId: 'pc',
        generoId: 'shooter',
        tipo: 'Digital',
        desarrollador: 'Arrowhead Game Studios',
        stock: 45,
    },
    {
        nombre: 'EA Sports FC 25',
        descripcion: 'La evolución del fútbol virtual. Nuevos modos, tácticas y gráficos de nueva generación.',
        precio: 19.99,
        plataformaId: 'pc',
        generoId: 'sports',
        tipo: 'Digital',
        desarrollador: 'EA Sports',
        stock: 55,
    },
    {
        nombre: 'Forza Horizon 5',
        descripcion: 'Carreras de mundo abierto en los paisajes vibrantes de México. La experiencia de conducción definitiva.',
        precio: 19.99,
        plataformaId: 'pc',
        generoId: 'racing',
        tipo: 'Digital',
        desarrollador: 'Playground Games',
        stock: 40,
    },
    {
        nombre: 'It Takes Two',
        descripcion: 'Aventura cooperativa innovadora. May y Cody deben reparar su relación en un viaje lleno de sorpresas y mecánicas únicas.',
        precio: 14.99,
        plataformaId: 'pc',
        generoId: 'adventure',
        tipo: 'Digital',
        desarrollador: 'Hazelight Studios',
        stock: 30,
    },
    {
        nombre: 'Monster Hunter: Wilds',
        descripcion: 'La nueva entrega de la saga Monster Hunter. Caza criaturas épicas en ecosistemas dinámicos e inmersivos.',
        precio: 49.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        desarrollador: 'Capcom',
        stock: 50,
    },
    {
        nombre: 'Black Myth: Wukong',
        descripcion: 'Action RPG inspirado en la mitología china. Domina habilidades sobrenaturales como el legendario Rey Mono, Sun Wukong.',
        precio: 39.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        desarrollador: 'Game Science',
        stock: 35,
    },
    {
        nombre: 'Manor Lords',
        descripcion: 'Estrategia medieval con gestión de ciudades y batallas tácticas en tiempo real. Construye tu señorío medieval.',
        precio: 24.99,
        plataformaId: 'pc',
        generoId: 'strategy',
        tipo: 'Digital',
        desarrollador: 'Slavic Magic',
        stock: 30,
    },
    {
        nombre: 'Dead Space Remake',
        descripcion: 'El survival horror clásico reconstruido desde cero. Isaac Clarke enfrenta los horrores del USG Ishimura.',
        precio: 19.99,
        plataformaId: 'pc',
        generoId: 'horror',
        tipo: 'Digital',
        desarrollador: 'Motive Studio',
        stock: 25,
    },
    {
        nombre: 'Dying Light 2: Stay Human',
        descripcion: 'Parkour y supervivencia en un mundo post-apocalíptico. Tus decisiones moldean la ciudad y sus habitantes.',
        precio: 14.99,
        plataformaId: 'pc',
        generoId: 'survival',
        tipo: 'Digital',
        desarrollador: 'Techland',
        stock: 35,
    },
    {
        nombre: 'Call of Duty: Black Ops 6',
        descripcion: 'FPS táctico de última generación con campaña cinematográfica, multijugador competitivo y modo Zombies.',
        precio: 44.99,
        plataformaId: 'pc',
        generoId: 'shooter',
        tipo: 'Digital',
        desarrollador: 'Treyarch',
        stock: 60,
    },
    {
        nombre: 'Palworld',
        descripcion: 'Captura criaturas, construye bases y sobrevive. Un mundo abierto que mezcla supervivencia con colección de monstruos.',
        precio: 19.99,
        plataformaId: 'pc',
        generoId: 'survival',
        tipo: 'Digital',
        desarrollador: 'Pocketpair',
        stock: 45,
    },
    {
        nombre: 'Mortal Kombat 1',
        descripcion: 'El universo de Mortal Kombat renace. Luchadores icónicos, nuevas mecánicas y fatalities brutales.',
        precio: 24.99,
        plataformaId: 'pc',
        generoId: 'fighting',
        tipo: 'Digital',
        desarrollador: 'NetherRealm Studios',
        stock: 30,
    },
    {
        nombre: 'Horizon Forbidden West - Complete Edition',
        descripcion: 'Aloy se adentra en el Oeste Prohibido para detener una plaga que mata todo lo que toca. Mundo abierto espectacular.',
        precio: 29.99,
        plataformaId: 'pc',
        generoId: 'adventure',
        tipo: 'Digital',
        desarrollador: 'Guerrilla Games',
        stock: 30,
    },
    {
        nombre: 'Sid Meier\'s Civilization VII',
        descripcion: 'Construye un imperio que resista el paso del tiempo. La nueva entrega del rey de la estrategia 4X.',
        precio: 44.99,
        plataformaId: 'pc',
        generoId: 'strategy',
        tipo: 'Digital',
        desarrollador: 'Firaxis Games',
        stock: 25,
    },
];

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const Genre = mongoose.model('Genre');
    const Product = mongoose.model('Product');

    // 1. Actualizar géneros
    console.log('\n📂 Actualizando géneros...');
    for (const genre of GENRES) {
        const result = await Genre.findOneAndUpdate(
            { id: genre.id },
            { id: genre.id, nombre: genre.nombre, activo: true },
            { upsert: true, new: true }
        );
        console.log(`  ✓ ${result.id} -> ${result.nombre}`);
    }

    // Desactivar géneros que ya no están en la lista
    const validIds = GENRES.map(g => g.id);
    const deactivated = await Genre.updateMany(
        { id: { $nin: validIds } },
        { activo: false }
    );
    if (deactivated.modifiedCount > 0) {
        console.log(`  ⚠ ${deactivated.modifiedCount} géneros desactivados`);
    }

    // 2. Insertar productos (sin duplicados por nombre)
    console.log('\n🎮 Insertando productos...');
    let inserted = 0;
    let skipped = 0;

    for (const product of PRODUCTS) {
        const exists = await Product.findOne({ nombre: product.nombre });
        if (exists) {
            console.log(`  ⏭ ${product.nombre} (ya existe)`);
            skipped++;
            continue;
        }

        const newProduct = new Product({
            ...product,
            fechaLanzamiento: new Date(),
            activo: true,
            calificacion: 0,
            cantidadVendida: 0,
            imagenUrl: 'https://placehold.co/600x800?text=Subir+Imagen',
        });

        await newProduct.save();
        console.log(`  ✅ ${product.nombre} - $${product.precio}`);
        inserted++;
    }

    console.log(`\n📊 Resumen: ${inserted} insertados, ${skipped} omitidos (ya existían)`);
    console.log('✅ Seed completado');
    process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e); process.exit(1); });
