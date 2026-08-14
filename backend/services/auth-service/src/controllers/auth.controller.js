const authService = require('../services/auth.service');

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.requestPhoneLoginOtp = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await authService.requestPhoneLoginOtp(req.body)) }); }
  catch (error) { next(error); }
};

exports.verifyPhoneLoginOtp = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await authService.verifyPhoneLoginOtp(req.body)) }); }
  catch (error) { next(error); }
};

exports.requestPhoneSignupOtp = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await authService.requestPhoneSignupOtp(req.body)) }); }
  catch (error) { next(error); }
};

exports.verifyPhoneSignupOtp = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await authService.verifyPhoneSignupOtp(req.body)) }); }
  catch (error) { next(error); }
};

exports.refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await authService.logout(req.auth.userId, req.auth.sessionId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.auth.userId, req.auth.sessionId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await authService.me(req.auth.userId);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.auth.userId, req.body || {});
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
exports.sessions = async (req, res, next) => {
  try {
    const result = await authService.sessions(req.auth.userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const result = await authService.revokeSession(req.auth.userId, req.params.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.verifyPhone = async (req, res, next) => {
  try {
    const result = await authService.verifyPhone(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.mfaSetup = async (req, res, next) => {
  try {
    const result = await authService.mfaSetup(req.auth.userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.mfaVerify = async (req, res, next) => {
  try {
    const result = await authService.mfaVerify(req.auth.userId, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.mfaChallenge = async (req, res, next) => {
  try {
    const result = await authService.mfaChallenge(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.mfaDisable = async (req, res, next) => {
  try {
    const result = await authService.mfaDisable(req.auth.userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const result = await authService.listUsers(req.query);
    res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.menu = async (req, res, next) => {
  try {
    const menu = await authService.menu(req.auth.roleCodes?.[0] || req.auth.role);
    res.status(200).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
};

exports.menuDebug = async (req, res, next) => {
  try {
    const debug = await authService.menuDebug(req.auth.roleCodes?.[0] || req.auth.role);
    res.status(200).json({
      success: true,
      role: req.auth.role,
      userId: req.auth.userId,
      debug,
    });
  } catch (error) {
    next(error);
  }
};
