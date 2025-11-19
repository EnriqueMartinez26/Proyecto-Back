require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar modelos
const User = require('../models/User');
const Product = require('../models/Product');
const Platform = require('../models/Platform');
const Genre = require('../models/Genre');
const DigitalKey = require('../models/DigitalKey');
const Category = require('../models/Category');

// Función para conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

const initDB = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();

    console.log('🗑️  Limpiando base de datos...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Platform.deleteMany({});
    await Genre.deleteMany({});
    await DigitalKey.deleteMany({});
    await Category.deleteMany({});

    console.log('📦 Creando plataformas...');
    const platforms = await Platform.insertMany([
      { id: 'ps5', nombre: 'PlayStation 5', activo: true },
      { id: 'xbox', nombre: 'Xbox Series X', activo: true },
      { id: 'switch', nombre: 'Nintendo Switch', activo: true },
      { id: 'pc', nombre: 'PC', activo: true }
    ]);

    console.log('🎮 Creando géneros...');
    const genres = await Genre.insertMany([
      { id: 'action', nombre: 'Action', activo: true },
      { id: 'rpg', nombre: 'RPG', activo: true },
      { id: 'strategy', nombre: 'Strategy', activo: true },
      { id: 'adventure', nombre: 'Adventure', activo: true },
      { id: 'sports', nombre: 'Sports', activo: true },
      { id: 'puzzle', nombre: 'Puzzle', activo: true },
      { id: 'racing', nombre: 'Racing', activo: true }
    ]);

    console.log('👥 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    const users = await User.insertMany([
      {
        nombre: 'Admin User',
        email: 'admin@golstore.com',
        password: hashedPassword,
        rol: 'ADMIN',
        telefono: '+54 11 1234-5678',
        direccion: {
          calle: 'Av. Corrientes 1234',
          ciudad: 'Buenos Aires',
          estado: 'CABA',
          codigoPostal: '1043',
          pais: 'Argentina'
        },
        activo: true
      },
      {
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        password: hashedPassword,
        rol: 'CLIENTE',
        telefono: '+54 11 9876-5432',
        direccion: {
          calle: 'Calle Falsa 123',
          ciudad: 'Córdoba',
          estado: 'Córdoba',
          codigoPostal: '5000',
          pais: 'Argentina'
        },
        activo: true
      }
    ]);

    console.log('🎯 Creando productos...');
    const products = await Product.insertMany([
      // PlayStation 5 - Action
      {
        nombre: 'God of War Ragnarök',
        descripcion: 'Embárcate en una aventura épica y desgarradora mientras Kratos y Atreus luchan por encontrar respuestas.',
        precio: 69.99,
        plataformaId: 'ps5',
        generoId: 'action',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2022-11-09'),
        desarrollador: 'Santa Monica Studio',
        imagenUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0A.png',
        calificacion: 4.9,
        stock: 100,
        cantidadVendida: 45,
        activo: true
      },
      // PlayStation 5 - RPG
      {
        nombre: 'Elden Ring',
        descripcion: 'Un nuevo RPG de acción y fantasía. Levántate, Sinluz, y que la gracia te guíe.',
        precio: 59.99,
        plataformaId: 'ps5',
        generoId: 'rpg',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2022-02-25'),
        desarrollador: 'FromSoftware',
        imagenUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhopp3MHppi7kooGE2Dtt8C.png',
        calificacion: 4.8,
        stock: 150,
        cantidadVendida: 89,
        activo: true
      },
      // Xbox Series X - Action
      {
        nombre: 'Halo Infinite',
        descripcion: 'Cuando toda esperanza se pierda y el destino de la humanidad penda de un hilo, el Jefe Maestro está listo para confrontar al enemigo más cruel.',
        precio: 49.99,
        plataformaId: 'xbox',
        generoId: 'action',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2021-12-08'),
        desarrollador: '343 Industries',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1240440/header.jpg',
        calificacion: 4.5,
        stock: 200,
        cantidadVendida: 120,
        activo: true
      },
      // Xbox Series X - Racing
      {
        nombre: 'Forza Horizon 5',
        descripcion: 'Tu aventura Horizon te espera. Explora los vibrantes paisajes de México.',
        precio: 59.99,
        plataformaId: 'xbox',
        generoId: 'racing',
        tipo: 'Fisico',
        fechaLanzamiento: new Date('2021-11-09'),
        desarrollador: 'Playground Games',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg',
        calificacion: 4.7,
        stock: 50,
        cantidadVendida: 67,
        activo: true
      },
      // Nintendo Switch - Adventure
      {
        nombre: 'The Legend of Zelda: Tears of the Kingdom',
        descripcion: 'Una aventura épica por la tierra y los cielos de Hyrule te espera.',
        precio: 69.99,
        plataformaId: 'switch',
        generoId: 'adventure',
        tipo: 'Fisico',
        fechaLanzamiento: new Date('2023-05-12'),
        desarrollador: 'Nintendo',
        imagenUrl: 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/c_scale,w_600/ncom/en_US/games/switch/t/the-legend-of-zelda-tears-of-the-kingdom-switch/hero',
        calificacion: 5.0,
        stock: 75,
        cantidadVendida: 156,
        activo: true
      },
      // Nintendo Switch - RPG
      {
        nombre: 'Pokémon Scarlet',
        descripcion: 'Captura, entrena y lucha con Pokémon en la región de Paldea.',
        precio: 59.99,
        plataformaId: 'switch',
        generoId: 'rpg',
        tipo: 'Fisico',
        fechaLanzamiento: new Date('2022-11-18'),
        desarrollador: 'Game Freak',
        imagenUrl: 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/c_scale,w_600/ncom/en_US/games/switch/p/pokemon-scarlet-switch/hero',
        calificacion: 4.3,
        stock: 80,
        cantidadVendida: 94,
        activo: true
      },
      // PC - Strategy
      {
        nombre: 'Civilization VI',
        descripcion: 'Construye un imperio que resista el paso del tiempo.',
        precio: 29.99,
        plataformaId: 'pc',
        generoId: 'strategy',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2016-10-21'),
        desarrollador: 'Firaxis Games',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/289070/header.jpg',
        calificacion: 4.6,
        stock: 500,
        cantidadVendida: 234,
        activo: true
      },
      // PC - RPG
      {
        nombre: 'Baldur\'s Gate 3',
        descripcion: 'Reúne a tu grupo y regresa a los Reinos Olvidados.',
        precio: 59.99,
        plataformaId: 'pc',
        generoId: 'rpg',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2023-08-03'),
        desarrollador: 'Larian Studios',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
        calificacion: 4.9,
        stock: 300,
        cantidadVendida: 178,
        activo: true
      },
      // PC - Action
      {
        nombre: 'Cyberpunk 2077',
        descripcion: 'Conviértete en un mercenario armado hasta los dientes y hazte un nombre en las calles de Night City.',
        precio: 39.99,
        plataformaId: 'pc',
        generoId: 'action',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2020-12-10'),
        desarrollador: 'CD Projekt Red',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
        calificacion: 4.2,
        stock: 400,
        cantidadVendida: 267,
        activo: true
      },
      // PS5 - Sports
      {
        nombre: 'EA Sports FC 24',
        descripcion: 'El juego de fútbol más realista del mundo.',
        precio: 69.99,
        plataformaId: 'ps5',
        generoId: 'sports',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2023-09-29'),
        desarrollador: 'EA Sports',
        imagenUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/5e6f10f1c0b5dd8a4cc1e6d18d3e62e1ce02cb3b50525c2c.jpg',
        calificacion: 4.4,
        stock: 250,
        cantidadVendida: 145,
        activo: true
      },
      // Switch - Puzzle
      {
        nombre: 'Tetris Effect: Connected',
        descripcion: 'Tetris como nunca antes lo has experimentado.',
        precio: 39.99,
        plataformaId: 'switch',
        generoId: 'puzzle',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2021-10-08'),
        desarrollador: 'Monstars Inc.',
        imagenUrl: 'https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_2.0/c_scale,w_600/ncom/en_US/games/switch/t/tetris-effect-connected-switch/hero',
        calificacion: 4.7,
        stock: 150,
        cantidadVendida: 78,
        activo: true
      },
      // Xbox - Adventure
      {
        nombre: 'Starfield',
        descripcion: 'La primera nueva universo en más de 25 años de Bethesda Game Studios.',
        precio: 69.99,
        plataformaId: 'xbox',
        generoId: 'adventure',
        tipo: 'Digital',
        fechaLanzamiento: new Date('2023-09-06'),
        desarrollador: 'Bethesda Game Studios',
        imagenUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg',
        calificacion: 4.1,
        stock: 180,
        cantidadVendida: 112,
        activo: true
      }
    ]);

    console.log('🔑 Creando claves digitales...');
    const digitalProducts = products.filter(p => p.tipo === 'Digital');
    const digitalKeys = [];

    for (const product of digitalProducts) {
      for (let i = 0; i < 20; i++) {
        digitalKeys.push({
          productoId: product._id,
          clave: `${product.nombre.toUpperCase().replace(/\s/g, '-').replace(/'/g, '')}-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
          estado: 'DISPONIBLE'
        });
      }
    }

    await DigitalKey.insertMany(digitalKeys);

    console.log('\n✅ Base de datos inicializada exitosamente!');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Plataformas: ${platforms.length}`);
    console.log(`   - Géneros: ${genres.length}`);
    console.log(`   - Usuarios: ${users.length}`);
    console.log(`   - Productos: ${products.length}`);
    console.log(`   - Claves digitales: ${digitalKeys.length}`);
    console.log('\n🔐 Credenciales de prueba:');
    console.log('   Admin:');
    console.log('     Email: admin@golstore.com');
    console.log('     Password: password123');
    console.log('   Cliente:');
    console.log('     Email: juan.perez@example.com');
    console.log('     Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

// Ejecutar la inicialización
initDB();