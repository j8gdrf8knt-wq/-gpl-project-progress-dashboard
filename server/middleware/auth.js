const prisma = require('../lib/db');

// Loads the logged-in user (if any) onto req.user from the session, for every request.
async function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (user && user.isActive) {
      req.user = user;
    } else {
      req.session.userId = null;
    }
  }
  res.locals.user = req.user || null;
  next();
}

function hasPermission(user, key) {
  return !!user && (user.isAdmin || user.permissions.includes(key));
}

// Page routes: redirect to /login when not authenticated.
function requireLoginPage(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

function requireAdminPage(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (!req.user.isAdmin) return res.status(403).send('Admins only');
  next();
}

// API routes: JSON 401/403 instead of redirects, matching the previous Django decorators.
function requireLoginJson(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requirePermissionJson(key) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasPermission(req.user, key)) {
      return res.status(403).json({ error: "You don't have permission to do this" });
    }
    next();
  };
}

module.exports = {
  attachUser,
  hasPermission,
  requireLoginPage,
  requireAdminPage,
  requireLoginJson,
  requirePermissionJson,
};
