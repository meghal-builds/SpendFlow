import { getDb } from '../index';
import { Budget } from '../../types';

export const budgetRepository = {
  async getAll(): Promise<Budget[]> {
    const db = getDb();
    const rows = await db.getAllAsync<{
      id: string;
      period: string;
      amount: number;
      enabled: number;
      createdAt: string;
      updatedAt: string;
    }>('SELECT * FROM budgets;');

    return rows.map(row => ({
      id: row.id,
      period: row.period as 'daily' | 'weekly' | 'monthly',
      amount: row.amount,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async getByPeriod(period: 'daily' | 'weekly' | 'monthly'): Promise<Budget | null> {
    const db = getDb();
    const row = await db.getFirstAsync<{
      id: string;
      period: string;
      amount: number;
      enabled: number;
      createdAt: string;
      updatedAt: string;
    }>('SELECT * FROM budgets WHERE period = ?;', [period]);

    if (!row) return null;

    return {
      id: row.id,
      period: row.period as 'daily' | 'weekly' | 'monthly',
      amount: row.amount,
      enabled: row.enabled === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  async save(period: 'daily' | 'weekly' | 'monthly', amount: number, enabled: boolean): Promise<Budget> {
    const db = getDb();
    const existing = await this.getByPeriod(period);
    const now = new Date().toISOString();

    if (existing) {
      await db.runAsync(
        'UPDATE budgets SET amount = ?, enabled = ?, updatedAt = ? WHERE period = ?;',
        [amount, enabled ? 1 : 0, now, period]
      );
      return {
        ...existing,
        amount,
        enabled,
        updatedAt: now,
      };
    } else {
      const id = `bud_${period}_${Date.now()}`;
      await db.runAsync(
        'INSERT INTO budgets (id, period, amount, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?);',
        [id, period, amount, enabled ? 1 : 0, now, now]
      );
      return {
        id,
        period,
        amount,
        enabled,
        createdAt: now,
        updatedAt: now,
      };
    }
  },

  async delete(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM budgets WHERE period = ?;', [period]);
  }
};
