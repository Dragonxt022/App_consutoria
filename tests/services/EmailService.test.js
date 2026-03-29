const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadWithStubs } = require('../helpers/LoadWithStubs');

const emailServicePath = path.resolve(__dirname, '../../src/services/shared/EmailService.js');

test('sendEmail skips delivery when SMTP is not configured', async () => {
  let transporterCreated = false;

  const emailService = loadWithStubs(emailServicePath, {
    './SiteSettingsService': {
      getSettings: async () => ({ smtp_user: '', site_name: 'ConsultPro' })
    },
    nodemailer: {
      createTransport() {
        transporterCreated = true;
        return {};
      }
    }
  });

  const sent = await emailService.sendEmail('user@example.com', 'Assunto', '<p>Teste</p>');

  assert.equal(sent, false);
  assert.equal(transporterCreated, false);
});

test('sendEmail creates the transporter with settings and dispatches the email', async () => {
  const sentMessages = [];
  let transportConfig;

  const emailService = loadWithStubs(emailServicePath, {
    './SiteSettingsService': {
      getSettings: async () => ({
        smtp_host: 'smtp.example.com',
        smtp_port: '465',
        smtp_user: 'mailer',
        smtp_pass: 'secret',
        smtp_from: 'noreply@example.com',
        site_name: 'ConsultPro'
      })
    },
    nodemailer: {
      createTransport(config) {
        transportConfig = config;
        return {
          async sendMail(message) {
            sentMessages.push(message);
          }
        };
      }
    }
  });

  const sent = await emailService.sendEmail('user@example.com', 'Assunto', '<p>Teste</p>');

  assert.equal(sent, true);
  assert.deepEqual(transportConfig, {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: {
      user: 'mailer',
      pass: 'secret'
    }
  });
  assert.deepEqual(sentMessages[0], {
    from: '"ConsultPro" <noreply@example.com>',
    to: 'user@example.com',
    subject: 'Assunto',
    html: '<p>Teste</p>'
  });
});

test('sendEmail returns false when the transport throws an error', async () => {
  const emailService = loadWithStubs(emailServicePath, {
    './SiteSettingsService': {
      getSettings: async () => ({
        smtp_host: 'smtp.example.com',
        smtp_port: '587',
        smtp_user: 'mailer',
        smtp_pass: 'secret',
        smtp_from: 'noreply@example.com',
        site_name: 'ConsultPro'
      })
    },
    nodemailer: {
      createTransport() {
        return {
          async sendMail() {
            throw new Error('smtp down');
          }
        };
      }
    }
  });

  const sent = await emailService.sendEmail('user@example.com', 'Assunto', '<p>Teste</p>');

  assert.equal(sent, false);
});

test('sendAccountConfirmation delegates to sendEmail with the expected content', async (t) => {
  const emailService = loadWithStubs(emailServicePath, {
    './SiteSettingsService': {
      getSettings: async () => ({})
    },
    nodemailer: {
      createTransport() {
        return {
          async sendMail() {}
        };
      }
    }
  });

  let capturedArgs;
  t.mock.method(emailService, 'sendEmail', async (...args) => {
    capturedArgs = args;
    return true;
  });

  const user = { name: 'Maria', email: 'maria@example.com' };
  const result = await emailService.sendAccountConfirmation(user, 'Senha123', 'https://example.com/ativar');

  assert.equal(result, true);
  assert.equal(capturedArgs[0], 'maria@example.com');
  assert.match(capturedArgs[1], /Confirma/);
  assert.match(capturedArgs[2], /Senha123/);
  assert.match(capturedArgs[2], /https:\/\/example\.com\/ativar/);
});
