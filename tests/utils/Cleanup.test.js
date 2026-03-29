const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWithStubs } = require('../helpers/LoadWithStubs');

const cleanupPath = path.resolve(__dirname, '../../src/utils/Cleanup.js');

test('cleanupUnconfirmed removes expired inactive users and their enrollments', async () => {
  const lt = Symbol('lt');
  const calls = {
    enrollmentCount: null,
    enrollmentDestroy: null,
    userDestroy: null,
    notificationPayload: null
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
        async count(options) {
          calls.enrollmentCount = options;
          return 2;
        },
        async destroy(options) {
          calls.enrollmentDestroy = options;
        }
      },
      Course: {
        async findAll() {
          return [];
        }
      },
      Notification: {
        async findOne() {
          return null;
        }
      }
    },
    sequelize: {
      Op: { lt, gt: Symbol('gt'), lte: Symbol('lte'), ne: Symbol('ne') }
    },
    '../services': {
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_student_course_reminder_24h: 'true' };
        }
      },
      EmailService: {
        async sendCourseReminder24hToStudents() {
          return { attempted: 0, sent: 0 };
        }
      },
      NotificationService: {
        async createAutoClosedNotification(payload) {
          calls.notificationPayload = payload;
        }
      }
    }
  });

  await cleanupUnconfirmed();

  assert.deepEqual(calls.enrollmentCount, {
    where: { userId: [3, 7] }
  });
  assert.deepEqual(calls.enrollmentDestroy, {
    where: { userId: [3, 7] },
    force: true
  });
  assert.deepEqual(calls.userDestroy, {
    where: { id: [3, 7] }
  });
  assert.deepEqual(calls.notificationPayload, {
    removedUsers: 2,
    removedEnrollments: 2
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
        async count() {
          throw new Error('count should not be called');
        },
        async destroy() {
          enrollmentDestroyed = true;
        }
      },
      Course: {
        async findAll() {
          return [];
        }
      },
      Notification: {
        async findOne() {
          return null;
        }
      }
    },
    sequelize: {
      Op: { lt: Symbol('lt'), gt: Symbol('gt'), lte: Symbol('lte'), ne: Symbol('ne') }
    },
    '../services': {
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_student_course_reminder_24h: 'true' };
        }
      },
      EmailService: {
        async sendCourseReminder24hToStudents() {
          return { attempted: 0, sent: 0 };
        }
      },
      NotificationService: {
        async createAutoClosedNotification() {
          throw new Error('notification should not be called');
        }
      }
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
      Course: {
        async findAll() {
          return [];
        }
      },
      Notification: {
        async findOne() {
          return null;
        }
      }
    },
    sequelize: {
      Op: { lt: Symbol('lt'), gt: Symbol('gt'), lte: Symbol('lte'), ne: Symbol('ne') }
    },
    '../services': {
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_student_course_reminder_24h: 'true' };
        }
      },
      EmailService: {
        async sendCourseReminder24hToStudents() {
          return { attempted: 0, sent: 0 };
        }
      },
      NotificationService: {
        async createAutoClosedNotification() {}
      }
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
