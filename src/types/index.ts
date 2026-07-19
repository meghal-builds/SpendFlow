export type Expense = {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  paymentMethod?: string;
  note?: string;
  expenseDate: string; // ISO String (YYYY-MM-DD or full ISO String)
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string; // Icon identifier (e.g. Ionicons name)
  isDefault: boolean; // boolean (stored as 0 or 1 in SQLite)
  createdAt: string;
};

export type Budget = {
  id: string;
  period: 'daily' | 'weekly' | 'monthly';
  amount: number;
  enabled: boolean; // boolean (stored as 0 or 1 in SQLite)
  createdAt: string;
  updatedAt: string;
};

export type ReminderSettings = {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:MM"
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0-6 (Sunday is 0)
  weeklyReportTime: string; // "HH:MM"
  monthlyReportEnabled: boolean;
  monthlyReportTime: string; // "HH:MM"
  budgetAlertsEnabled: boolean;
};

export type ThemeType = 'light' | 'dark' | 'system';

export type AppState = {
  theme: ThemeType;
  currency: string; // Symbol like '₹', '$', etc.
  hasCompletedOnboarding: boolean;
};
