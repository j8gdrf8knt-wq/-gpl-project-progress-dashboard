const { doubleCsrf } = require('csrf-csrf');

// Configured to match what dashboard/static/dashboard/js/helpers.js::apiFetch already sends
// (a `csrftoken` cookie readable by JS, echoed back as the `X-CSRFToken` header) so the
// existing frontend code needs zero changes.
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  getSessionIdentifier: (req) => req.session.id,
  cookieName: 'csrftoken',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: false,
    httpOnly: false,
  },
  // fetch()-based API calls send it as a header; plain HTML forms (login/signup/manage-users)
  // send it as a hidden field — both are validated the same way against the session-bound cookie.
  getCsrfTokenFromRequest: (req) => req.headers['x-csrftoken'] || req.body.csrfToken,
});

// Ensures the csrftoken cookie exists and makes the token available to every EJS template
// as `csrfToken` (equivalent to Django's {% csrf_token %}).
function attachCsrfToken(req, res, next) {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
}

module.exports = { doubleCsrfProtection, generateCsrfToken, attachCsrfToken };
