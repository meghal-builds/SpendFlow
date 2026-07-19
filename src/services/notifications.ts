import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  },

  async hasPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  async cancelAll(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async scheduleDailyReminder(enabled: boolean, timeStr: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync('daily_reminder');
    } catch {}
    
    if (!enabled) return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily_reminder',
      content: {
        title: 'SpendFlow Daily Review',
        body: 'Did you forget to add any expenses today? Tap to review your daily summary.',
        data: { screen: 'daily-summary' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  },

  async scheduleWeeklyReport(enabled: boolean, day: number, timeStr: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync('weekly_reminder');
    } catch {}
    
    if (!enabled) return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Expo Trigger weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    // day parameter: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const expoWeekday = day + 1;

    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly_reminder',
      content: {
        title: 'Weekly Expense Report',
        body: 'Your weekly expense summary is ready! Tap to view.',
        data: { screen: 'weekly-report' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday,
        hour: hours,
        minute: minutes,
      },
    });
  },

  async scheduleMonthlyReport(enabled: boolean, timeStr: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync('monthly_reminder');
    } catch {}
    
    if (!enabled) return;

    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Calendar trigger: day = 1 (triggers 1st of every month)
    await Notifications.scheduleNotificationAsync({
      identifier: 'monthly_reminder',
      content: {
        title: 'Monthly Expense Report',
        body: 'Your monthly expense report is ready! Tap to view.',
        data: { screen: 'monthly-report' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: 1, // 1st day of month
        hour: hours,
        minute: minutes,
      },
    });
  },

  async sendBudgetAlert(period: 'daily' | 'weekly' | 'monthly', percentage: number, remainingStr: string): Promise<void> {
    if (Platform.OS === 'web') return;

    const percentageInt = Math.round(percentage);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${period.toUpperCase()} Budget Alert`,
        body: `You have used ${percentageInt}% of your budget. Remaining: ${remainingStr}`,
        data: { screen: 'settings' }
      },
      trigger: null, // Send immediately
    });
  },

  async registerNotificationListener(onReceive: (response: Notifications.NotificationResponse) => void) {
    if (Platform.OS === 'web') return () => {};
    
    const subscription = Notifications.addNotificationResponseReceivedListener(onReceive);
    return () => subscription.remove();
  }
};
