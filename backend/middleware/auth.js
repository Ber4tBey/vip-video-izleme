const jwt = require('jsonwebtoken');

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

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.user = null;
  }

  return next();
};

module.exports = { auth, adminOnly, checkVideoToken };
