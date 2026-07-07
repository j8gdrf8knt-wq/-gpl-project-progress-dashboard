const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/db');
const { requireAdminPage } = require('../middleware/auth');
const { PERMISSIONS } = require('../lib/permissions');

const router = express.Router();

const ALLOWED_DOMAIN = (process.env.SIGNUP_ALLOWED_EMAIL_DOMAIN || 'greenpowerbd.com').toLowerCase();

router.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('accounts/signup', { error: null, allowedDomain: ALLOWED_DOMAIN, values: {} });
});

router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password, password2 } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  const fail = (error) =>
    res.render('accounts/signup', {
      error,
      allowedDomain: ALLOWED_DOMAIN,
      values: { firstName, lastName, email },
    });

  if (!cleanEmail.endsWith('@' + ALLOWED_DOMAIN)) {
    return fail(`Signup is restricted to @${ALLOWED_DOMAIN} email addresses.`);
  }
  if (!password || password.length < 8) {
    return fail('Password must be at least 8 characters.');
  }
  if (password !== password2) {
    return fail('Passwords do not match.');
  }
  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return fail('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: cleanEmail,
      passwordHash,
      firstName: firstName || '',
      lastName: lastName || '',
      isActive: false,
      isApproved: false,
    },
  });

  res.render('accounts/pending');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('accounts/login', { error: null });
});

router.post('/login', async (req, res) => {
  const identifier = (req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } });
  const valid = user && (await bcrypt.compare(password || '', user.passwordHash));

  if (!valid) {
    return res.render('accounts/login', { error: 'Invalid credentials.' });
  }
  if (!user.isActive) {
    return res.render('accounts/login', { error: 'Your account is awaiting admin approval.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.render('accounts/login', { error: 'Login failed, please try again.' });
    req.session.userId = user.id;
    res.redirect('/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/manage/users', requireAdminPage, async (req, res) => {
  const [pendingUsers, activeUsers] = await Promise.all([
    prisma.user.findMany({ where: { isActive: false }, orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { email: 'asc' } }),
  ]);
  res.render('accounts/manage_users', {
    pendingUsers,
    activeUsers,
    permissions: PERMISSIONS,
    currentUserId: req.user.id,
    message: null,
  });
});

router.post('/manage/users', requireAdminPage, async (req, res) => {
  const { action, userId } = req.body;
  const targetId = Number(userId);

  if (action === 'approve') {
    await prisma.user.update({ where: { id: targetId }, data: { isActive: true, isApproved: true } });
  } else if (action === 'reject') {
    await prisma.user.delete({ where: { id: targetId } });
  } else if (action === 'toggle_active' && targetId !== req.user.id) {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (target) await prisma.user.update({ where: { id: targetId }, data: { isActive: !target.isActive } });
  } else if (action === 'toggle_admin' && targetId !== req.user.id) {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (target) await prisma.user.update({ where: { id: targetId }, data: { isAdmin: !target.isAdmin } });
  } else if (action === 'update_permissions') {
    const selected = [].concat(req.body.permissions || []);
    const valid = selected.filter((k) => PERMISSIONS.some((p) => p.key === k));
    await prisma.user.update({ where: { id: targetId }, data: { permissions: valid } });
  }

  res.redirect('/manage/users');
});

module.exports = router;
