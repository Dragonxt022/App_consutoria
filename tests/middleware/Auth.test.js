const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWithStubs } = require('../helpers/LoadWithStubs');

process.env.JWT_SECRET = 'test-secret';

const authModulePath = path.resolve(__dirname, '../../src/middleware/Auth.js');

function createResponse() {
  return {
    locals: {},
    redirectPath: null,
    statusCode: null,
    jsonPayload: null,
    redirect(pathname) {
      this.redirectPath = pathname;
      return this;
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

async function flushAsyncMiddleware() {
  await new Promise((resolve) => setImmediate(resolve));
}

function loadAuthModule({
  decodedToken,
  verifyError = null,
  user = null,
  notificationSummary = { unreadCount: 0, latest: [] }
} = {}) {
  return loadWithStubs(authModulePath, {
    jsonwebtoken: {
      verify() {
        if (verifyError) {
          throw verifyError;
        }

        return decodedToken;
      }
    },
    '../models': {
      User: {
        async findByPk(id) {
          if (decodedToken?.id && decodedToken.id === id) {
            return user;
          }

          return null;
        },
        async findOne({ where }) {
          if (decodedToken?.email && where.email === decodedToken.email) {
            return user;
          }

          return null;
        }
      }
    },
    '../services/shared/NotificationService': {
      async syncExpiredCertificateNotifications() {},
      async getNavbarNotifications() {
        return notificationSummary;
      }
    }
  });
}

test('authMiddleware redirects to login when the session has no token', async () => {
  const { authMiddleware } = loadAuthModule();
  const req = { session: {} };
  const res = createResponse();
  let nextCalled = false;

  await authMiddleware()(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.redirectPath, '/login');
  assert.equal(nextCalled, false);
});

test('authMiddleware attaches the persisted user and calls next for a valid token', async () => {
  const persistedUser = {
    id: 1,
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    avatar: null,
    active: true
  };
  const { authMiddleware } = loadAuthModule({
    decodedToken: { id: 1, role: 'admin' },
    user: persistedUser,
    notificationSummary: { unreadCount: 3, latest: [{ id: 10 }] }
  });

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  await authMiddleware()(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, persistedUser);
  assert.deepEqual(res.locals.user, persistedUser);
  assert.equal(res.locals.adminNotificationUnreadCount, 3);
  assert.deepEqual(res.locals.adminNotificationsTray, [{ id: 10 }]);
  assert.equal(nextCalled, true);
});

test('authMiddleware blocks users without the required role', async () => {
  const { authMiddleware } = loadAuthModule({
    decodedToken: { id: 1, role: 'aluno' },
    user: {
      id: 1,
      name: 'Aluno',
      email: 'aluno@example.com',
      role: 'aluno',
      avatar: null,
      active: true
    }
  });

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  await authMiddleware('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonPayload, { error: 'Acesso negado' });
  assert.equal(nextCalled, false);
});

test('authMiddleware redirects to login when token verification fails', async () => {
  const { authMiddleware } = loadAuthModule({
    verifyError: new Error('invalid token')
  });

  const req = { session: { token: 'bad-token' } };
  const res = createResponse();

  await authMiddleware()(req, res, () => {});

  assert.equal(req.session.token, null);
  assert.equal(res.redirectPath, '/login');
});

test('guestMiddleware redirects authenticated admins from login to admin dashboard', async () => {
  const { guestMiddleware } = loadAuthModule({
    decodedToken: { id: 1, role: 'admin' },
    user: {
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      avatar: null,
      active: true
    }
  });

  const req = { path: '/login', session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  await guestMiddleware(req, res, () => {
    nextCalled = true;
  });
  await flushAsyncMiddleware();

  assert.equal(res.redirectPath, '/admin/dashboard');
  assert.equal(nextCalled, false);
});

test('guestMiddleware redirects authenticated students from register to aluno dashboard', async () => {
  const { guestMiddleware } = loadAuthModule({
    decodedToken: { id: 2, role: 'aluno' },
    user: {
      id: 2,
      name: 'Aluno',
      email: 'aluno@example.com',
      role: 'aluno',
      avatar: null,
      active: true
    }
  });

  const req = { path: '/register', session: { token: 'valid-token' } };
  const res = createResponse();

  await guestMiddleware(req, res, () => {});
  await flushAsyncMiddleware();

  assert.equal(res.redirectPath, '/aluno/dashboard');
});

test('guestMiddleware allows authenticated users through on public pages', async () => {
  const { guestMiddleware } = loadAuthModule({
    decodedToken: { id: 1, role: 'admin' },
    user: {
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
      avatar: null,
      active: true
    }
  });

  const req = { path: '/cursos', session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  await guestMiddleware(req, res, () => {
    nextCalled = true;
  });
  await flushAsyncMiddleware();

  assert.equal(res.redirectPath, null);
  assert.equal(nextCalled, true);
});

test('publicMiddleware exposes the persisted user when a valid token exists', async () => {
  const persistedUser = {
    id: 2,
    name: 'Aluno',
    email: 'aluno@example.com',
    role: 'aluno',
    avatar: null,
    active: true
  };
  const { publicMiddleware } = loadAuthModule({
    decodedToken: { id: 2, role: 'aluno' },
    user: persistedUser
  });

  const req = { session: { token: 'valid-token' } };
  const res = createResponse();
  let nextCalled = false;

  await publicMiddleware(req, res, () => {
    nextCalled = true;
  });
  await flushAsyncMiddleware();

  assert.deepEqual(req.user, persistedUser);
  assert.deepEqual(res.locals.user, persistedUser);
  assert.equal(nextCalled, true);
});

test('publicMiddleware ignores invalid tokens and still calls next', async () => {
  const { publicMiddleware } = loadAuthModule({
    verifyError: new Error('invalid token')
  });

  const req = { session: { token: 'bad-token' } };
  const res = createResponse();
  let nextCalled = false;

  await publicMiddleware(req, res, () => {
    nextCalled = true;
  });
  await flushAsyncMiddleware();

  assert.equal(req.user, undefined);
  assert.equal(req.session.token, null);
  assert.deepEqual(res.locals, {});
  assert.equal(nextCalled, true);
});
