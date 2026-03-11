const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWithStubs } = require('../../test-support/loadWithStubs');

const cleanupPath = path.resolve(__dirname, '../../src/utils/cleanup.js');

test('cleanupUnconfirmed removes expired inactive users and their enrollments', async () => {
  const lt = Symbol('lt');
  const calls = {
    enrollmentDestroy: null,
    userDestroy: null
  };

  const cleanupUnconfirmed = loadWithStubs(cleanupPath, {
    '../models': {
      User: {
        async findAll({ where }) {
          assert.equal(where.active, false);
          assert.ok(where.confirmationExpires[lt] instanceof Date);
          return [{ id: 3 }, { id: 7 }];
        },
        async destroy(options) {
          calls.userDestroy = options;
        }
      },
      Enrollment: {
        async destroy(options) {
          calls.enrollmentDestroy = options;
        }
      },
      Course: {}
    },
    sequelize: {
      Op: { lt }
    }
  });

  await cleanupUnconfirmed();

  assert.deepEqual(calls.enrollmentDestroy, {
    where: { userId: [3, 7] },
    force: true
  });
  assert.deepEqual(calls.userDestroy, {
    where: { id: [3, 7] }
  });
});

test('cleanupUnconfirmed does nothing when no users are expired', async () => {
  let enrollmentDestroyed = false;
  let userDestroyed = false;

  const cleanupUnconfirmed = loadWithStubs(cleanupPath, {
    '../models': {
      User: {
        async findAll() {
          return [];
        },
        async destroy() {
          userDestroyed = true;
        }
      },
      Enrollment: {
        async destroy() {
          enrollmentDestroyed = true;
        }
      },
      Course: {}
    },
    sequelize: {
      Op: { lt: Symbol('lt') }
    }
  });

  await cleanupUnconfirmed();

  assert.equal(enrollmentDestroyed, false);
  assert.equal(userDestroyed, false);
});

test('cleanupUnconfirmed swallows unexpected errors and logs them', async (t) => {
  const cleanupUnconfirmed = loadWithStubs(cleanupPath, {
    '../models': {
      User: {
        async findAll() {
          throw new Error('db unavailable');
        }
      },
      Enrollment: {},
      Course: {}
    },
    sequelize: {
      Op: { lt: Symbol('lt') }
    }
  });

  let capturedError;
  t.mock.method(console, 'error', (...args) => {
    capturedError = args;
  });

  await assert.doesNotReject(() => cleanupUnconfirmed());
  assert.equal(capturedError[0], 'CLEANUP ERROR:');
  assert.match(capturedError[1].message, /db unavailable/);
});
