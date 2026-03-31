const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Op } = require('sequelize');

const { loadWithStubs } = require('../helpers/LoadWithStubs');

const coursePublicServicePath = path.resolve(__dirname, '../../src/services/public/CoursePublicService.js');
const studentProfileServicePath = path.resolve(__dirname, '../../src/services/student/StudentProfileService.js');
const attachmentAdminServicePath = path.resolve(__dirname, '../../src/services/admin/AttachmentAdminService.js');
const enrollmentAdminServicePath = path.resolve(__dirname, '../../src/services/admin/EnrollmentAdminService.js');

test('CoursePublicService.submitEnrollment exige autorização para criar conta', async () => {
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: {
        async findByPk() {
          throw new Error('Course.findByPk não deveria ser chamado');
        }
      },
      Enrollment: {},
      User: {
        async findByPk() {
          return null;
        },
        async findOne() {
          return null;
        }
      },
      Product: {},
      Setting: {}
    },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const result = await service.submitEnrollment({
    user: null,
    body: {
      name: 'Ana',
      email: 'ana@example.com',
      phone: '11999999999',
      company: 'Prefeitura',
      observations: '',
      courseId: '9',
      create_account: 'off'
    }
  });

  assert.equal(
    result.redirectTo,
    '/curso/9?error=Para se inscrever, você precisa autorizar a criação da sua conta.'
  );
});

test('CoursePublicService.submitEnrollment cria conta, inscrição e alerta admins', async () => {
  let createdUserPayload;
  let createdEnrollmentPayload;
  let confirmationArgs;
  let adminAlertArgs;
  let notificationArgs;

  const createdUser = { id: 41, email: 'ana@example.com' };
  const createdEnrollment = { id: 77 };
  const course = { id: 9, title: 'Governança', price: '1590,00' };

  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: {
        async findByPk(id) {
          assert.equal(id, '9');
          return course;
        }
      },
      Enrollment: {
        async create(payload) {
          createdEnrollmentPayload = payload;
          return createdEnrollment;
        }
      },
      User: {
        async findByPk() {
          return null;
        },
        async findOne({ where }) {
          assert.equal(where.email, 'ana@example.com');
          return null;
        },
        async create(payload) {
          createdUserPayload = payload;
          return createdUser;
        },
        async findAll() {
          return [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }];
        }
      },
      Product: {},
      Setting: {}
    },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../../utils/Money': {
      parseMoneyValue() {
        return 1590;
      }
    },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {
        async sendAccountConfirmation(...args) {
          confirmationArgs = args;
          return true;
        },
        async sendNewEnrollmentAlertToAdmins(args) {
          adminAlertArgs = args;
          return true;
        }
      },
      NotificationService: {
        async createEnrollmentNotification(...args) {
          notificationArgs = args;
        }
      },
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_admin_new_enrollment: 'true' };
        }
      }
    }
  });

  const result = await service.submitEnrollment({
    user: null,
    body: {
      name: 'Ana Paula',
      email: 'ana@example.com',
      phone: '11999999999',
      company: 'Prefeitura',
      observations: 'Obs',
      courseId: '9',
      create_account: 'on',
      cpfCnpj: '123',
      entePublico: '1',
      pais: 'Brasil',
      endereco: 'Rua 1',
      cidade: 'Manaus',
      estado: 'AM',
      cep: '69000-000'
    }
  });

  assert.equal(result.redirectTo, '/obrigado');
  assert.equal(createdUserPayload.name, 'Ana Paula');
  assert.equal(createdUserPayload.role, 'aluno');
  assert.equal(createdUserPayload.active, false);
  assert.match(createdUserPayload.confirmationToken, /^[A-Za-z0-9_~-]{32}$/);
  assert.equal(createdEnrollmentPayload.userId, 41);
  assert.equal(createdEnrollmentPayload.courseId, '9');
  assert.equal(createdEnrollmentPayload.status, 'pendente');
  assert.equal(createdEnrollmentPayload.coursePrice, 1590);
  assert.equal(createdEnrollmentPayload.finalPrice, 1590);
  assert.equal(confirmationArgs[0], createdUser);
  assert.match(confirmationArgs[1], /^[A-Za-z0-9]{10}$/);
  assert.equal(confirmationArgs[2], `https://app.test/confirmar-conta/${createdUserPayload.confirmationToken}`);
  assert.deepEqual(notificationArgs, [createdEnrollment, course]);
  assert.deepEqual(adminAlertArgs.adminRecipients, ['admin1@example.com', 'admin2@example.com']);
  assert.equal(adminAlertArgs.manageUrl, 'https://app.test/admin/inscricoes/77/editar');
});

test('StudentProfileService.getStudentEnrollments injeta status do curso e flag de anexo', async () => {
  const courseDataValues = {};
  const enrollmentDataValues = {};
  const enrollment = {
    status: 'confirmado',
    enrollmentAttachmentPath: 'enrollment-documents/doc.pdf',
    Course: {
      toJSON() {
        return { title: 'Curso 1' };
      },
      setDataValue(key, value) {
        courseDataValues[key] = value;
      }
    },
    setDataValue(key, value) {
      enrollmentDataValues[key] = value;
    }
  };

  const service = loadWithStubs(studentProfileServicePath, {
    '../../models': {
      User: {},
      Enrollment: {
        async findAll(options) {
          assert.equal(options.where.userId, 9);
          return [enrollment];
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {},
      getPrivateStoragePath() {}
    },
    '../../utils/CourseStatus': {
      resolveCourseStatus() {
        return { code: 'confirmado', label: 'Confirmado', isExpired: false };
      }
    },
    '../../utils/Url': {
      buildAppUrl() {
        return '';
      }
    },
    '../shared': {
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const enrollments = await service.getStudentEnrollments(9);

  assert.equal(enrollments.length, 1);
  assert.deepEqual(courseDataValues, {
    statusCode: 'confirmado',
    statusLabel: 'Confirmado',
    isExpired: false
  });
  assert.equal(enrollmentDataValues.hasEnrollmentAttachment, true);
});

test('StudentProfileService.uploadEnrollmentAttachment substitui anexo anterior e notifica admins', async (t) => {
  let saved = false;
  let notificationPayload;
  let emailPayload;

  const enrollment = {
    id: 12,
    enrollmentAttachmentPath: 'enrollment-documents/old.pdf',
    Course: { title: 'Curso X' },
    async save() {
      saved = true;
    }
  };

  const service = loadWithStubs(studentProfileServicePath, {
    '../../models': {
      User: {
        async findAll() {
          return [{ email: 'admin@example.com' }];
        }
      },
      Enrollment: {
        async findOne({ where }) {
          assert.equal(where.id, 12);
          assert.equal(where.userId, 4);
          return enrollment;
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {},
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/CourseStatus': {
      resolveCourseStatus() {
        return { code: 'ativo', label: 'Ativo', isExpired: false };
      }
    },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../shared': {
      NotificationService: {
        async createEnrollmentAttachmentReceivedNotification(payload) {
          notificationPayload = payload;
        }
      },
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_admin_enrollment_attachment_received: 'true' };
        }
      },
      EmailService: {
        async sendEnrollmentAttachmentReceivedToAdmins(payload) {
          emailPayload = payload;
        }
      }
    }
  });

  t.mock.method(service, 'removeEnrollmentAttachmentIfNeeded', (previousPath) => {
    assert.equal(previousPath, 'enrollment-documents/old.pdf');
  });

  const result = await service.uploadEnrollmentAttachment(
    4,
    12,
    {
      filename: 'novo.pdf',
      originalname: 'comprovante.pdf',
      mimetype: 'application/pdf',
      size: 98765
    },
    {}
  );

  assert.equal(result.notFound, false);
  assert.equal(saved, true);
  assert.equal(enrollment.enrollmentAttachmentPath, path.join('enrollment-documents', 'novo.pdf'));
  assert.equal(enrollment.enrollmentAttachmentOriginalName, 'comprovante.pdf');
  assert.equal(notificationPayload.enrollment, enrollment);
  assert.equal(emailPayload.adminRecipients[0], 'admin@example.com');
  assert.equal(emailPayload.manageUrl, 'https://app.test/admin/inscricoes/12/editar');
});

test('StudentProfileService.getEnrollmentAttachmentDownloadData retorna arquivo existente para download', async () => {
  const enrollment = {
    enrollmentAttachmentPath: 'enrollment-documents/doc.pdf',
    enrollmentAttachmentOriginalName: 'nota.pdf'
  };

  const service = loadWithStubs(studentProfileServicePath, {
    fs: {
      existsSync(targetPath) {
        assert.equal(targetPath, '/private/enrollment-documents/doc.pdf');
        return true;
      }
    },
    '../../models': {
      User: {},
      Enrollment: {
        async findOne({ where }) {
          assert.equal(where.id, 13);
          assert.equal(where.userId, 4);
          return enrollment;
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {},
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/CourseStatus': {
      resolveCourseStatus() {
        return { code: 'ativo', label: 'Ativo', isExpired: false };
      }
    },
    '../../utils/Url': {
      buildAppUrl() {
        return '';
      }
    },
    '../shared': {
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const result = await service.getEnrollmentAttachmentDownloadData(4, 13);

  assert.equal(result.path, '/private/enrollment-documents/doc.pdf');
  assert.equal(result.filename, 'nota.pdf');
});

test('AttachmentAdminService.createAttachment cria anexo por curso e envia aviso aos inscritos elegíveis', async () => {
  let createdPayload;
  let emailPayload;

  const service = loadWithStubs(attachmentAdminServicePath, {
    '../../models': {
      Attachment: {
        async create(payload) {
          createdPayload = payload;
          return { id: 91 };
        }
      },
      Course: {
        async findByPk(id) {
          assert.equal(id, 7);
          return { id: 7, title: 'Curso' };
        }
      },
      User: {},
      Enrollment: {
        async findAll({ where }) {
          assert.equal(where.courseId, 7);
          assert.equal(where.status, 'confirmado');
          return [{ student: { email: 'ana@example.com' } }, { student: { email: 'bruno@example.com' } }];
        }
      }
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {
        return '/tmp/file';
      }
    },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../shared': {
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_student_new_attachment_available: 'true' };
        }
      },
      EmailService: {
        async sendNewAttachmentAvailableToStudents(payload) {
          emailPayload = payload;
        }
      }
    }
  });

  const result = await service.createAttachment({
    user: { id: 3 },
    body: {
      title: 'Material complementar',
      description: 'Leitura',
      visibilityType: 'course',
      courseId: '7',
      requiredEnrollmentStatus: 'confirmado'
    },
    files: [
      { filename: 'a.pdf', originalname: 'A.pdf', mimetype: 'application/pdf', size: 1000, path: '/tmp/a.pdf' },
      { filename: 'b.pdf', originalname: 'B.pdf', mimetype: 'application/pdf', size: 2000, path: '/tmp/b.pdf' }
    ]
  });

  assert.deepEqual(result, { success: true });
  assert.equal(createdPayload.title, 'Material complementar');
  assert.equal(createdPayload.courseId, 7);
  assert.equal(createdPayload.createdBy, 3);
  assert.equal(createdPayload.fileSize, 3000);
  assert.match(createdPayload.filesJson, /a\.pdf/);
  assert.deepEqual(emailPayload.recipients, ['ana@example.com', 'bruno@example.com']);
  assert.equal(emailPayload.detailsUrl, 'https://app.test/meus-arquivos/91');
});

test('AttachmentAdminService.deleteAttachment remove arquivos e apaga o registro', async (t) => {
  let destroyed = false;
  const attachment = {
    toJSON() {
      return {
        filesJson: JSON.stringify([
          { fileUrl: '/uploads/attachments/a.pdf' },
          { fileUrl: '/uploads/attachments/b.pdf' }
        ])
      };
    },
    async destroy() {
      destroyed = true;
    }
  };

  const service = loadWithStubs(attachmentAdminServicePath, {
    '../../models': {
      Attachment: {
        async findByPk(id) {
          assert.equal(id, 8);
          return attachment;
        }
      },
      Course: {},
      User: {},
      Enrollment: {}
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {
        return '/tmp/file';
      }
    },
    '../../utils/Url': {
      buildAppUrl() {
        return '';
      }
    },
    '../shared': {
      SiteSettingsService: {},
      EmailService: {}
    }
  });

  const removed = [];
  t.mock.method(service, 'removeFileIfExists', (fileUrl) => removed.push(fileUrl));

  const result = await service.deleteAttachment(8);

  assert.deepEqual(result, { notFound: false });
  assert.deepEqual(removed, ['/uploads/attachments/a.pdf', '/uploads/attachments/b.pdf']);
  assert.equal(destroyed, true);
});

test('EnrollmentAdminService.updateStatus gera certificado ao concluir e aciona comunicação', async (t) => {
  let saved = false;
  const enrollment = {
    id: 14,
    status: 'confirmado',
    studentName: 'Ana',
    certificateCode: null,
    certificateJson: null,
    async save() {
      saved = true;
    },
    async getCourse() {
      return { title: 'Curso Y', workload: 16 };
    }
  };

  const service = loadWithStubs(enrollmentAdminServicePath, {
    '../../models': {
      Enrollment: {
        async findByPk(id) {
          assert.equal(id, 14);
          return enrollment;
        }
      },
      Course: {}
    },
    '../../utils/Money': {
      parseMoneyValue(value) {
        return Number(value);
      }
    },
    '../../utils/UploadPaths': {
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../shared': {
      SiteSettingsService: {},
      EmailService: {}
    }
  });

  let handledPayload;
  t.mock.method(service, 'handleEnrollmentStatusEmails', async (payload) => {
    handledPayload = payload;
  });

  const result = await service.updateStatus(14, 'completo', {});

  assert.deepEqual(result, { notFound: false });
  assert.equal(saved, true);
  assert.equal(enrollment.status, 'completo');
  assert.match(enrollment.certificateCode, /^[A-F0-9]{4}-[A-F0-9]{4}$/);
  assert.equal(enrollment.certificateJson.studentName, 'Ana');
  assert.equal(enrollment.certificateJson.courseTitle, 'Curso Y');
  assert.equal(handledPayload.previousStatus, 'confirmado');
  assert.equal(handledPayload.nextStatus, 'completo');
});

test('EnrollmentAdminService.deleteEnrollment remove anexo privado antes de excluir', async (t) => {
  let destroyed = false;
  const enrollment = {
    enrollmentAttachmentPath: 'enrollment-documents/doc.pdf',
    async destroy() {
      destroyed = true;
    }
  };

  const service = loadWithStubs(enrollmentAdminServicePath, {
    '../../models': {
      Enrollment: {
        async findByPk(id) {
          assert.equal(id, 55);
          return enrollment;
        }
      },
      Course: {}
    },
    '../../utils/Money': {
      parseMoneyValue(value) {
        return Number(value);
      }
    },
    '../../utils/UploadPaths': {
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/Url': {
      buildAppUrl() {
        return '';
      }
    },
    '../shared': {
      SiteSettingsService: {},
      EmailService: {}
    }
  });

  let removedPath;
  t.mock.method(service, 'removeEnrollmentAttachmentIfNeeded', (targetPath) => {
    removedPath = targetPath;
  });

  const result = await service.deleteEnrollment(55);

  assert.deepEqual(result, { notFound: false });
  assert.equal(removedPath, 'enrollment-documents/doc.pdf');
  assert.equal(destroyed, true);
});

test('CoursePublicService.generateUniqueSlug incrementa slug até encontrar valor livre', async () => {
  const checkedSlugs = [];
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: {
        async findOne({ where }) {
          checkedSlugs.push(where.slug);
          return where.slug === 'curso-teste' || where.slug === 'curso-teste-2' ? { id: 1 } : null;
        }
      },
      Enrollment: {},
      User: {},
      Product: {},
      Setting: {}
    },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const slug = await service.generateUniqueSlug('Curso Teste');

  assert.equal(slug, 'curso-teste-3');
  assert.deepEqual(checkedSlugs, ['curso-teste', 'curso-teste-2', 'curso-teste-3']);
});

test('CoursePublicService normalize e extrai conteúdos do verso do certificado', () => {
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': { Course: {}, Enrollment: {}, User: {}, Product: {}, Setting: {} },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const payload = service.normalizeCertificateTopicsPayload('', '<p>Modulo 1</p><script>alert(1)</script><p>Modulo 2</p>');
  const extracted = service.extractCertificateTopicsData({ certificateTopics: payload });

  assert.equal(payload.mode, 'rich');
  assert.equal(payload.html.includes('<script>'), false);
  assert.deepEqual(payload.items, ['Modulo 1', 'Modulo 2']);
  assert.deepEqual(extracted, { html: '<p>Modulo 1</p><p>Modulo 2</p>', items: ['Modulo 1', 'Modulo 2'] });
});

test('CoursePublicService.getPublicCourseDetails inclui ofertas da loja quando configuração está ativa', async () => {
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: {
        async findOne() {
          return {
            toJSON() {
              return {
                id: 1,
                title: 'Curso',
                price: '1000',
                description: '<p>Descricao</p>',
                certificateTopics: ['Topico'],
                active: true
              };
            }
          };
        }
      },
      Enrollment: {},
      User: {},
      Product: {
        async findAll() {
          return [{ id: 10, name: 'Produto' }];
        }
      },
      Setting: {
        async findOne() {
          return { value: 'true' };
        }
      }
    },
    '../../utils/Money': { parseMoneyValue() { return 1000; } },
    '../../utils/CurrencyFormatter': { formatCurrency() { return 'R$ 1.000,00'; } },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() { return ''; } },
    '../../utils/CourseStatus': { resolveCourseStatus() { return { code: 'ativo', label: 'Ativo', isExpired: false }; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return { ...product, formatted: true }; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const result = await service.getPublicCourseDetails(1);

  assert.equal(result.showCourseStoreOffers, true);
  assert.equal(result.course.statusLabel, 'Ativo');
  assert.deepEqual(result.courseStoreOffers, [{ id: 10, name: 'Produto', formatted: true }]);
});

test('CoursePublicService.getEnrollmentFormData retorna null para curso encerrado', async () => {
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: {
        async findOne() {
          return { startDate: '2020-01-01' };
        }
      },
      Enrollment: {},
      User: {},
      Product: {},
      Setting: {}
    },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const result = await service.getEnrollmentFormData(1, { id: 2 });
  assert.equal(result, null);
});

test('CoursePublicService.submitEnrollment retorna erro quando curso não existe', async () => {
  const service = loadWithStubs(coursePublicServicePath, {
    '../../models': {
      Course: { async findByPk() { return null; } },
      Enrollment: {},
      User: {
        async findByPk() {
          return { id: 5 };
        }
      },
      Product: {},
      Setting: {}
    },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': {
      ProductFormatter: { formatProduct(product) { return product; } },
      EmailService: {},
      NotificationService: {},
      SiteSettingsService: {}
    }
  });

  const result = await service.submitEnrollment({
    user: { id: 5 },
    body: {
      name: 'Ana',
      email: 'ana@example.com',
      phone: '11',
      company: 'Org',
      observations: '',
      courseId: '99'
    }
  });

  assert.equal(result.redirectTo, '/?error=Curso não encontrado');
});

test('StudentProfileService.getProfileData e changePassword cobrem caminhos principais', async () => {
  let savedPassword;
  const user = {
    id: 3,
    async checkPassword(password) {
      return password === 'atual-correta';
    },
    async save() {
      savedPassword = this.password;
    }
  };

  const service = loadWithStubs(studentProfileServicePath, {
    '../../models': {
      User: {
        async findByPk(id) {
          return id === 99 ? null : user;
        }
      },
      Enrollment: {
        async findAll() {
          return [{ status: 'completo', setDataValue() {}, Course: null }, { status: 'pendente', setDataValue() {}, Course: null }];
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() {}, getPrivateStoragePath() {} },
    '../../utils/CourseStatus': { resolveCourseStatus() { return { code: 'ativo', label: 'Ativo', isExpired: false }; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { EmailService: {}, NotificationService: {}, SiteSettingsService: {} }
  });

  const missing = await service.getProfileData(99);
  const profile = await service.getProfileData(3);
  const wrongCurrent = await service.changePassword(3, { currentPassword: 'errada', newPassword: '123456', confirmPassword: '123456' });
  const mismatch = await service.changePassword(3, { currentPassword: 'atual-correta', newPassword: '123456', confirmPassword: '000000' });
  const success = await service.changePassword(3, { currentPassword: 'atual-correta', newPassword: '123456', confirmPassword: '123456' });

  assert.equal(missing, null);
  assert.equal(profile.stats.totalCourses, 2);
  assert.equal(profile.stats.totalCertificates, 1);
  assert.equal(wrongCurrent.error, 'Senha atual incorreta');
  assert.equal(mismatch.error, 'As senhas não coincidem');
  assert.equal(success.notFound, false);
  assert.equal(savedPassword, '123456');
});

test('StudentProfileService.updateAvatar e getEnrollmentAttachmentPageData tratam remoção e ausência', async (t) => {
  let saved = false;
  const user = {
    avatar: '/uploads/avatars/old.png',
    async save() {
      saved = true;
    }
  };

  const service = loadWithStubs(studentProfileServicePath, {
    '../../models': {
      User: {
        async findByPk(id) {
          return id === 8 ? null : user;
        }
      },
      Enrollment: {
        async findOne({ where }) {
          return where.id === 1 ? { id: 1, Course: { title: 'Curso' } } : null;
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() {}, getPrivateStoragePath() {} },
    '../../utils/CourseStatus': { resolveCourseStatus() { return { code: 'ativo', label: 'Ativo', isExpired: false }; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { EmailService: {}, NotificationService: {}, SiteSettingsService: {} }
  });

  let removedAvatar;
  t.mock.method(service, 'removeAvatarIfNeeded', (avatar) => {
    removedAvatar = avatar;
  });

  const updated = await service.updateAvatar(7, { filename: 'new.png' });
  const missingPage = await service.getEnrollmentAttachmentPageData(8, 1);
  const existingPage = await service.getEnrollmentAttachmentPageData(7, 1);

  assert.equal(updated.avatar, '/uploads/avatars/new.png');
  assert.equal(saved, true);
  assert.equal(removedAvatar, '/uploads/avatars/old.png');
  assert.equal(missingPage, null);
  assert.equal(existingPage.enrollment.id, 1);
});

test('StudentProfileService lida com ausência de arquivo no upload e download', async () => {
  const service = loadWithStubs(studentProfileServicePath, {
    fs: {
      existsSync() {
        return false;
      }
    },
    '../../models': {
      User: {
        async findByPk() {
          return { id: 4 };
        }
      },
      Enrollment: {
        async findOne({ where }) {
          if (where.id === 1) {
            return { id: 1, Course: { title: 'Curso' } };
          }

          return {
            id: 2,
            enrollmentAttachmentPath: 'enrollment-documents/file.pdf',
            Course: { title: 'Curso' }
          };
        }
      },
      Course: {}
    },
    '../../utils/UploadPaths': {
      resolveUploadUrlToPath() {},
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/CourseStatus': { resolveCourseStatus() { return { code: 'ativo', label: 'Ativo', isExpired: false }; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { EmailService: {}, NotificationService: {}, SiteSettingsService: {} }
  });

  const uploadResult = await service.uploadEnrollmentAttachment(4, 1, null, {});
  const downloadResult = await service.getEnrollmentAttachmentDownloadData(4, 2);

  assert.equal(uploadResult.error, 'Selecione um arquivo para enviar.');
  assert.equal(downloadResult, null);
});

test('AttachmentAdminService utilitários de validação e mapeamento funcionam corretamente', async () => {
  const service = loadWithStubs(attachmentAdminServicePath, {
    '../../models': { Attachment: {}, Course: {}, User: {}, Enrollment: {} },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() { return ''; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { SiteSettingsService: {}, EmailService: {} }
  });

  const fallbackFiles = service.getAttachmentFiles({
    fileUrl: '/uploads/attachments/a.pdf',
    originalName: 'A.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024
  });
  const mapped = service.mapAttachmentRecord({
    visibilityType: 'course',
    requiredEnrollmentStatus: 'confirmado',
    toJSON() {
      return {
        id: 1,
        visibilityType: 'course',
        requiredEnrollmentStatus: 'confirmado',
        filesJson: JSON.stringify([
          { fileUrl: '/uploads/attachments/a.pdf', originalName: 'A.pdf', fileSize: 1024 },
          { fileUrl: '/uploads/attachments/b.pdf', originalName: 'B.pdf', fileSize: 1024 }
        ])
      };
    }
  });

  assert.deepEqual(fallbackFiles, [{
    fileUrl: '/uploads/attachments/a.pdf',
    originalName: 'A.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024
  }]);
  assert.equal(service.validatePayload({ title: '', visibilityType: 'course' }, []), 'Informe um nome para o anexo.');
  assert.equal(service.validatePayload({ title: 'Teste', visibilityType: 'course', courseId: '1' }, [{ name: 'a' }]), 'Defina o status necessário para o aluno visualizar o anexo.');
  assert.equal(mapped.fileCount, 2);
  assert.equal(mapped.fileSizeLabel, '2.0 KB');
  assert.equal(mapped.requiredEnrollmentStatusLabel, 'Inscrição confirmada');
});

test('AttachmentAdminService.getListData normaliza filtros e createAttachment valida usuário específico', async () => {
  const service = loadWithStubs(attachmentAdminServicePath, {
    '../../models': {
      Attachment: {
        async findAll({ where }) {
          assert.equal(where.visibilityType, 'user');
          assert.equal(where.userId, 5);
          assert.equal(where[Op.or].length, 3);
          return [];
        }
      },
      Course: {
        async findAll() {
          return [{ id: 1, title: 'Curso' }];
        }
      },
      User: {
        async findAll() {
          return [{ id: 5, name: 'Ana', email: 'ana@example.com' }];
        },
        async findOne() {
          return null;
        }
      },
      Enrollment: {}
    },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() { return ''; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { SiteSettingsService: {}, EmailService: {} }
  });

  const listData = await service.getListData({
    visibilityType: 'user',
    userId: '5',
    search: 'Ana'
  });
  const result = await service.createAttachment({
    user: { id: 3 },
    body: {
      title: 'Arquivo',
      visibilityType: 'user',
      userId: '5'
    },
    files: [{ filename: 'a.pdf', originalname: 'A.pdf', mimetype: 'application/pdf', size: 100, path: '/tmp/a.pdf' }]
  });

  assert.equal(listData.filters.visibilityType, 'user');
  assert.equal(listData.students.length, 1);
  assert.equal(result.error, 'Usuário não encontrado para receber o anexo.');
});

test('AttachmentAdminService.createAttachment aceita envio para usuário específico', async () => {
  let createdPayload;
  let emailPayload;
  const service = loadWithStubs(attachmentAdminServicePath, {
    '../../models': {
      Attachment: {
        async create(payload) {
          createdPayload = payload;
          return { id: 51 };
        }
      },
      Course: {},
      User: {
        async findOne() {
          return { id: 8, role: 'aluno' };
        },
        async findByPk() {
          return { email: 'aluno@example.com' };
        }
      },
      Enrollment: {}
    },
    '../../utils/UploadPaths': { resolveUploadUrlToPath() { return ''; } },
    '../../utils/Url': {
      buildAppUrl(_req, targetPath) {
        return `https://app.test${targetPath}`;
      }
    },
    '../shared': {
      SiteSettingsService: {
        async getSettings() {
          return { email_notify_student_new_attachment_available: 'true' };
        }
      },
      EmailService: {
        async sendNewAttachmentAvailableToStudents(payload) {
          emailPayload = payload;
        }
      }
    }
  });

  const result = await service.createAttachment({
    user: { id: 3 },
    body: {
      title: 'Arquivo direto',
      visibilityType: 'user',
      userId: '8'
    },
    files: [{ filename: 'a.pdf', originalname: 'A.pdf', mimetype: 'application/pdf', size: 100, path: '/tmp/a.pdf' }]
  });

  assert.deepEqual(result, { success: true });
  assert.equal(createdPayload.userId, 8);
  assert.deepEqual(emailPayload.recipients, ['aluno@example.com']);
});

test('EnrollmentAdminService filtros, listagem e exportação seguem query informada', async () => {
  const service = loadWithStubs(enrollmentAdminServicePath, {
    '../../models': {
      Enrollment: {
        async findAndCountAll({ where, limit, offset }) {
          assert.equal(where.status, 'confirmado');
          assert.equal(where.courseId, '9');
          assert.equal(limit, 10);
          assert.equal(offset, 10);
          return { count: 12, rows: [{ id: 1 }] };
        },
        async findAll({ where }) {
          assert.equal(where[Op.or].length, 3);
          return [{
            studentName: 'Ana',
            studentEmail: 'ana@example.com',
            studentPhone: '11',
            company: 'Org',
            createdAt: new Date('2026-03-29T00:00:00Z'),
            status: 'confirmado',
            Course: { title: 'Curso', location: 'Manaus' }
          }];
        }
      },
      Course: {}
    },
    '../../utils/Money': { parseMoneyValue(value) { return Number(value); } },
    '../../utils/UploadPaths': { getPrivateStoragePath(relativePath) { return `/private/${relativePath}`; } },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { SiteSettingsService: {}, EmailService: {} }
  });

  const listData = await service.getAdminListData({ page: '2', search: 'Ana', status: 'confirmado', courseId: '9' });
  const exportData = await service.exportAdminList('Ana');

  assert.equal(listData.pagination.currentPage, 2);
  assert.equal(listData.pagination.totalPages, 2);
  assert.equal(listData.filters.courseId, '9');
  assert.match(exportData.csvContent, /"Ana";"ana@example\.com"/);
  assert.equal(exportData.fileSuffix, '-filtrado');
});

test('EnrollmentAdminService cobre central de certificados e acessos auxiliares', async () => {
  let saved = false;
  const incompleteEnrollment = {
    status: 'completo',
    certificateCode: null,
    certificateJson: null,
    async getCourse() {
      return { title: 'Curso', workload: 8 };
    },
    async save() {
      saved = true;
    }
  };

  const service = loadWithStubs(enrollmentAdminServicePath, {
    fs: {
      existsSync(targetPath) {
        return targetPath === '/private/enrollment-documents/doc.pdf';
      }
    },
    '../../models': {
      Enrollment: {
        async findOne({ where }) {
          if (where.id === 100) return incompleteEnrollment;
          if (where.id === 101) return null;
          if (where.id === 102) return { id: 102, userId: 9, Course: { title: 'Curso' } };
          return { id: where.id, enrollmentAttachmentPath: 'enrollment-documents/doc.pdf', enrollmentAttachmentOriginalName: 'doc.pdf', Course: { title: 'Curso' } };
        },
        async findByPk(id, options) {
          if (id === 50) {
            return {
              id: 50,
              enrollmentAttachmentPath: 'enrollment-documents/doc.pdf',
              enrollmentAttachmentOriginalName: 'doc.pdf',
              Course: { title: 'Curso' }
            };
          }

          if (id === 60) {
            return {
              id: 60,
              Course: { title: 'Curso' }
            };
          }

          if (id === 102) {
            return {
              id: 102,
              userId: 9,
              Course: { title: 'Curso' }
            };
          }

          return null;
        }
      },
      Course: {
        async findAll() {
          return [
            {
              toJSON() {
                return { id: 1, title: 'Curso A' };
              },
              Enrollments: [
                { status: 'confirmado', certificateCode: null, studentName: 'Ana' },
                { status: 'completo', certificateCode: 'ABC', studentName: 'Bruno' }
              ]
            }
          ];
        }
      }
    },
    '../../utils/Money': { parseMoneyValue(value) { return Number(value || 0); } },
    '../../utils/UploadPaths': {
      getPrivateStoragePath(relativePath) {
        return `/private/${relativePath}`;
      }
    },
    '../../utils/Url': { buildAppUrl() { return ''; } },
    '../shared': { SiteSettingsService: {}, EmailService: {} }
  });

  const certificates = await service.getCertificatesPageData({ operationalStatus: 'aptos' });
  const access = await service.resolveCertificateAccess(100, { role: 'aluno', id: 1 });
  const missingAccess = await service.resolveCertificateAccess(101, { role: 'aluno', id: 1 });
  const receipt = await service.getReceiptData(102, { role: 'aluno', id: 10 });
  const studentReceipt = await service.getStudentReceiptData(102, 9);
  const attachment = await service.getEnrollmentAttachmentForAdmin(50);
  const editData = await service.getEnrollmentForEdit(60);

  assert.equal(certificates.courses.length, 1);
  assert.equal(certificates.courses[0].operationalStatus, 'aptos');
  assert.equal(access.unavailable, false);
  assert.match(access.redirectTo, /^\/certificado\//);
  assert.equal(saved, true);
  assert.equal(missingAccess.unavailable, true);
  assert.equal(receipt.forbidden, true);
  assert.equal(studentReceipt.back_url, '/aluno/dashboard');
  assert.equal(attachment.path, '/private/enrollment-documents/doc.pdf');
  assert.equal(editData.attachment, null);
});
