import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Unique isolated database, never the development application or benchmark database.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27018/sarh_test_${process.pid}_${Date.now()}`;
process.env.JWT_SECRET = randomUUID() + randomUUID();
process.env.APP_ORIGINS = 'http://localhost:5173';
const { createApp } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { User } = await import('../src/modules/users/user.model.js');
const { Product } = await import('../src/modules/products/product.model.js');
const { Order } = await import('../src/modules/orders/order.model.js');
const { hashPassword } = await import('../src/lib/password.js');
const app = createApp();
const origin = 'http://localhost:5173';
const password = 'TestPassword2026!';
let adminCookie: string;
let agentCookie: string;
let productId: string;
let agentId: string;
const write = (method: 'post' | 'delete' | 'patch', path: string, cookie?: string) => {
  const req = request(app)[method](path).set('Origin', origin).set('X-SARH-Request', '1').set('Content-Type', 'application/json');
  if (cookie) req.set('Cookie', cookie);
  return req;
};
async function login(email: string, pwd = password) {
  const response = await write('post', '/api/auth/login').send({ email, password: pwd }).expect(200);
  const raw = response.headers['set-cookie'][0] as string;
  assert.match(raw, /HttpOnly/); assert.match(raw, /SameSite=Strict/);
  return raw.split(';')[0];
}
async function prepare(cookie = agentCookie, previousAttemptId?: string) {
  const response = await write('post', '/api/orders/attempts', cookie).send(previousAttemptId ? { previousAttemptId } : {}).expect(200);
  return response.body.attempt as { _id: string; operationKey: string; state: string };
}
const input = (name = 'Omar Hassan', price = 12550) => ({
  customerName: name, customerEmail: 'omar@example.com', items: [{ productId, quantity: 3, expectedUnitPriceMinor: price }],
});
const submit = (attempt: { _id: string; operationKey: string }, order = input(), cookie = agentCookie) =>
  write('post', '/api/orders', cookie).set('Idempotency-Key', attempt.operationKey).send({ attemptId: attempt._id, order });
async function freshAttempt() {
  const current = await request(app).get('/api/orders/attempts/current').set('Cookie', agentCookie).expect(200);
  return prepare(agentCookie, current.body.attempt?.state === 'committed' ? current.body.attempt._id : undefined);
}

before(async () => {
  await connectDatabase();
  const passwordHash = await hashPassword(password);
  const [admin, agent] = await User.create([
    { name: 'Admin', email: 'admin@test.local', passwordHash, role: 'admin' },
    { name: 'Agent', email: 'agent@test.local', passwordHash, role: 'agent' },
  ]);
  agentId = String(agent._id);
  assert.equal(admin.role, 'admin');
  const product = await Product.create({ sku: 'TEST-1', name: 'Test keyboard', nameSearch: 'test keyboard', unitPriceMinor: 12550 });
  productId = String(product._id);
  adminCookie = await login('admin@test.local'); agentCookie = await login('agent@test.local');
});
after(async () => {
  if (mongoose.connection.name.startsWith('sarh_test_')) await mongoose.connection.dropDatabase();
  await disconnectDatabase();
});

test('Swagger specification is valid and same-origin docs serve local interactive assets', async () => {
  const { default: SwaggerParser } = await import('@apidevtools/swagger-parser');
  const response = await request(app).get('/openapi.json').expect(200);
  const spec = await SwaggerParser.validate(response.body);
  assert.ok('openapi' in spec);
  assert.equal(spec.openapi, '3.0.3');
  assert.equal(Object.values(spec.paths ?? {}).reduce((sum, path) => sum + Object.keys(path ?? {}).length, 0), 15);
  const page = await request(app).get('/docs/').expect(200);
  assert.match(page.text, /swagger-ui-bundle.js/);
  assert.match(page.headers['content-security-policy'], /connect-src 'self'/);
  const init = await request(app).get('/docs/swagger-ui-init.js').expect(200);
  assert.match(init.text, /X-SARH-Request/);
  assert.match(init.text, /\/openapi.json/);
  await request(app).get('/docs/swagger-ui-bundle.js').expect(200);
});

test('authentication rejects forged, expired, query-string tokens and anonymous access', async () => {
  await request(app).get('/api/orders').expect(401);
  const fake = jwt.sign({ ver: 0 }, 'attacker-secret', { subject: agentId, issuer: 'sarh-api', audience: 'sarh-console' });
  await request(app).get('/api/orders').set('Cookie', `sarh_session=${fake}`).expect(401);
  const expired = jwt.sign({ ver: 0 }, process.env.JWT_SECRET!, { subject: agentId, expiresIn: -1, issuer: 'sarh-api', audience: 'sarh-console' });
  await request(app).get('/api/orders').set('Cookie', `sarh_session=${expired}`).expect(401);
  await request(app).get('/api/orders').query({ token: agentCookie.split('=')[1] }).expect(401);
});

test('CSRF rejects missing or foreign origin and missing application header', async () => {
  await request(app).post('/api/auth/logout').set('Cookie', agentCookie).expect(403);
  await request(app).post('/api/auth/logout').set('Cookie', agentCookie).set('Origin', 'https://evil.example').set('X-SARH-Request', '1').expect(403);
  await request(app).post('/api/auth/logout').set('Cookie', agentCookie).set('Origin', origin).expect(403);
});

test('parallel creates, lost response replay, conflict, and soft-delete leave exactly one order', async () => {
  const [first, second] = await Promise.all([prepare(), prepare()]);
  assert.equal(first._id, second._id, 'parallel prepare must share one server-side attempt');
  const responses = await Promise.all(Array.from({ length: 8 }, () => submit(first)));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal(responses.filter(r => r.status === 200).length, 7);
  const id = responses[0].body.order._id;
  assert.ok(responses.every(r => r.body.order._id === id));
  assert.equal(responses[0].body.order.totalMinor, 37650);
  assert.equal(await Order.countDocuments({ operationKey: first.operationKey, state: 'committed' }), 1);
  console.log(`Duplicate proof: 8 parallel HTTP requests => 1 order (${id}), total=37650 halalas`);
  const restored = await request(app).get('/api/orders/attempts/current').set('Cookie', agentCookie).expect(200);
  assert.equal(restored.body.attempt.state, 'committed');
  assert.equal(restored.body.attempt.submission.customerName, 'Omar Hassan');
  await submit(first, input('Different customer')).expect(409);
  await write('delete', `/api/orders/${id}`, agentCookie).expect(403);
  await write('delete', `/api/orders/${id}`, adminCookie).expect(204);
  const replay = await submit(first).expect(200);
  assert.ok(replay.body.order.deletedAt);
  await request(app).get(`/api/orders/${id}`).set('Cookie', agentCookie).expect(404);
  assert.equal(await Order.countDocuments({ operationKey: first.operationKey }), 1);
  const next = await prepare(agentCookie, first._id);
  assert.notEqual(next._id, first._id);
  const delayed = await prepare(agentCookie, first._id);
  assert.equal(delayed._id, next._id, 'late acknowledgement must not replace a new attempt');
  await write('post', '/api/orders/attempts', agentCookie).send({ previousAttemptId: next._id }).expect(409);
});

test('price changes reject definitively, allow correction, and do not alter old orders', async () => {
  const attempt = await freshAttempt();
  await Product.updateOne({ _id: productId }, { $set: { unitPriceMinor: 13000 } });
  const changed = await submit(attempt).expect(409);
  assert.equal(changed.body.error.code, 'PRICE_CHANGED');
  assert.equal(await Order.countDocuments({ _id: attempt._id, state: 'committed' }), 0);
  const restored = await request(app).get('/api/orders/attempts/current').set('Cookie', agentCookie).expect(200);
  assert.equal(restored.body.attempt.state, 'draft');
  assert.equal(restored.body.attempt.submission.items[0].quantity, 3);
  const created = await submit(attempt, input('Omar Hassan', 13000)).expect(201);
  assert.equal(created.body.order.totalMinor, 39000);
  await Product.updateOne({ _id: productId }, { $set: { unitPriceMinor: 12550 } });
  const replay = await submit(attempt, input('Omar Hassan', 13000)).expect(200);
  assert.equal(replay.body.order.totalMinor, 39000);
});

test('validation rejects tampering and attempts cannot be accessed by another user', async () => {
  const attempt = await freshAttempt();
  await write('post', '/api/orders', agentCookie).set('Idempotency-Key', attempt.operationKey)
    .send({ attemptId: attempt._id, order: { ...input(), totalMinor: 1 } }).expect(400);
  await submit(attempt, { ...input(), items: [{ productId, quantity: 0, expectedUnitPriceMinor: 12550 }] }).expect(400);
  await submit(attempt, input(), adminCookie).expect(404);
  await request(app).get('/api/orders').set('Cookie', agentCookie).query({ pageSize: 10001 }).expect(400);
  await write('delete', '/api/orders/not-an-id', adminCookie).expect(400);
});

test('submitted attempt recovers after process interruption without a second order', async () => {
  const attempt = await freshAttempt();
  // Simulate a process dying after reservation but before final commit.
  const { createHash } = await import('node:crypto');
  const body = input();
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  await Order.updateOne({ _id: attempt._id }, { $set: { state: 'submitted', requestHash: hash, submission: body } });
  const restored = await request(app).get('/api/orders/attempts/current').set('Cookie', agentCookie).expect(200);
  assert.equal(restored.body.attempt.state, 'submitted');
  await submit(attempt).expect(201);
  assert.equal(await Order.countDocuments({ operationKey: attempt.operationKey, state: 'committed' }), 1);
});

test('prefix search, filtering, stable sort and pagination match database contents', async () => {
  const english = await request(app).get('/api/orders').set('Cookie', agentCookie).query({ search: 'OM', status: 'pending', sortBy: 'totalMinor', direction: 'asc', pageSize: 1 }).expect(200);
  assert.ok(english.body.total >= 2);
  assert.equal(english.body.data.length, 1);
  assert.ok(english.body.data[0].customerName.startsWith('Omar'));
  assert.equal(english.body.data[0].operationKey, undefined);
  const middle = await request(app).get('/api/orders').set('Cookie', agentCookie).query({ search: 'mar hass' }).expect(200);
  assert.equal(middle.body.total, 0);
  const literal = await request(app).get('/api/orders').set('Cookie', agentCookie).query({ search: '.*' }).expect(200);
  assert.equal(literal.body.total, 0);
  const attempt = await freshAttempt();
  await submit(attempt, input('أحمد حسن')).expect(201);
  const arabic = await request(app).get('/api/orders').set('Cookie', agentCookie).query({ search: 'أحم' }).expect(200);
  assert.equal(arabic.body.total, 1);
});

test('admin manages agents, first password change is enforced, disable is immediate', async () => {
  await write('post', '/api/users', agentCookie).send({ name: 'Blocked', email: 'blocked@test.local', password }).expect(403);
  await write('post', '/api/users', adminCookie).send({ name: 'Role injection', email: 'inject@test.local', password, role: 'admin' }).expect(400);
  const created = await write('post', '/api/users', adminCookie).send({ name: 'New agent', email: 'new@test.local', password }).expect(201);
  assert.equal(created.body.user.passwordHash, undefined);
  assert.equal(created.body.user.mustChangePassword, true);
  const oldCookie = await login('new@test.local');
  await request(app).get('/api/orders').set('Cookie', oldCookie).expect(403);
  const changed = await write('post', '/api/auth/change-password', oldCookie).send({ currentPassword: password, newPassword: 'ChangedPassword2026!' }).expect(200);
  const newCookie = (changed.headers['set-cookie'][0] as string).split(';')[0];
  await request(app).get('/api/orders').set('Cookie', oldCookie).expect(401);
  await request(app).get('/api/orders').set('Cookie', newCookie).expect(200);
  await write('patch', `/api/users/${created.body.user._id}/deactivate`, adminCookie).send({}).expect(200);
  await request(app).get('/api/orders').set('Cookie', newCookie).expect(401);
  await write('post', '/api/auth/login').send({ email: 'new@test.local', password: 'ChangedPassword2026!' }).expect(401);
});

test('logout invalidates other devices and no password hash leaks in user lists', async () => {
  const anotherDevice = await login('agent@test.local');
  await write('post', '/api/auth/logout', agentCookie).send({}).expect(204);
  await request(app).get('/api/orders').set('Cookie', anotherDevice).expect(401);
  const users = await request(app).get('/api/users').set('Cookie', adminCookie).expect(200);
  assert.ok(users.body.data.every((u: Record<string, unknown>) => u.role === 'agent' && !('passwordHash' in u)));
});
