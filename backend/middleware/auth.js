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
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

const adminOnly = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    next();
  });
};

/**
 * Validates token passed via query parameter (?token=...) 
 * specifically for video stream requests where Auth headers cannot be sent natively by the <video> tag.
 */
const checkVideoToken = (req, res, next) => {
  const token = req.query.token;
  // If no token, we set req.user to null and proceed (to allow free videos if applicable)
  // or you could block it outright if ALL videos require login. Assuming free videos exist:
  if (!token) {
    req.user = null;
    return next();
  }
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // If token is invalid, we might still want to proceed as a guest (for free videos), 
    // or block. Let's block if a token was provided but invalid to prevent tampering.
    return res.status(401).json({ error: 'Geçersiz token.' });
  }
};

module.exports = { auth, adminOnly, checkVideoToken };
