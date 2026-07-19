import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView,
  Switch,
  Modal,
  Platform
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { showAlert } from '../../utils/alert';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';

import { csvExportService } from '../../services/csvExport';
import { backupService } from '../../services/backup';
import { notificationService } from '../../services/notifications';
import * as Haptics from 'expo-haptics';

const CURRENCIES = [
  { symbol: '₹', name: 'INR (₹)' },
  { symbol: '$', name: 'USD ($)' },
  { symbol: '€', name: 'EUR (€)' },
  { symbol: '£', name: 'GBP (£)' },
];

const THEMES = [
  { value: 'light', name: 'Light' },
  { value: 'dark', name: 'Dark' },
  { value: 'system', name: 'System' },
];

const ICONS_LIST = [
  'wallet', 'gift', 'shirt', 'paw', 'construct', 'brush', 'briefcase',
  'barbell', 'beer', 'musical-notes', 'car', 'fast-food', 'cart', 'heart',
  'school', 'home', 'phone-portrait', 'basket', 'person', 'game-controller'
];

export default function SettingsScreen() {
  const { colors, common, shadows } = useTheme();

  // Store actions & values
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const budgets = useAppStore((state) => state.budgets);
  const reminderSettings = useAppStore((state) => state.reminderSettings);
  const theme = useAppStore((state) => state.theme);
  const currency = useAppStore((state) => state.currency);
  const storeInit = useAppStore((state) => state.init);
  
  const setTheme = useAppStore((state) => state.setTheme);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const saveBudget = useAppStore((state) => state.saveBudget);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const addCategory = useAppStore((state) => state.addCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const resetAllData = useAppStore((state) => state.resetAllData);

  // Modals visibility
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('wallet');

  // Time Picker Temp State
  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('30');
  const [tempAmpm, setTempAmpm] = useState('PM');

  // Budgets Temp State
  const getBudgetVal = (period: 'daily' | 'weekly' | 'monthly') => {
    const b = budgets.find((x) => x.period === period);
    return b && b.enabled ? String(b.amount) : '';
  };
  const isBudgetEnabled = (period: 'daily' | 'weekly' | 'monthly') => {
    const b = budgets.find((x) => x.period === period);
    return b ? b.enabled : false;
  };

  const [dailyVal, setDailyVal] = useState(getBudgetVal('daily'));
  const [weeklyVal, setWeeklyVal] = useState(getBudgetVal('weekly'));
  const [monthlyVal, setMonthlyVal] = useState(getBudgetVal('monthly'));



  // Notification reschedule wrapper
  const handleReminderToggle = async (key: keyof typeof reminderSettings, val: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updateReminderSettings({ [key]: val });

    // Try rescheduling
    const hasPerm = await notificationService.hasPermissions();
    if (hasPerm) {
      if (key === 'dailyReminderEnabled') {
        await notificationService.scheduleDailyReminder(val, reminderSettings.dailyReminderTime);
      } else if (key === 'weeklyReportEnabled') {
        await notificationService.scheduleWeeklyReport(val, reminderSettings.weeklyReportDay, reminderSettings.weeklyReportTime);
      } else if (key === 'monthlyReportEnabled') {
        await notificationService.scheduleMonthlyReport(val, reminderSettings.monthlyReportTime);
      }
    }
  };

  // Open Time Modal
  const openTimePicker = (target: 'daily' | 'weekly' | 'monthly', currentTime: string) => {
    setTimePickerTarget(target);
    const [h24, m] = currentTime.split(':');
    let h12 = parseInt(h24, 10);
    let ampm = 'AM';
    if (h12 >= 12) {
      ampm = 'PM';
      if (h12 > 12) h12 -= 12;
    }
    if (h12 === 0) h12 = 12;

    setTempHour(String(h12).padStart(2, '0'));
    setTempMinute(m);
    setTempAmpm(ampm);
    setShowTimeModal(true);
  };

  // Save Selected Time
  const handleSaveTime = async () => {
    let hour = parseInt(tempHour, 10);
    if (tempAmpm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (tempAmpm === 'AM' && hour === 12) {
      hour = 0;
    }
    const time24h = `${String(hour).padStart(2, '0')}:${tempMinute}`;

    if (timePickerTarget === 'daily') {
      await updateReminderSettings({ dailyReminderTime: time24h });
      await notificationService.scheduleDailyReminder(reminderSettings.dailyReminderEnabled, time24h);
    } else if (timePickerTarget === 'weekly') {
      await updateReminderSettings({ weeklyReportTime: time24h });
      await notificationService.scheduleWeeklyReport(reminderSettings.weeklyReportEnabled, reminderSettings.weeklyReportDay, time24h);
    } else if (timePickerTarget === 'monthly') {
      await updateReminderSettings({ monthlyReportTime: time24h });
      await notificationService.scheduleMonthlyReport(reminderSettings.monthlyReportEnabled, time24h);
    }

    setShowTimeModal(false);
    setTimePickerTarget(null);
    showAlert('Reminder Time Updated', `We will notify you at ${tempHour}:${tempMinute} ${tempAmpm}.`);
  };

  // Save Budgets
  const handleSaveBudget = async (period: 'daily' | 'weekly' | 'monthly', amountStr: string, active: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const parsed = parseFloat(amountStr);
    if (active && (isNaN(parsed) || parsed <= 0)) {
      showAlert('Invalid Budget', 'Please enter a valid amount greater than 0.');
      return;
    }
    await saveBudget(period, isNaN(parsed) ? 0 : parsed, active);
    showAlert('Budget Saved', `Your ${period} budget has been updated.`);
  };

  // Create Category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      showAlert('Validation Error', 'Please enter a category name.');
      return;
    }

    await addCategory(newCatName.trim(), newCatIcon);
    setNewCatName('');
    setShowCategoryModal(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showAlert('Category Created', `Custom category "${newCatName}" is ready.`);
  };

  const handleExportCSV = async () => {
    try {
      await csvExportService.exportExpenses(expenses, categories);
    } catch (e: any) {
      showAlert('Export Failed', e.message || 'We couldn\'t export your CSV.');
    }
  };

  const handleBackup = async () => {
    try {
      await backupService.createBackup();
    } catch (e: any) {
      showAlert('Backup Failed', e.message || 'We couldn\'t create a backup.');
    }
  };

  const handleRestore = async () => {
    showAlert(
      'Restore Backup',
      'Restoring a backup will overwrite your current transactions, categories, and budgets. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          onPress: async () => {
            try {
              const success = await backupService.restoreBackup();
              if (success) {
                // Reload Zustand from restored SQLite DB
                await storeInit();
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                showAlert('Restore Success', 'Your data was restored successfully.');
              }
            } catch (e: any) {
              showAlert('Restore Failed', e.message || 'The backup file is invalid.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAll = () => {
    showAlert(
      'DELETE ALL DATA',
      'This will permanently delete all your expenses, budgets, custom categories, and reset settings. This action cannot be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            showAlert('Data Reset Complete', 'All personal data has been erased.');
          }
        }
      ]
    );
  };

  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Appearance & Currency */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>General Preferences</Text>
          
          {/* Currency selection */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CURRENCY</Text>
          <View style={styles.btnRow}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.symbol}
                style={[
                  styles.selectorChip,
                  { 
                    borderColor: currency === curr.symbol ? common.primary : colors.border,
                    backgroundColor: currency === curr.symbol ? common.primaryLight : 'transparent'
                  }
                ]}
                onPress={async () => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setCurrency(curr.symbol);
                }}
              >
                <Text style={{ color: currency === curr.symbol ? common.primary : colors.text, fontWeight: 'bold' }}>
                  {curr.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>THEME</Text>
          <View style={styles.btnRow}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.selectorChip,
                  { 
                    borderColor: theme === t.value ? common.primary : colors.border,
                    backgroundColor: theme === t.value ? common.primaryLight : 'transparent'
                  }
                ]}
                onPress={async () => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await setTheme(t.value as any);
                }}
              >
                <Text style={{ color: theme === t.value ? common.primary : colors.text, fontWeight: 'bold' }}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Budgets Card */}
        <View 
          key={budgets.map((b) => `${b.period}-${b.amount}-${b.enabled}`).join('-')} 
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Budget Configurations</Text>
          
          {/* Daily Budget */}
          <View style={styles.budgetRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.budgetLabel, { color: colors.text }]}>Daily Budget</Text>
              <View style={[styles.budgetInputWrapper, { borderColor: colors.border }]}>
                <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>{currency}</Text>
                <TextInput
                  style={[styles.budgetInput, { color: colors.text }]}
                  keyboardType="numeric"
                  placeholder="Not Set"
                  placeholderTextColor={colors.textSecondary}
                  value={dailyVal}
                  onChangeText={setDailyVal}
                />
              </View>
            </View>
            <View style={styles.budgetActions}>
              <Switch
                value={isBudgetEnabled('daily')}
                onValueChange={(val) => handleSaveBudget('daily', dailyVal, val)}
                trackColor={{ false: colors.border, true: common.primary }}
              />
              <TouchableOpacity 
                style={[styles.saveBudgetBtn, { backgroundColor: common.primary }]}
                onPress={() => handleSaveBudget('daily', dailyVal, true)}
              >
                <Text style={styles.saveBudgetBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekly Budget */}
          <View style={styles.budgetRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.budgetLabel, { color: colors.text }]}>Weekly Budget</Text>
              <View style={[styles.budgetInputWrapper, { borderColor: colors.border }]}>
                <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>{currency}</Text>
                <TextInput
                  style={[styles.budgetInput, { color: colors.text }]}
                  keyboardType="numeric"
                  placeholder="Not Set"
                  placeholderTextColor={colors.textSecondary}
                  value={weeklyVal}
                  onChangeText={setWeeklyVal}
                />
              </View>
            </View>
            <View style={styles.budgetActions}>
              <Switch
                value={isBudgetEnabled('weekly')}
                onValueChange={(val) => handleSaveBudget('weekly', weeklyVal, val)}
                trackColor={{ false: colors.border, true: common.primary }}
              />
              <TouchableOpacity 
                style={[styles.saveBudgetBtn, { backgroundColor: common.primary }]}
                onPress={() => handleSaveBudget('weekly', weeklyVal, true)}
              >
                <Text style={styles.saveBudgetBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Monthly Budget */}
          <View style={styles.budgetRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.budgetLabel, { color: colors.text }]}>Monthly Budget</Text>
              <View style={[styles.budgetInputWrapper, { borderColor: colors.border }]}>
                <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>{currency}</Text>
                <TextInput
                  style={[styles.budgetInput, { color: colors.text }]}
                  keyboardType="numeric"
                  placeholder="Not Set"
                  placeholderTextColor={colors.textSecondary}
                  value={monthlyVal}
                  onChangeText={setMonthlyVal}
                />
              </View>
            </View>
            <View style={styles.budgetActions}>
              <Switch
                value={isBudgetEnabled('monthly')}
                onValueChange={(val) => handleSaveBudget('monthly', monthlyVal, val)}
                trackColor={{ false: colors.border, true: common.primary }}
              />
              <TouchableOpacity 
                style={[styles.saveBudgetBtn, { backgroundColor: common.primary }]}
                onPress={() => handleSaveBudget('monthly', monthlyVal, true)}
              >
                <Text style={styles.saveBudgetBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Custom Categories Manager */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <View style={styles.cardHeaderWithBtn}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Custom Categories</Text>
            <TouchableOpacity 
              style={[styles.headerActionBtn, { backgroundColor: common.primary }]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerActionBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {customCategories.length === 0 ? (
            <Text style={[styles.emptyLabel, { color: colors.textSecondary }]}>No custom categories created yet.</Text>
          ) : (
            <View style={styles.categoriesList}>
              {customCategories.map((cat) => (
                <View key={cat.id} style={[styles.categoryRowItem, { borderColor: colors.border }]}>
                  <View style={styles.catInfo}>
                    <View style={[styles.catIconRing, { backgroundColor: common.primaryLight }]}>
                      <Ionicons name={cat.icon as any} size={16} color={common.primary} />
                    </View>
                    <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  </View>
                  <TouchableOpacity onPress={async () => await deleteCategory(cat.id)} style={styles.catDeleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={common.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Reminder Settings */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Reminders & Alerts</Text>

          {/* Daily Reminder */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Daily Evening Reminder</Text>
              <TouchableOpacity 
                onPress={() => openTimePicker('daily', reminderSettings.dailyReminderTime)}
                style={styles.timeLink}
              >
                <Text style={{ color: common.primary, fontWeight: 'bold', fontSize: 13 }}>
                  Notify daily at {reminderSettings.dailyReminderTime}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={reminderSettings.dailyReminderEnabled}
              onValueChange={(val) => handleReminderToggle('dailyReminderEnabled', val)}
              trackColor={{ false: colors.border, true: common.primary }}
            />
          </View>

          {/* Weekly report */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Weekly Sunday Summary</Text>
              <TouchableOpacity 
                onPress={() => openTimePicker('weekly', reminderSettings.weeklyReportTime)}
                style={styles.timeLink}
              >
                <Text style={{ color: common.primary, fontWeight: 'bold', fontSize: 13 }}>
                  Notify weekly at {reminderSettings.weeklyReportTime}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={reminderSettings.weeklyReportEnabled}
              onValueChange={(val) => handleReminderToggle('weeklyReportEnabled', val)}
              trackColor={{ false: colors.border, true: common.primary }}
            />
          </View>

          {/* Monthly report */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Monthly Wrap-up Report</Text>
              <TouchableOpacity 
                onPress={() => openTimePicker('monthly', reminderSettings.monthlyReportTime)}
                style={styles.timeLink}
              >
                <Text style={{ color: common.primary, fontWeight: 'bold', fontSize: 13 }}>
                  Notify monthly at {reminderSettings.monthlyReportTime}
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={reminderSettings.monthlyReportEnabled}
              onValueChange={(val) => handleReminderToggle('monthlyReportEnabled', val)}
              trackColor={{ false: colors.border, true: common.primary }}
            />
          </View>

          {/* Budget Alerts toggle */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Real-time Budget Alerts</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                Warn when spending crosses 50%, 75%, 90%, and 100% thresholds.
              </Text>
            </View>
            <Switch
              value={reminderSettings.budgetAlertsEnabled}
              onValueChange={(val) => handleReminderToggle('budgetAlertsEnabled', val)}
              trackColor={{ false: colors.border, true: common.primary }}
            />
          </View>
        </View>

        {/* Data & Backup Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Data Operations</Text>

          <TouchableOpacity style={[styles.dataActionBtn, { borderColor: colors.border }]} onPress={handleExportCSV}>
            <Ionicons name="share-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={[styles.dataActionText, { color: colors.text }]}>Export Transactions as CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dataActionBtn, { borderColor: colors.border }]} onPress={handleBackup}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={[styles.dataActionText, { color: colors.text }]}>Create Local JSON Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dataActionBtn, { borderColor: colors.border }]} onPress={handleRestore}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={[styles.dataActionText, { color: colors.text }]}>Restore Backup File</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dataActionBtn, { borderColor: colors.border, backgroundColor: common.dangerLight }]} 
            onPress={handleDeleteAll}
          >
            <Ionicons name="trash-outline" size={20} color={common.danger} style={{ marginRight: 12 }} />
            <Text style={[styles.dataActionText, { color: common.danger, fontWeight: 'bold' }]}>Delete All Personal Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={showTimeModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTimeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Configure Time</Text>
            
            <View style={styles.timeSelectorRow}>
              {/* Hour */}
              <View style={[styles.timePartWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.timeInput, { color: colors.text }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={tempHour}
                  onChangeText={(val) => setTempHour(val.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    let h = parseInt(tempHour, 10);
                    if (isNaN(h) || h < 1) h = 12;
                    if (h > 12) h = 12;
                    setTempHour(String(h).padStart(2, '0'));
                  }}
                />
              </View>
              <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
              
              {/* Minute */}
              <View style={[styles.timePartWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.timeInput, { color: colors.text }]}
                  keyboardType="numeric"
                  maxLength={2}
                  value={tempMinute}
                  onChangeText={(val) => setTempMinute(val.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    let m = parseInt(tempMinute, 10);
                    if (isNaN(m) || m < 0) m = 0;
                    if (m > 59) m = 59;
                    setTempMinute(String(m).padStart(2, '0'));
                  }}
                />
              </View>

              {/* AM/PM Toggle */}
              <View style={styles.ampmWrapper}>
                <TouchableOpacity
                  style={[styles.ampmButton, { backgroundColor: tempAmpm === 'AM' ? common.primary : colors.background, borderColor: colors.border }]}
                  onPress={() => setTempAmpm('AM')}
                >
                  <Text style={{ color: tempAmpm === 'AM' ? '#FFF' : colors.text, fontWeight: 'bold' }}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmButton, { backgroundColor: tempAmpm === 'PM' ? common.primary : colors.background, borderColor: colors.border }]}
                  onPress={() => setTempAmpm('PM')}
                >
                  <Text style={{ color: tempAmpm === 'PM' ? '#FFF' : colors.text, fontWeight: 'bold' }}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowTimeModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: common.primary }]} onPress={handleSaveTime}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Creation Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Custom Category</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY NAME</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Subscriptions, Pet"
                  placeholderTextColor={colors.textSecondary}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  maxLength={18}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT ICON</Text>
            <ScrollView contentContainerStyle={styles.iconsGrid} style={{ maxHeight: 120 }}>
              {ICONS_LIST.map((icon) => {
                const isSelected = newCatIcon === icon;
                return (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconCell, 
                      { 
                        backgroundColor: isSelected ? common.primaryLight : colors.background,
                        borderColor: isSelected ? common.primary : colors.border
                      }
                    ]}
                    onPress={() => setNewCatIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={20} color={isSelected ? common.primary : colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowCategoryModal(false)}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: common.primary }]} onPress={handleCreateCategory}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
  },
  selectorChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 12,
  },
  budgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  budgetInputWrapper: {
    flexDirection: 'row',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '90%',
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  budgetActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBudgetBtn: {
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBudgetBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardHeaderWithBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerActionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyLabel: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  categoriesList: {
    marginTop: 4,
  },
  categoryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catDeleteBtn: {
    padding: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  timeLink: {
    marginTop: 4,
  },
  dataActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dataActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timePartWrapper: {
    width: 52,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  timeColon: {
    fontSize: 22,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  ampmWrapper: {
    flexDirection: 'row',
    marginLeft: 14,
  },
  ampmButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  inputWrapper: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
});
