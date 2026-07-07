// The full set of togglable per-user permission checkboxes an admin can grant.
// Admins (isAdmin=true) implicitly bypass all of these.
const PERMISSIONS = [
  { key: 'project.create', label: 'Create / edit projects' },
  { key: 'project.delete', label: 'Delete projects' },
  { key: 'expense.create', label: 'Add expenses' },
  { key: 'expense.update', label: 'Edit expenses' },
  { key: 'expense.delete', label: 'Delete expenses' },
];

module.exports = { PERMISSIONS };
