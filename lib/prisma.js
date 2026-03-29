require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

let prisma;

if (!global.__prisma) {
    global.__prisma = new PrismaClient({ adapter });
}

prisma = global.__prisma;

module.exports = prisma;
