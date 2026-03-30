require('dotenv').config();
const p = require('./lib/prisma');
p.$connect()
    .then(() => { console.log('Prisma OK - conectado a Supabase'); p.$disconnect(); })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
