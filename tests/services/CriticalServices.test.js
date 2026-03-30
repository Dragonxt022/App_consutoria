const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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
  assert.match(createdUserPayload.confirmationToken, /^[A-Za-z0-9_-]{32}$/);
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
