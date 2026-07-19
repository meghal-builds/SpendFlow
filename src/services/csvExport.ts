import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Expense, Category } from '../types';

export const csvExportService = {
  async exportExpenses(expenses: Expense[], categories: Category[]): Promise<boolean> {
    try {
      if (expenses.length === 0) {
        throw new Error('No transactions available to export.');
      }

      // CSV Header
      let csvContent = 'ID,Date,Amount,Description,Category,Payment Method,Note,Created At\n';

      // Rows
      for (const exp of expenses) {
        const cat = categories.find((c) => c.id === exp.categoryId);
        const categoryName = cat ? cat.name : 'Other';
        
        // Escape fields that might contain commas or quotes
        const descEscaped = `"${exp.description.replace(/"/g, '""')}"`;
        const noteEscaped = exp.note ? `"${exp.note.replace(/"/g, '""')}"` : '';
        const payMethod = exp.paymentMethod || '';
        const dateFormatted = exp.expenseDate.substring(0, 10);
        
        csvContent += `${exp.id},${dateFormatted},${exp.amount},${descEscaped},${categoryName},${payMethod},${noteEscaped},${exp.createdAt}\n`;
      }

      const filename = `SpendFlow_Expenses_${new Date().toISOString().substring(0,10)}.csv`;

      // Web Browser Download Fallback
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Expenses CSV',
          UTI: 'public.comma-separated-values-text',
        });
        return true;
      } else {
        throw new Error('Native sharing is not supported on this device.');
      }
    } catch (error) {
      console.error('CSV Export Error:', error);
      throw error;
    }
  }
};
