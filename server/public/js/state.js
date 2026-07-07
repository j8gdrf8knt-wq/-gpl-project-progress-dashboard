// Global state — shared across all JS files
let PROJECTS = {};
let currentProjectId = '';
let currentView = 'progress';
let chartInstances = {};
let pendingXLData = null;

// Expense table state
let expenseTableExpanded = true;
let expenseDateFilter = 'all';

// Daily log state
let dailyLogExpanded = true;
let logDateFilter = 'all';
