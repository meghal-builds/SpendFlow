import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { notificationService } from '../services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';

const SLIDES = [
  {
    icon: 'flash-outline',
    title: 'Track in Seconds',
    desc: 'Record any expense immediately. No complicated setup, no banking logins, just simple local tracking.',
  },
  {
    icon: 'pie-chart-outline',
    title: 'Visualize Spending',
    desc: 'Understand where your money goes. View clean category breakdowns, bar charts, and daily averages.',
  },
  {
    icon: 'notifications-outline',
    title: 'Daily & Weekly Summaries',
    desc: 'Get gentle reminders at the end of the day or week. Stay on top of your budget without opening the app.',
  },
];

const CURRENCIES = [
  { symbol: '₹', name: 'INR' },
  { symbol: '$', name: 'USD' },
  { symbol: '€', name: 'EUR' },
  { symbol: '£', name: 'GBP' },
];

export default function Onboarding() {
  const { colors, common } = useTheme();
  
  // App store actions
  const setOnboardingCompleted = useAppStore((state) => state.setOnboardingCompleted);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const saveBudget = useAppStore((state) => state.saveBudget);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const reminderSettings = useAppStore((state) => state.reminderSettings);

  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Config state
  const [selectedCurrency, setSelectedCurrency] = useState('₹');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [reminderHour, setReminderHour] = useState('09');
  const [reminderMinute, setReminderMinute] = useState('30');
  const [reminderAmpm, setReminderAmpm] = useState('PM');
  const [isNotifGranted, setIsNotifGranted] = useState(false);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setCurrentSlide(3); // Setup screen
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await notificationService.requestPermissions();
    setIsNotifGranted(granted);
    if (granted) {
      showAlert('Notifications Enabled', 'We will send you daily summaries and budget warnings.');
    } else {
      showAlert('Permissions Denied', 'You can enable notifications later in Settings.');
    }
  };

  const handleFinish = async () => {
    // 1. Calculate reminder time in 24h string
    let hour = parseInt(reminderHour, 10);
    if (reminderAmpm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (reminderAmpm === 'AM' && hour === 12) {
      hour = 0;
    }
    const time24h = `${String(hour).padStart(2, '0')}:${reminderMinute}`;

    // 2. Save settings to DB & Store
    await setCurrency(selectedCurrency);
    
    if (monthlyBudget.trim()) {
      const budgetAmount = parseFloat(monthlyBudget);
      if (!isNaN(budgetAmount) && budgetAmount > 0) {
        await saveBudget('monthly', budgetAmount, true);
      }
    }

    // Update notifications in settings DB
    await updateReminderSettings({
      dailyReminderEnabled: true,
      dailyReminderTime: time24h,
      budgetAlertsEnabled: true,
    });

    // Schedule notifications if granted
    if (isNotifGranted) {
      await notificationService.scheduleDailyReminder(true, time24h);
      await notificationService.scheduleWeeklyReport(true, 0, reminderSettings.weeklyReportTime); // Sunday
      await notificationService.scheduleMonthlyReport(true, reminderSettings.monthlyReportTime);
    }

    // 3. Mark onboarding complete and redirect
    await setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  const renderSlides = () => {
    const slide = SLIDES[currentSlide];
    return (
      <View style={styles.slideContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: common.primaryLight }]}>
          <Ionicons name={slide.icon as any} size={64} color={common.primary} />
        </View>
        <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
        <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{slide.desc}</Text>
        
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                { backgroundColor: index === currentSlide ? common.primary : colors.border }
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };

  const renderSetup = () => {
    return (
      <ScrollView contentContainerStyle={styles.setupScrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.setupTitle, { color: colors.text }]}>Personalize SpendFlow</Text>
        <Text style={[styles.setupDesc, { color: colors.textSecondary }]}>
          Set up your preferences to start tracking. You can change these anytime in Settings.
        </Text>

        {/* Currency selection */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>DEFAULT CURRENCY</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.symbol}
                style={[
                  styles.currencyChip,
                  { 
                    borderColor: selectedCurrency === curr.symbol ? common.primary : colors.border,
                    backgroundColor: selectedCurrency === curr.symbol ? common.primaryLight : colors.card,
                  }
                ]}
                onPress={() => setSelectedCurrency(curr.symbol)}
              >
                <Text 
                  style={[
                    styles.currencyChipText, 
                    { color: selectedCurrency === curr.symbol ? common.primary : colors.text }
                  ]}
                >
                  {curr.symbol} ({curr.name})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Monthly Budget */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>MONTHLY SPENDING LIMIT (OPTIONAL)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.inputPrefix, { color: colors.text }]}>{selectedCurrency}</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 15,000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={monthlyBudget}
              onChangeText={setMonthlyBudget}
            />
          </View>
        </View>

        {/* Daily Reminder Time */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>DAILY REVIEW REMINDER TIME</Text>
          <View style={styles.timeSelectorRow}>
            {/* Hour select */}
            <View style={[styles.timePartWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.timeInput, { color: colors.text }]}
                keyboardType="numeric"
                maxLength={2}
                value={reminderHour}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  setReminderHour(cleaned);
                }}
                onBlur={() => {
                  let h = parseInt(reminderHour, 10);
                  if (isNaN(h) || h < 1) h = 12;
                  if (h > 12) h = 12;
                  setReminderHour(String(h).padStart(2, '0'));
                }}
              />
            </View>
            <Text style={[styles.timeColon, { color: colors.text }]}>:</Text>
            {/* Minute select */}
            <View style={[styles.timePartWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.timeInput, { color: colors.text }]}
                keyboardType="numeric"
                maxLength={2}
                value={reminderMinute}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '');
                  setReminderMinute(cleaned);
                }}
                onBlur={() => {
                  let m = parseInt(reminderMinute, 10);
                  if (isNaN(m) || m < 0) m = 0;
                  if (m > 59) m = 59;
                  setReminderMinute(String(m).padStart(2, '0'));
                }}
              />
            </View>
            
            {/* AM / PM Toggle */}
            <View style={styles.ampmWrapper}>
              <TouchableOpacity
                style={[
                  styles.ampmButton,
                  { 
                    backgroundColor: reminderAmpm === 'AM' ? common.primary : colors.card,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setReminderAmpm('AM')}
              >
                <Text style={{ color: reminderAmpm === 'AM' ? '#FFF' : colors.text, fontWeight: 'bold' }}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ampmButton,
                  { 
                    backgroundColor: reminderAmpm === 'PM' ? common.primary : colors.card,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setReminderAmpm('PM')}
              >
                <Text style={{ color: reminderAmpm === 'PM' ? '#FFF' : colors.text, fontWeight: 'bold' }}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications request button */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>DAILY REMINDERS</Text>
          <TouchableOpacity
            style={[
              styles.notifButton,
              { 
                backgroundColor: isNotifGranted ? common.primaryLight : colors.card,
                borderColor: isNotifGranted ? common.primary : colors.border
              }
            ]}
            onPress={handleRequestNotifications}
          >
            <Ionicons 
              name={isNotifGranted ? 'notifications' : 'notifications-outline' as any} 
              size={20} 
              color={isNotifGranted ? common.primary : colors.textSecondary} 
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: isNotifGranted ? common.primary : colors.text, fontWeight: '600' }}>
              {isNotifGranted ? 'Notifications Allowed' : 'Enable Scheduled Reminders'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const isSetupScreen = currentSlide === 3;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          {currentSlide > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>SpendFlow</Text>
          {isSetupScreen && (
            <TouchableOpacity onPress={handleFinish} style={styles.skipButton}>
              <Text style={{ color: common.primary, fontWeight: '600' }}>Skip Setup</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentBody}>
          {isSetupScreen ? renderSetup() : renderSlides()}
        </View>

        <View style={styles.footer}>
          {!isSetupScreen ? (
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: common.primary }]} 
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: common.primary }]} 
              onPress={handleFinish}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  skipButton: {
    padding: 4,
  },
  contentBody: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  setupScrollContainer: {
    paddingVertical: 10,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  setupDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currencyChip: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  currencyChipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePartWrapper: {
    width: 60,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  timeColon: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  ampmWrapper: {
    flexDirection: 'row',
    marginLeft: 20,
  },
  ampmButton: {
    width: 48,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  notifButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  footer: {
    padding: 20,
  },
  primaryButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
