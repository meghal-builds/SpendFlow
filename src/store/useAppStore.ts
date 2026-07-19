import { create } from 'zustand';
import { initDatabase, getDb } from '../database';
import { expenseRepository } from '../database/repositories/expenseRepository';
import { categoryRepository } from '../database/repositories/categoryRepository';
import { budgetRepository } from '../database/repositories/budgetRepository';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { configRepository } from '../database/repositories/configRepository';
import { Expense, Category, Budget, ReminderSettings, ThemeType } from '../types';
import { notificationService } from '../services/notifications';
import { getTodayDateString, getStartAndEndOfWeek, getStartAndEndOfMonth } from '../utils/dateHelpers';
import { calculateTotal, filterExpensesByDateRange } from '../utils/calculations';
import { formatIndianCurrency } from '../utils/format';

interface Filters {
  search: string;
  categoryId: string;
  paymentMethod: string;
  startDate: string | undefined;
  endDate: string | undefined;
}

interface AppStore {
  initialized: boolean;
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  reminderSettings: ReminderSettings;
  theme: ThemeType;
  currency: string;
  hasCompletedOnboarding: boolean;
  
  // Filters
  filters: Filters;

  // Actions
  init: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  
  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Category Actions
  addCategory: (name: string, icon: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Budget Actions
  saveBudget: (period: 'daily' | 'weekly' | 'monthly', amount: number, enabled: boolean) => Promise<void>;
  
  // Settings Actions
  updateReminderSettings: (settings: Partial<ReminderSettings>) => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  
  // Filter Actions
  setFilters: (filters: Partial<Filters>) => Promise<void>;
  clearFilters: () => Promise<void>;
  
  // Clear Database
  resetAllData: () => Promise<void>;
}

const initialFilters: Filters = {
  search: '',
  categoryId: 'all',
  paymentMethod: 'all',
  startDate: undefined,
  endDate: undefined,
};

function checkBudgetThresholdAlerts(
  prevExpenses: Expense[],
  nextExpenses: Expense[],
  budgets: Budget[],
  reminderSettings: ReminderSettings,
  currency: string
) {
  if (!reminderSettings.budgetAlertsEnabled) return;

  const thresholds = [50, 75, 90, 100];
  const periods: ('daily' | 'weekly' | 'monthly')[] = ['daily', 'weekly', 'monthly'];

  for (const period of periods) {
    const budget = budgets.find((b) => b.period === period && b.enabled && b.amount > 0);
    if (!budget) continue;

    let startDate: string;
    let endDate: string;

    if (period === 'daily') {
      const today = getTodayDateString();
      startDate = today;
      endDate = today;
    } else if (period === 'weekly') {
      const { start, end } = getStartAndEndOfWeek();
      startDate = start;
      endDate = end;
    } else {
      const { start, end } = getStartAndEndOfMonth();
      startDate = start;
      endDate = end;
    }

    const prevPeriodExpenses = filterExpensesByDateRange(prevExpenses, startDate, endDate);
    const nextPeriodExpenses = filterExpensesByDateRange(nextExpenses, startDate, endDate);

    const prevSpent = calculateTotal(prevPeriodExpenses);
    const nextSpent = calculateTotal(nextPeriodExpenses);

    const prevPct = (prevSpent / budget.amount) * 100;
    const nextPct = (nextSpent / budget.amount) * 100;

    for (const t of thresholds) {
      if (prevPct < t && nextPct >= t) {
        const remaining = Math.max(0, budget.amount - nextSpent);
        const remainingStr = formatIndianCurrency(remaining, currency);
        notificationService.sendBudgetAlert(period, t, remainingStr);
      }
    }
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  initialized: false,
  expenses: [],
  categories: [],
  budgets: [],
  reminderSettings: {
    dailyReminderEnabled: true,
    dailyReminderTime: '21:30',
    weeklyReportEnabled: true,
    weeklyReportDay: 0,
    weeklyReportTime: '20:00',
    monthlyReportEnabled: true,
    monthlyReportTime: '20:00',
    budgetAlertsEnabled: true,
  },
  theme: 'system',
  currency: '₹',
  hasCompletedOnboarding: false,
  filters: initialFilters,

  init: async () => {
    try {
      // 1. Initialize SQLite Database
      await initDatabase();

      // 2. Fetch initial configs
      const theme = await configRepository.getTheme();
      const currency = await configRepository.getCurrency();
      const hasCompletedOnboarding = await configRepository.getOnboardingCompleted();
      const categories = await categoryRepository.getAll();
      const budgets = await budgetRepository.getAll();
      const reminderSettings = await settingsRepository.get();

      set({
        theme,
        currency,
        hasCompletedOnboarding,
        categories,
        budgets,
        reminderSettings,
        initialized: true,
      });

      // 3. Load initial expenses
      await get().refreshExpenses();
    } catch (e) {
      console.error('Error during store initialization:', e);
    }
  },

  refreshExpenses: async () => {
    const { filters } = get();
    const expenses = await expenseRepository.getFiltered(
      filters.search,
      filters.categoryId,
      filters.paymentMethod,
      filters.startDate,
      filters.endDate
    );
    set({ expenses });
  },

  refreshCategories: async () => {
    const categories = await categoryRepository.getAll();
    set({ categories });
  },

  refreshBudgets: async () => {
    const budgets = await budgetRepository.getAll();
    set({ budgets });
  },

  addExpense: async (expense) => {
    const prevExpenses = get().expenses;
    const { budgets, reminderSettings, currency } = get();
    
    await expenseRepository.create(expense);
    await get().refreshExpenses();
    
    const nextExpenses = get().expenses;
    checkBudgetThresholdAlerts(prevExpenses, nextExpenses, budgets, reminderSettings, currency);
  },

  updateExpense: async (id, expense) => {
    const prevExpenses = get().expenses;
    const { budgets, reminderSettings, currency } = get();

    await expenseRepository.update(id, expense);
    await get().refreshExpenses();

    const nextExpenses = get().expenses;
    checkBudgetThresholdAlerts(prevExpenses, nextExpenses, budgets, reminderSettings, currency);
  },

  deleteExpense: async (id) => {
    await expenseRepository.delete(id);
    await get().refreshExpenses();
  },

  addCategory: async (name, icon) => {
    await categoryRepository.create(name, icon);
    await get().refreshCategories();
  },

  deleteCategory: async (id) => {
    await categoryRepository.delete(id);
    await get().refreshCategories();
    await get().refreshExpenses();
  },

  saveBudget: async (period, amount, enabled) => {
    await budgetRepository.save(period, amount, enabled);
    await get().refreshBudgets();
  },

  updateReminderSettings: async (settings) => {
    const updated = await settingsRepository.update(settings);
    set({ reminderSettings: updated });
  },

  setTheme: async (theme) => {
    await configRepository.setTheme(theme);
    set({ theme });
  },

  setCurrency: async (currency) => {
    await configRepository.setCurrency(currency);
    set({ currency });
  },

  setOnboardingCompleted: async (completed) => {
    await configRepository.setOnboardingCompleted(completed);
    set({ hasCompletedOnboarding: completed });
  },

  setFilters: async (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    await get().refreshExpenses();
  },

  clearFilters: async () => {
    set({ filters: initialFilters });
    await get().refreshExpenses();
  },

  resetAllData: async () => {
    const db = getDb();
    
    // Clear transactions, budgets, custom categories
    await db.runAsync('DELETE FROM expenses;');
    await db.runAsync('DELETE FROM budgets;');
    await db.runAsync('DELETE FROM categories WHERE isDefault = 0;');
    
    // Reset settings
    await db.runAsync(
      `UPDATE reminder_settings SET 
        dailyReminderEnabled = 1, dailyReminderTime = '21:30', 
        weeklyReportEnabled = 1, weeklyReportDay = 0, weeklyReportTime = '20:00', 
        monthlyReportEnabled = 1, monthlyReportTime = '20:00', budgetAlertsEnabled = 1 
      WHERE id = 'default_settings';`
    );

    // Reset config
    await configRepository.setTheme('system');
    await configRepository.setCurrency('₹');
    await configRepository.setOnboardingCompleted(false);

    // Reinitialize state
    set({
      theme: 'system',
      currency: '₹',
      hasCompletedOnboarding: false,
      filters: initialFilters,
    });

    await get().refreshCategories();
    await get().refreshBudgets();
    await get().refreshExpenses();
    const reminderSettings = await settingsRepository.get();
    set({ reminderSettings });
  }
}));
