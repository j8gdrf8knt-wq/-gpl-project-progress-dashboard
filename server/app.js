require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');

const { attachUser, requireLoginPage } = require('./middleware/auth');
const { doubleCsrfProtection, attachCsrfToken } = require('./middleware/csrf');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if(!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET not set in environment');
  process.exit(1);
}

app.use(session({
  store: new pgSession({ pool: pgPool, tableName: 'gpl_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  // Must be true: our CSRF scheme ties tokens to req.session.id, which needs to stay stable
  // between the GET that generates the token and the POST that submits it, even for
  // not-yet-authenticated visitors (login/signup pages).
  saveUninitialized: true,
  cookie: { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

app.use(cookieParser());
app.use(attachUser);
app.use(attachCsrfToken);
app.use(doubleCsrfProtection);

// Page routes
app.use('/', authRoutes);

app.get('/', requireLoginPage, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// API routes
app.use('/api', apiRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`GPL dashboard server listening on http://localhost:${port}`);
});
