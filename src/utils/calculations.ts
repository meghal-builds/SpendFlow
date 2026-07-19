import { Expense, Budget } from '../types';
import { 
  getTodayDateString, 
  getYesterdayDateString, 
  getStartAndEndOfWeek, 
  getStartAndEndOfMonth,
  getPreviousWeekDateRange,
  getPreviousMonthDateRange
} from './dateHelpers';

export function calculateTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

export function filterExpensesByDateRange(expenses: Expense[], start: string, end: string): Expense[] {
  return expenses.filter(exp => {
    const dateStr = exp.expenseDate.substring(0, 10);
    return dateStr >= start && dateStr <= end;
  });
}

export function getTodayExpenses(expenses: Expense[]): Expense[] {
  const todayStr = getTodayDateString();
  return expenses.filter(exp => exp.expenseDate.substring(0, 10) === todayStr);
}

export function getYesterdayExpenses(expenses: Expense[]): Expense[] {
  const yesterdayStr = getYesterdayDateString();
  return expenses.filter(exp => exp.expenseDate.substring(0, 10) === yesterdayStr);
}

export function getWeeklyExpenses(expenses: Expense[]): Expense[] {
  const { start, end } = getStartAndEndOfWeek();
  return filterExpensesByDateRange(expenses, start, end);
}

export function getPreviousWeeklyExpenses(expenses: Expense[]): Expense[] {
  const { start } = getStartAndEndOfWeek();
  const { start: prevStart, end: prevEnd } = getPreviousWeekDateRange(start);
  return filterExpensesByDateRange(expenses, prevStart, prevEnd);
}

export function getMonthlyExpenses(expenses: Expense[]): Expense[] {
  const { start, end } = getStartAndEndOfMonth();
  return filterExpensesByDateRange(expenses, start, end);
}

export function getPreviousMonthlyExpenses(expenses: Expense[]): Expense[] {
  const { start } = getStartAndEndOfMonth();
  const { start: prevStart, end: prevEnd } = getPreviousMonthDateRange(start);
  return filterExpensesByDateRange(expenses, prevStart, prevEnd);
}

export interface CategoryTotal {
  categoryId: string;
  amount: number;
  percentage: number;
}

export function calculateCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const total = calculateTotal(expenses);
  if (total === 0) return [];

  const map: Record<string, number> = {};
  for (const exp of expenses) {
    map[exp.categoryId] = (map[exp.categoryId] || 0) + exp.amount;
  }

  return Object.entries(map).map(([categoryId, amount]) => ({
    categoryId,
    amount,
    percentage: Math.round((amount / total) * 100)
  })).sort((a, b) => b.amount - a.amount);
}

export interface DailyTotal {
  date: string; // YYYY-MM-DD
  amount: number;
}

export function calculateDailyTotals(expenses: Expense[], start: string, end: string): DailyTotal[] {
  const map: Record<string, number> = {};
  
  // Initialize map with 0 for all days in range to ensure empty days are represented
  const startDate = new Date(start);
  const endDate = new Date(end);
  const curr = new Date(startDate);
  
  while (curr <= endDate) {
    const dateStr = curr.toISOString().substring(0, 10);
    map[dateStr] = 0;
    curr.setDate(curr.getDate() + 1);
  }

  // Populate actuals
  for (const exp of expenses) {
    const dateStr = exp.expenseDate.substring(0, 10);
    if (dateStr >= start && dateStr <= end) {
      map[dateStr] = (map[dateStr] || 0) + exp.amount;
    }
  }

  return Object.entries(map).map(([date, amount]) => ({
    date,
    amount
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateDailyAverage(expenses: Expense[], daysCount: number): number {
  if (daysCount <= 0) return 0;
  const total = calculateTotal(expenses);
  return total / daysCount;
}

export function getHighestExpense(expenses: Expense[]): Expense | null {
  if (expenses.length === 0) return null;
  return expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max, expenses[0]);
}

export interface DayOfWeekTotal {
  dayName: string; // Sunday, Monday, etc.
  amount: number;
}

export function getHighestSpendingDay(expenses: Expense[]): { date: string; amount: number } | null {
  if (expenses.length === 0) return null;
  
  const map: Record<string, number> = {};
  for (const exp of expenses) {
    const dateStr = exp.expenseDate.substring(0, 10);
    map[dateStr] = (map[dateStr] || 0) + exp.amount;
  }
  
  let highestDate = '';
  let highestAmount = -1;
  
  for (const [date, amount] of Object.entries(map)) {
    if (amount > highestAmount) {
      highestAmount = amount;
      highestDate = date;
    }
  }
  
  return { date: highestDate, amount: highestAmount };
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export interface BudgetStatus {
  limit: number;
  spent: number;
  percentage: number;
  remaining: number;
  isOver: boolean;
}

export function getBudgetStatus(expenses: Expense[], budget: Budget | null): BudgetStatus | null {
  if (!budget || !budget.enabled || budget.amount <= 0) return null;
  
  let periodExpenses: Expense[] = [];
  if (budget.period === 'daily') {
    periodExpenses = getTodayExpenses(expenses);
  } else if (budget.period === 'weekly') {
    periodExpenses = getWeeklyExpenses(expenses);
  } else if (budget.period === 'monthly') {
    periodExpenses = getMonthlyExpenses(expenses);
  }
  
  const spent = calculateTotal(periodExpenses);
  const percentage = (spent / budget.amount) * 100;
  const remaining = Math.max(0, budget.amount - spent);
  
  return {
    limit: budget.amount,
    spent,
    percentage,
    remaining,
    isOver: spent > budget.amount
  };
}
