import { getDb } from '../index';
import { ReminderSettings } from '../../types';

export const settingsRepository = {
  async get(): Promise<ReminderSettings> {
    const db = getDb();
    const row = await db.getFirstAsync<{
      dailyReminderEnabled: number;
      dailyReminderTime: string;
      weeklyReportEnabled: number;
      weeklyReportDay: number;
      weeklyReportTime: string;
      monthlyReportEnabled: number;
      monthlyReportTime: string;
      budgetAlertsEnabled: number;
    }>('SELECT * FROM reminder_settings LIMIT 1;');

    if (!row) {
      return {
        dailyReminderEnabled: true,
        dailyReminderTime: '21:30',
        weeklyReportEnabled: true,
        weeklyReportDay: 0,
        weeklyReportTime: '20:00',
        monthlyReportEnabled: true,
        monthlyReportTime: '20:00',
        budgetAlertsEnabled: true,
      };
    }

    return {
      dailyReminderEnabled: row.dailyReminderEnabled === 1,
      dailyReminderTime: row.dailyReminderTime,
      weeklyReportEnabled: row.weeklyReportEnabled === 1,
      weeklyReportDay: row.weeklyReportDay,
      weeklyReportTime: row.weeklyReportTime,
      monthlyReportEnabled: row.monthlyReportEnabled === 1,
      monthlyReportTime: row.monthlyReportTime,
      budgetAlertsEnabled: row.budgetAlertsEnabled === 1,
    };
  },

  async update(settings: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const db = getDb();
    const current = await this.get();
    const merged = { ...current, ...settings };

    await db.runAsync(
      `UPDATE reminder_settings SET 
        dailyReminderEnabled = ?,
        dailyReminderTime = ?,
        weeklyReportEnabled = ?,
        weeklyReportDay = ?,
        weeklyReportTime = ?,
        monthlyReportEnabled = ?,
        monthlyReportTime = ?,
        budgetAlertsEnabled = ?
      WHERE id = 'default_settings';`,
      [
        merged.dailyReminderEnabled ? 1 : 0,
        merged.dailyReminderTime,
        merged.weeklyReportEnabled ? 1 : 0,
        merged.weeklyReportDay,
        merged.weeklyReportTime,
        merged.monthlyReportEnabled ? 1 : 0,
        merged.monthlyReportTime,
        merged.budgetAlertsEnabled ? 1 : 0,
      ]
    );

    return merged;
  }
};
