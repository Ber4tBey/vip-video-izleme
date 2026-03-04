const jwt = require('jsonwebtoken');

const verifyTokenSafely = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Gecersiz token' });
  }
};

const adminOnly = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  req.user = verifyTokenSafely(header.slice(7));
  return next();
};

/**
 * Validates token passed via query parameter (?token=...) for video requests.
 * Invalid or missing token should behave as guest for free videos.
 */
const checkVideoToken = (req, res, next) => {
  const token = req.query.token;

  if (!token) {
    req.user = null;
    return next();
  }

  req.user = verifyTokenSafely(token);

  return next();
};

module.exports = { auth, adminOnly, optionalAuth, checkVideoToken };
