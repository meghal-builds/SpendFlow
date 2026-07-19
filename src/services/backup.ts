import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { getDb } from '../database';

interface BackupData {
  version: string;
  appName: string;
  timestamp: string;
  expenses: any[];
  categories: any[];
  budgets: any[];
  reminder_settings: any[];
  config: any[];
}

export const backupService = {
  async createBackup(): Promise<boolean> {
    try {
      const db = getDb();
      
      // 1. Gather all table data (async for web & native)
      const expenses = await db.getAllAsync('SELECT * FROM expenses;');
      const categories = await db.getAllAsync('SELECT * FROM categories;');
      const budgets = await db.getAllAsync('SELECT * FROM budgets;');
      const reminder_settings = await db.getAllAsync('SELECT * FROM reminder_settings;');
      const config = await db.getAllAsync('SELECT * FROM config;');

      const backup: BackupData = {
        version: '1.0',
        appName: 'SpendFlow',
        timestamp: new Date().toISOString(),
        expenses,
        categories,
        budgets,
        reminder_settings,
        config
      };

      const backupString = JSON.stringify(backup, null, 2);
      const filename = `SpendFlow_Backup_${new Date().toISOString().substring(0, 10)}.json`;

      // Web Download Fallback
      if (Platform.OS === 'web') {
        const blob = new Blob([backupString], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }

      // Native Sharing (iOS / Android)
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, backupString, {
        encoding: FileSystem.EncodingType.UTF8
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export SpendFlow Backup',
          UTI: 'public.json'
        });
        return true;
      } else {
        throw new Error('Sharing is not supported on this device.');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  },

  async restoreBackup(): Promise<boolean> {
    try {
      let content = '';

      if (Platform.OS === 'web') {
        // Web file input dialog
        content = await new Promise<string>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json';
          input.onchange = (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) {
              reject(new Error('No file selected.'));
              return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve(event.target?.result as string || '');
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
          };
          input.click();
        });
      } else {
        // Native DocumentPicker
        const res = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true
        });

        if (res.canceled || !res.assets || res.assets.length === 0) {
          return false;
        }

        const fileUri = res.assets[0].uri;
        content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8
        });
      }

      if (!content) return false;

      // 2. Parse and validate
      const data = JSON.parse(content);
      if (data.appName !== 'SpendFlow' || !data.expenses || !data.categories || !data.budgets) {
        throw new Error('Invalid backup file structure.');
      }

      const db = getDb();

      // 3. Clear current records
      await db.runAsync('DELETE FROM expenses;');
      await db.runAsync('DELETE FROM budgets;');
      await db.runAsync('DELETE FROM categories;');
      await db.runAsync('DELETE FROM reminder_settings;');
      await db.runAsync('DELETE FROM config;');

      // 4. Restore tables
      // Restore Categories
      if (data.categories && data.categories.length > 0) {
        const insertCategory = await db.prepareAsync(
          'INSERT INTO categories (id, name, icon, isDefault, createdAt) VALUES ($id, $name, $icon, $isDefault, $createdAt);'
        );
        try {
          for (const cat of data.categories) {
            await insertCategory.executeAsync({
              $id: cat.id,
              $name: cat.name,
              $icon: cat.icon,
              $isDefault: cat.isDefault,
              $createdAt: cat.createdAt
            });
          }
        } finally {
          await insertCategory.finalizeAsync();
        }
      }

      // Restore Expenses
      if (data.expenses && data.expenses.length > 0) {
        const insertExpense = await db.prepareAsync(
          `INSERT INTO expenses (
            id, amount, description, categoryId, paymentMethod, note, expenseDate, createdAt, updatedAt
          ) VALUES ($id, $amount, $description, $categoryId, $paymentMethod, $note, $expenseDate, $createdAt, $updatedAt);`
        );
        try {
          for (const exp of data.expenses) {
            await insertExpense.executeAsync({
              $id: exp.id,
              $amount: exp.amount,
              $description: exp.description,
              $categoryId: exp.categoryId,
              $paymentMethod: exp.paymentMethod || null,
              $note: exp.note || null,
              $expenseDate: exp.expenseDate,
              $createdAt: exp.createdAt,
              $updatedAt: exp.updatedAt
            });
          }
        } finally {
          await insertExpense.finalizeAsync();
        }
      }

      // Restore Budgets
      if (data.budgets && data.budgets.length > 0) {
        const insertBudget = await db.prepareAsync(
          'INSERT INTO budgets (id, period, amount, enabled, createdAt, updatedAt) VALUES ($id, $period, $amount, $enabled, $createdAt, $updatedAt);'
        );
        try {
          for (const bud of data.budgets) {
            await insertBudget.executeAsync({
              $id: bud.id,
              $period: bud.period,
              $amount: bud.amount,
              $enabled: bud.enabled,
              $createdAt: bud.createdAt,
              $updatedAt: bud.updatedAt
            });
          }
        } finally {
          await insertBudget.finalizeAsync();
        }
      }

      // Restore Reminder Settings
      if (data.reminder_settings && data.reminder_settings.length > 0) {
        const insertSetting = await db.prepareAsync(
          `INSERT INTO reminder_settings (
            id, dailyReminderEnabled, dailyReminderTime, 
            weeklyReportEnabled, weeklyReportDay, weeklyReportTime, 
            monthlyReportEnabled, monthlyReportTime, budgetAlertsEnabled
          ) VALUES ($id, $dailyReminderEnabled, $dailyReminderTime, $weeklyReportEnabled, $weeklyReportDay, $weeklyReportTime, $monthlyReportEnabled, $monthlyReportTime, $budgetAlertsEnabled);`
        );
        try {
          for (const set of data.reminder_settings) {
            await insertSetting.executeAsync({
              $id: set.id,
              $dailyReminderEnabled: set.dailyReminderEnabled,
              $dailyReminderTime: set.dailyReminderTime,
              $weeklyReportEnabled: set.weeklyReportEnabled,
              $weeklyReportDay: set.weeklyReportDay,
              $weeklyReportTime: set.weeklyReportTime,
              $monthlyReportEnabled: set.monthlyReportEnabled,
              $monthlyReportTime: set.monthlyReportTime,
              $budgetAlertsEnabled: set.budgetAlertsEnabled
            });
          }
        } finally {
          await insertSetting.finalizeAsync();
        }
      }

      // Restore Configurations
      if (data.config && data.config.length > 0) {
        const insertConfig = await db.prepareAsync('INSERT OR REPLACE INTO config (key, value) VALUES ($key, $value);');
        try {
          for (const conf of data.config) {
            await insertConfig.executeAsync({
              $key: conf.key,
              $value: conf.value
            });
          }
        } finally {
          await insertConfig.finalizeAsync();
        }
      }

      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }
};
