import { getDb } from '../index';
import { ThemeType } from '../../types';

export const configRepository = {
  async get(key: string): Promise<string | null> {
    const db = getDb();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM config WHERE key = ?;', [key]);
    return row ? row.value : null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?);',
      [key, value]
    );
  },

  async getTheme(): Promise<ThemeType> {
    const val = await this.get('theme');
    return (val as ThemeType) || 'system';
  },

  async setTheme(theme: ThemeType): Promise<void> {
    await this.set('theme', theme);
  },

  async getCurrency(): Promise<string> {
    const val = await this.get('currency');
    return val || '₹';
  },

  async setCurrency(currency: string): Promise<void> {
    await this.set('currency', currency);
  },

  async getOnboardingCompleted(): Promise<boolean> {
    const val = await this.get('hasCompletedOnboarding');
    return val === '1';
  },

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.set('hasCompletedOnboarding', completed ? '1' : '0');
  }
};
