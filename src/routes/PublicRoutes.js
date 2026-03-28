const express = require('express');
const {
  PublicHandler,
  PublicCatalogHandler,
  PublicCertificateHandler,
  AdminEnrollmentHandler
} = require('../handlers');
const { authMiddleware, publicMiddleware } = require('../middleware');
const { routeHandler } = require('../lib');

const router = express.Router();

router.get('/', publicMiddleware, routeHandler(PublicHandler, 'home'));
router.get('/cursos', publicMiddleware, routeHandler(PublicHandler, 'publicCourses'));
router.get('/contato', publicMiddleware, routeHandler(PublicHandler, 'contact'));
router.get('/politica-de-privacidade', publicMiddleware, routeHandler(PublicHandler, 'privacyPolicy'));
router.get('/curso/:id', publicMiddleware, routeHandler(PublicHandler, 'courseDetails'));
router.get('/inscrever/:id', publicMiddleware, routeHandler(PublicHandler, 'enrollForm'));
router.post('/inscrever', publicMiddleware, routeHandler(PublicHandler, 'submitEnrollment'));
router.get('/obrigado', publicMiddleware, routeHandler(PublicHandler, 'thankYou'));

router.get('/loja', publicMiddleware, routeHandler(PublicCatalogHandler, 'store'));
router.get('/loja/:slug', publicMiddleware, routeHandler(PublicCatalogHandler, 'storeDetails'));
router.get('/loja/:slug/comprar', publicMiddleware, routeHandler(PublicCatalogHandler, 'redirectToAffiliate'));
router.get('/certidoes', publicMiddleware, routeHandler(PublicCatalogHandler, 'companyCertificates'));
router.get('/blog', publicMiddleware, routeHandler(PublicCatalogHandler, 'blogList'));
router.get('/blog/:slug', publicMiddleware, routeHandler(PublicCatalogHandler, 'blogDetails'));

router.get('/certificado/:code', publicMiddleware, routeHandler(PublicCertificateHandler, 'view'));
router.get('/certificado/:code/verso', publicMiddleware, routeHandler(PublicCertificateHandler, 'viewBack'));
router.get('/certificado/:code/duplex', publicMiddleware, routeHandler(PublicCertificateHandler, 'viewDuplex'));
router.get('/validar-certificado', publicMiddleware, routeHandler(PublicCertificateHandler, 'validate'));
router.post('/validar-certificado', publicMiddleware, routeHandler(PublicCertificateHandler, 'check'));

router.get('/meu-certificado/:id', authMiddleware('aluno'), routeHandler(AdminEnrollmentHandler, 'viewCertificate'));
router.get('/meu-comprovante/:id', authMiddleware('aluno'), routeHandler(AdminEnrollmentHandler, 'studentReceipt'));

module.exports = router;
