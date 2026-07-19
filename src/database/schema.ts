export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    isDefault INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );
`;

export const CREATE_EXPENSES_TABLE = `
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    categoryId TEXT NOT NULL,
    paymentMethod TEXT,
    note TEXT,
    expenseDate TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_BUDGETS_TABLE = `
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly')),
    amount REAL NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    UNIQUE(period)
  );
`;

export const CREATE_REMINDER_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS reminder_settings (
    id TEXT PRIMARY KEY,
    dailyReminderEnabled INTEGER NOT NULL DEFAULT 1,
    dailyReminderTime TEXT NOT NULL DEFAULT '21:30',
    weeklyReportEnabled INTEGER NOT NULL DEFAULT 1,
    weeklyReportDay INTEGER NOT NULL DEFAULT 0,
    weeklyReportTime TEXT NOT NULL DEFAULT '20:00',
    monthlyReportEnabled INTEGER NOT NULL DEFAULT 1,
    monthlyReportTime TEXT NOT NULL DEFAULT '20:00',
    budgetAlertsEnabled INTEGER NOT NULL DEFAULT 1
  );
`;

export const CREATE_CONFIG_TABLE = `
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
