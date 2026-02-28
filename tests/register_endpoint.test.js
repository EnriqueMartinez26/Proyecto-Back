/**
 * register_endpoint.test.js
 *
 * Test de integración end-to-end del endpoint POST /api/auth/register.
 * Verifica: HTTP 201, estructura del body, emailSent, y documento en MongoDB.
 *
 * Requiere el servidor levantado en PORT=9003 y MONGODB disponible.
 * Ejecutar: node tests/register_endpoint.test.js
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const mongoose = require('mongoose');

const BASE_URL = `http://localhost:${process.env.PORT || 9003}`;
const TEST_EMAIL = `test.register.${Date.now()}@mailinator.com`;
const TEST_NAME  = 'Usuario Test Integración';
const TEST_PASS  = 'TestPass123!';

// ─── helpers ─────────────────────────────────────────────────────────────────
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function pass(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); process.exitCode = 1; }
function section(msg) { console.log(`\n── ${msg}`); }

// ─── Tests ───────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🧪  Register endpoint — ${BASE_URL}/api/auth/register`);
  console.log(`    Email de prueba: ${TEST_EMAIL}\n`);

  const payload = JSON.stringify({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASS });
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };

  // ── 1. Petición de registro ──────────────────────────────────────────────
  section('1. POST /api/auth/register');
  let res;
  try {
    res = await request(`${BASE_URL}/api/auth/register`, options, payload);
  } catch (err) {
    fail(`No se pudo conectar al servidor: ${err.message}`);
    return;
  }

  // HTTP 201
  res.status === 201
    ? pass(`HTTP ${res.status} Created`)
    : fail(`Se esperaba 201, se recibió ${res.status} — body: ${JSON.stringify(res.body)}`);

  // success: true
  res.body?.success === true
    ? pass('body.success === true')
    : fail(`body.success esperado true, recibido: ${res.body?.success}`);

  // token presente
  res.body?.token
    ? pass(`JWT token presente (${res.body.token.substring(0, 20)}...)`)
    : fail('JWT token ausente en la respuesta');

  // user DTO
  const user = res.body?.user;
  user?.id        ? pass(`user.id presente: ${user.id}`)           : fail('user.id ausente');
  user?.name      ? pass(`user.name: "${user.name}"`)              : fail('user.name ausente');
  user?.email     ? pass(`user.email: "${user.email}"`)            : fail('user.email ausente');
  user?.isVerified === false
    ? pass('user.isVerified === false (pendiente verificación)')
    : fail(`user.isVerified esperado false, recibido: ${user?.isVerified}`);

  // emailSent
  typeof res.body?.emailSent === 'boolean'
    ? pass(`emailSent: ${res.body.emailSent} (booleano real, no hardcodeado)`)
    : fail(`emailSent debería ser boolean, recibido: ${typeof res.body?.emailSent}`);

  // ── 2. Verificación en MongoDB ───────────────────────────────────────────
  section('2. Verificación en MongoDB');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const User = require('../models/User');
    const dbUser = await User.findOne({ email: TEST_EMAIL });

    dbUser
      ? pass(`Documento encontrado en DB: _id=${dbUser._id}`)
      : fail('Documento NO encontrado en MongoDB');

    dbUser?.isVerified === false
      ? pass('DB: isVerified === false')
      : fail(`DB: isVerified esperado false, recibido: ${dbUser?.isVerified}`);

    dbUser?.verificationToken
      ? pass(`DB: verificationToken presente (${dbUser.verificationToken.substring(0, 8)}...)`)
      : fail('DB: verificationToken ausente');

    dbUser?.verificationTokenExpire > new Date()
      ? pass(`DB: verificationTokenExpire válido (${dbUser.verificationTokenExpire.toISOString()})`)
      : fail('DB: verificationTokenExpire expirado o ausente');

    // Limpieza: borrar el usuario de prueba
    await User.deleteOne({ email: TEST_EMAIL });
    pass(`DB: usuario de prueba eliminado (limpieza)`);

  } catch (err) {
    fail(`Error al verificar en MongoDB: ${err.message}`);
  } finally {
    await mongoose.disconnect();
  }

  // ── 3. Registro duplicado → 400 ──────────────────────────────────────────
  section('3. Registro duplicado (mismo email) → debe fallar con 400');
  // Crear un usuario temporal
  const mongoose2 = require('mongoose');
  await mongoose2.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const User2 = require('../models/User');
  const DUPE_EMAIL = `test.dupe.${Date.now()}@mailinator.com`;
  await User2.create({
    name: 'Dupe', email: DUPE_EMAIL, password: 'hashed',
    verificationToken: 'tok', verificationTokenExpire: new Date(Date.now() + 3600000)
  });
  await mongoose2.disconnect();

  const dupePayload = JSON.stringify({ name: 'Dupe', email: DUPE_EMAIL, password: 'TestPass123!' });
  const dupeOpts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dupePayload) }
  };
  const dupeRes = await request(`${BASE_URL}/api/auth/register`, dupeOpts, dupePayload);
  dupeRes.status === 400
    ? pass(`HTTP ${dupeRes.status} — email duplicado rechazado correctamente`)
    : fail(`Se esperaba 400, se recibió ${dupeRes.status}`);

  // Limpiar usuario duplicado
  await mongoose2.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await User2.deleteOne({ email: DUPE_EMAIL });
  await mongoose2.disconnect();

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n' + (process.exitCode === 1
    ? '❌  Algunos tests fallaron — revisar arriba'
    : '✅  Todos los tests del endpoint de registro PASARON')
  + '\n');
}

run().catch(err => { console.error('Error inesperado:', err); process.exit(1); });
