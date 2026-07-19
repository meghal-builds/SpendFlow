import { getDb } from '../index';
import { Expense } from '../../types';

export const expenseRepository = {
  async getAll(): Promise<Expense[]> {
    const db = getDb();
    const rows = await db.getAllAsync<{
      id: string;
      amount: number;
      description: string;
      categoryId: string;
      paymentMethod: string | null;
      note: string | null;
      expenseDate: string;
      createdAt: string;
      updatedAt: string;
    }>('SELECT * FROM expenses ORDER BY expenseDate DESC, createdAt DESC;');

    return rows.map(row => ({
      id: row.id,
      amount: row.amount,
      description: row.description,
      categoryId: row.categoryId,
      paymentMethod: row.paymentMethod || undefined,
      note: row.note || undefined,
      expenseDate: row.expenseDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async getById(id: string): Promise<Expense | null> {
    const db = getDb();
    const row = await db.getFirstAsync<{
      id: string;
      amount: number;
      description: string;
      categoryId: string;
      paymentMethod: string | null;
      note: string | null;
      expenseDate: string;
      createdAt: string;
      updatedAt: string;
    }>('SELECT * FROM expenses WHERE id = ?;', [id]);

    if (!row) return null;

    return {
      id: row.id,
      amount: row.amount,
      description: row.description,
      categoryId: row.categoryId,
      paymentMethod: row.paymentMethod || undefined,
      note: row.note || undefined,
      expenseDate: row.expenseDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  async create(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const db = getDb();
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO expenses (
        id, amount, description, categoryId, paymentMethod, note, expenseDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        expense.amount,
        expense.description,
        expense.categoryId,
        expense.paymentMethod || null,
        expense.note || null,
        expense.expenseDate,
        now,
        now,
      ]
    );

    return {
      ...expense,
      id,
      createdAt: now,
      updatedAt: now,
    };
  },

  async update(id: string, expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Expense> {
    const db = getDb();
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Expense with ID ${id} not found.`);
    }

    const merged = { ...current, ...expense };
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE expenses SET 
        amount = ?, 
        description = ?, 
        categoryId = ?, 
        paymentMethod = ?, 
        note = ?, 
        expenseDate = ?, 
        updatedAt = ? 
      WHERE id = ?;`,
      [
        merged.amount,
        merged.description,
        merged.categoryId,
        merged.paymentMethod || null,
        merged.note || null,
        merged.expenseDate,
        now,
        id,
      ]
    );

    return {
      ...merged,
      updatedAt: now,
    };
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
  },

  async deleteAll(): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM expenses;');
  },

  async getFiltered(
    search: string,
    categoryId?: string,
    paymentMethod?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Expense[]> {
    const db = getDb();
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];

    if (search.trim()) {
      query += ' AND (description LIKE ? OR note LIKE ?)';
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam);
    }

    if (categoryId && categoryId !== 'all') {
      query += ' AND categoryId = ?';
      params.push(categoryId);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query += ' AND paymentMethod = ?';
      params.push(paymentMethod);
    }

    if (startDate) {
      query += ' AND expenseDate >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND expenseDate <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY expenseDate DESC, createdAt DESC;';

    const rows = await db.getAllAsync<{
      id: string;
      amount: number;
      description: string;
      categoryId: string;
      paymentMethod: string | null;
      note: string | null;
      expenseDate: string;
      createdAt: string;
      updatedAt: string;
    }>(query, params);

    return rows.map(row => ({
      id: row.id,
      amount: row.amount,
      description: row.description,
      categoryId: row.categoryId,
      paymentMethod: row.paymentMethod || undefined,
      note: row.note || undefined,
      expenseDate: row.expenseDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async getRecent(limit: number = 5): Promise<Expense[]> {
    const db = getDb();
    const rows = await db.getAllAsync<{
      id: string;
      amount: number;
      description: string;
      categoryId: string;
      paymentMethod: string | null;
      note: string | null;
      expenseDate: string;
      createdAt: string;
      updatedAt: string;
    }>('SELECT * FROM expenses ORDER BY expenseDate DESC, createdAt DESC LIMIT ?;', [limit]);

    return rows.map(row => ({
      id: row.id,
      amount: row.amount,
      description: row.description,
      categoryId: row.categoryId,
      paymentMethod: row.paymentMethod || undefined,
      note: row.note || undefined,
      expenseDate: row.expenseDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }
};
