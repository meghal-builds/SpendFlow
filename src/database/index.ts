import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { 
  CREATE_CATEGORIES_TABLE, 
  CREATE_EXPENSES_TABLE, 
  CREATE_BUDGETS_TABLE, 
  CREATE_REMINDER_SETTINGS_TABLE,
  CREATE_CONFIG_TABLE
} from './schema';
import { DEFAULT_CATEGORIES } from './seed';

let db: SQLite.SQLiteDatabase;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase() {
  if (Platform.OS === 'web') {
    db = await SQLite.openDatabaseAsync('spendflow.db');
  } else {
    db = SQLite.openDatabaseSync('spendflow.db');
  }

  const database = db;
  
  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables
  await database.execAsync(CREATE_CATEGORIES_TABLE);
  await database.execAsync(CREATE_EXPENSES_TABLE);
  await database.execAsync(CREATE_BUDGETS_TABLE);
  await database.execAsync(CREATE_REMINDER_SETTINGS_TABLE);
  await database.execAsync(CREATE_CONFIG_TABLE);

  // Check if categories table is seeded
  const categoryCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  
  if (categoryCount && categoryCount.count === 0) {
    // Seed default categories
    const statement = await database.prepareAsync(
      'INSERT INTO categories (id, name, icon, isDefault, createdAt) VALUES ($id, $name, $icon, $isDefault, $createdAt);'
    );
    
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await statement.executeAsync({
          $id: cat.id,
          $name: cat.name,
          $icon: cat.icon,
          $isDefault: cat.isDefault ? 1 : 0,
          $createdAt: cat.createdAt,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
    console.log('Database seeded with default categories.');
  }

  // Seed default settings row if empty
  const settingsCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM reminder_settings;');
  if (settingsCount && settingsCount.count === 0) {
    await database.runAsync(
      `INSERT INTO reminder_settings (
        id, dailyReminderEnabled, dailyReminderTime, 
        weeklyReportEnabled, weeklyReportDay, weeklyReportTime, 
        monthlyReportEnabled, monthlyReportTime, budgetAlertsEnabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        'default_settings',
        1,
        '21:30',
        1,
        0,
        '20:00',
        1,
        '20:00',
        1
      ]
    );
    console.log('Database seeded with default reminder settings.');
  }

  // Seed default configuration keys if empty
  await seedConfigKey(database, 'theme', 'system');
  await seedConfigKey(database, 'currency', '₹');
  await seedConfigKey(database, 'hasCompletedOnboarding', '0');
}

async function seedConfigKey(database: SQLite.SQLiteDatabase, key: string, defaultValue: string) {
  const row = await database.getFirstAsync<{ value: string }>('SELECT value FROM config WHERE key = ?;', [key]);
  if (!row) {
    await database.runAsync('INSERT INTO config (key, value) VALUES (?, ?);', [key, defaultValue]);
  }
}
