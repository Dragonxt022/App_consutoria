const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { generateToken } = require('../../src/middleware/Jwt');

test('generateToken signs the expected payload and options', (t) => {
  process.env.JWT_SECRET = 'jwt-secret';
  process.env.JWT_EXPIRE = '24h';

  let signArgs;
  t.mock.method(jwt, 'sign', (...args) => {
    signArgs = args;
    return 'signed-token';
  });

  const user = {
    id: 10,
    name: 'Maria',
    email: 'maria@example.com',
    role: 'admin'
  };

  const token = generateToken(user);

  assert.equal(token, 'signed-token');
  assert.deepEqual(signArgs[0], {
    id: 10,
    name: 'Maria',
    email: 'maria@example.com',
    role: 'admin',
    avatar: null
  });
  assert.equal(signArgs[1], 'jwt-secret');
  assert.deepEqual(signArgs[2], { expiresIn: '24h' });
});
