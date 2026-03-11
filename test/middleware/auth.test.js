const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  authMiddleware,
  guestMiddleware,
  publicMiddleware
} = require('../../src/middleware/auth');

process.env.JWT_SECRET = 'test-secret';

function createResponse() {
  return {
    locals: {},
    redirectPath: null,
    statusCode: null,
    jsonPayload: null,
    redirect(path) {
      this.redirectPath = path;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    }
  };
}

test('authMiddleware redirects to login when the session has no token', () => {
  const req = { session: {} };
  const res = createResponse();
  let nextCalled = false;

  authMiddleware()(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.redirectPath, '/login');
  assert.equal(nextCalled, false);
});

test('authMiddleware attaches the decoded user and calls next for a valid token', (t) => {
  const decoded = { id: 1, role: 'admin' };
  t.mock.method(jwt, 'verify', () => decoded);

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  authMiddleware()(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, decoded);
  assert.deepEqual(res.locals.user, decoded);
  assert.equal(nextCalled, true);
});

test('authMiddleware blocks users without the required role', (t) => {
  t.mock.method(jwt, 'verify', () => ({ id: 1, role: 'aluno' }));

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  authMiddleware('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonPayload, { error: 'Acesso negado' });
  assert.equal(nextCalled, false);
});

test('authMiddleware redirects to login when token verification fails', (t) => {
  t.mock.method(jwt, 'verify', () => {
    throw new Error('invalid token');
  });

  const req = { session: { token: 'bad-token' } };
  const res = createResponse();

  authMiddleware()(req, res, () => {});

  assert.equal(res.redirectPath, '/login');
});

test('guestMiddleware redirects authenticated admins from login to admin dashboard', (t) => {
  t.mock.method(jwt, 'verify', () => ({ role: 'admin' }));

  const req = { path: '/login', session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  guestMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.redirectPath, '/admin/dashboard');
  assert.equal(nextCalled, false);
});

test('guestMiddleware redirects authenticated students from register to aluno dashboard', (t) => {
  t.mock.method(jwt, 'verify', () => ({ role: 'aluno' }));

  const req = { path: '/register', session: { token: 'valid-token' } };
  const res = createResponse();

  guestMiddleware(req, res, () => {});

  assert.equal(res.redirectPath, '/aluno/dashboard');
});

test('guestMiddleware allows authenticated users through on public pages', (t) => {
  t.mock.method(jwt, 'verify', () => ({ role: 'admin' }));

  const req = { path: '/cursos', session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  guestMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.redirectPath, null);
  assert.equal(nextCalled, true);
});

test('publicMiddleware exposes the decoded user when a valid token exists', (t) => {
  const decoded = { id: 2, role: 'aluno' };
  t.mock.method(jwt, 'verify', () => decoded);

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  publicMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, decoded);
  assert.deepEqual(res.locals.user, decoded);
  assert.equal(nextCalled, true);
});

test('publicMiddleware ignores invalid tokens and still calls next', (t) => {
  t.mock.method(jwt, 'verify', () => {
    throw new Error('invalid token');
  });

  const req = { session: { token: 'bad-token' } };
  const res = createResponse();
  let nextCalled = false;

  publicMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.user, undefined);
  assert.deepEqual(res.locals, {});
  assert.equal(nextCalled, true);
});
