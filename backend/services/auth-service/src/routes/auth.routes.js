const express = require('express');
const controller = require('../controllers/auth.controller');
const { requireAuth, requireRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/customer/phone-otp/request', controller.requestPhoneLoginOtp);
router.post('/customer/phone-otp/verify', controller.verifyPhoneLoginOtp);
router.post('/customer/phone-signup/request', controller.requestPhoneSignupOtp);
router.post('/customer/phone-signup/verify', controller.verifyPhoneSignupOtp);
router.post('/refresh', controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.post('/logout-all', requireAuth, controller.logoutAll);
router.get('/me', requireAuth, controller.me);
router.get('/sessions', requireAuth, controller.sessions);
router.delete('/sessions/:id', requireAuth, controller.revokeSession);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/verify-email', controller.verifyEmail);
router.post('/verify-phone', controller.verifyPhone);
router.post('/mfa/setup', requireAuth, controller.mfaSetup);
router.post('/mfa/confirm', requireAuth, controller.mfaVerify);
router.post('/mfa/challenge', controller.mfaChallenge);
router.post('/mfa/disable', requireAuth, controller.mfaDisable);
router.get('/menu', requireAuth, controller.menu);
router.get('/menu-debug', requireAuth, controller.menuDebug);
router.get('/users', requireAuth, requireRoles('SUPER_ADMIN'), controller.listUsers);

module.exports = router;
