import { getDb } from '../index';
import { Category } from '../../types';

export const categoryRepository = {
  async getAll(): Promise<Category[]> {
    const db = getDb();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      icon: string;
      isDefault: number;
      createdAt: string;
    }>('SELECT * FROM categories ORDER BY isDefault DESC, name ASC;');

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      isDefault: row.isDefault === 1,
      createdAt: row.createdAt,
    }));
  },

  async create(name: string, icon: string): Promise<Category> {
    const db = getDb();
    const id = `cat_custom_${Date.now()}`;
    const createdAt = new Date().toISOString();
    
    await db.runAsync(
      'INSERT INTO categories (id, name, icon, isDefault, createdAt) VALUES (?, ?, ?, ?, ?);',
      [id, name, icon, 0, createdAt]
    );

    return {
      id,
      name,
      icon,
      isDefault: false,
      createdAt,
    };
  },

  async update(id: string, name: string, icon: string): Promise<void> {
    const db = getDb();
    
    const category = await db.getFirstAsync<{ isDefault: number }>(
      'SELECT isDefault FROM categories WHERE id = ?;',
      [id]
    );

    if (category && category.isDefault === 1) {
      throw new Error('Default categories cannot be updated.');
    }

    await db.runAsync(
      'UPDATE categories SET name = ?, icon = ? WHERE id = ?;',
      [name, icon, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    
    const category = await db.getFirstAsync<{ isDefault: number }>(
      'SELECT isDefault FROM categories WHERE id = ?;',
      [id]
    );

    if (!category) return;
    if (category.isDefault === 1) {
      throw new Error('Default categories cannot be deleted.');
    }

    // Set referencing expenses categoryId to 'cat_other'
    await db.runAsync(
      'UPDATE expenses SET categoryId = "cat_other" WHERE categoryId = ?;',
      [id]
    );

    await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
  }
};
