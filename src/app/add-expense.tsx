import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { showAlert } from '../utils/alert';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withDelay, 
  runOnJS 
} from 'react-native-reanimated';

// Auto mapping helper
const KEYWORD_TO_CATEGORY: Record<string, string> = {
  lunch: 'cat_food',
  dinner: 'cat_food',
  breakfast: 'cat_food',
  food: 'cat_food',
  restaurant: 'cat_food',
  tea: 'cat_food',
  coffee: 'cat_food',
  burger: 'cat_food',
  pizza: 'cat_food',
  uber: 'cat_travel',
  ola: 'cat_travel',
  metro: 'cat_travel',
  cab: 'cat_travel',
  auto: 'cat_travel',
  train: 'cat_travel',
  flight: 'cat_travel',
  bus: 'cat_travel',
  recharge: 'cat_recharge',
  mobile: 'cat_recharge',
  jio: 'cat_recharge',
  airtel: 'cat_recharge',
  medicine: 'cat_health',
  gym: 'cat_health',
  doctor: 'cat_health',
  hospital: 'cat_health',
  pharmacy: 'cat_health',
  book: 'cat_education',
  course: 'cat_education',
  college: 'cat_education',
  school: 'cat_education',
  fees: 'cat_education',
  netflix: 'cat_entertainment',
  movie: 'cat_entertainment',
  spotify: 'cat_entertainment',
  game: 'cat_entertainment',
  rent: 'cat_rent',
  pg: 'cat_rent',
  room: 'cat_rent',
  flat: 'cat_rent',
  groceries: 'cat_groceries',
  grocery: 'cat_groceries',
  milk: 'cat_groceries',
  supermarket: 'cat_groceries',
  shopping: 'cat_shopping',
  amazon: 'cat_shopping',
  myntra: 'cat_shopping',
  zara: 'cat_shopping',
  electricity: 'cat_bills',
  water: 'cat_bills',
  gas: 'cat_bills',
  bill: 'cat_bills',
};

const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Other'];

export default function AddExpense() {
  const { colors, common } = useTheme();
  
  // Store values
  const addExpense = useAppStore((state) => state.addExpense);
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('cat_other');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() => {
    const lastPayment = expenses.find((e) => e.paymentMethod)?.paymentMethod;
    return lastPayment || 'UPI';
  });
  const [note, setNote] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<{
    description: string;
    amount: number;
    categoryId: string;
    paymentMethod?: string;
  }[]>([]);

  // Animation & Success State
  const [isSuccess, setIsSuccess] = useState(false);
  const successScale = useSharedValue(0);

  // Handle Autocomplete & Smart Category Matching
  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    // 1. Smart Category Auto-Suggestion based on keywords
    const lowerText = text.toLowerCase();
    for (const [keyword, catId] of Object.entries(KEYWORD_TO_CATEGORY)) {
      if (lowerText.includes(keyword)) {
        // If the category exists in user categories, set it
        const catExists = categories.some((c) => c.id === catId);
        if (catExists) {
          setSelectedCategoryId(catId);
          break;
        }
      }
    }

    // 2. Previous Expense Autocomplete suggestions
    const matched = expenses
      .filter((e) => e.description.toLowerCase().startsWith(lowerText))
      .reduce((unique: typeof suggestions, item) => {
        const alreadyAdded = unique.some((u) => u.description.toLowerCase() === item.description.toLowerCase());
        if (!alreadyAdded) {
          unique.push({
            description: item.description,
            amount: item.amount,
            categoryId: item.categoryId,
            paymentMethod: item.paymentMethod,
          });
        }
        return unique;
      }, [])
      .slice(0, 3); // Max 3 suggestions

    setSuggestions(matched);
  };

  const handleSelectSuggestion = (suggestion: typeof suggestions[0]) => {
    setDescription(suggestion.description);
    setAmount(String(suggestion.amount));
    setSelectedCategoryId(suggestion.categoryId);
    if (suggestion.paymentMethod) {
      setSelectedPaymentMethod(suggestion.paymentMethod);
    }
    setSuggestions([]);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  const executeSave = () => {
    setIsSuccess(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Play Reanimated scale animation
    successScale.value = withSequence(
      withSpring(1, { damping: 10, stiffness: 100 }),
      withDelay(1200, withSpring(0, {}, (finished) => {
        if (finished) {
          runOnJS(handleNavigationBack)();
        }
      }))
    );
  };

  const handleNavigationBack = async () => {
    await addExpense({
      amount: parseFloat(amount),
      description: description.trim(),
      categoryId: selectedCategoryId,
      paymentMethod: selectedPaymentMethod,
      note: note.trim() || undefined,
      expenseDate: expenseDate.toISOString(),
    });
    router.back();
  };

  const handleSave = () => {
    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert('Validation Error', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      showAlert('Validation Error', 'Please tell us what you purchased.');
      return;
    }

    // Duplicate Check Warning (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const recentDuplicate = expenses.find((e) => {
      return (
        e.description.toLowerCase() === description.trim().toLowerCase() &&
        e.amount === parsedAmount &&
        e.expenseDate >= fiveMinutesAgo
      );
    });

    if (recentDuplicate) {
      showAlert(
        'Duplicate Expense Alert',
        'This looks similar to an expense you added recently. Add it anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Anyway', onPress: executeSave },
        ]
      );
    } else {
      executeSave();
    }
  };

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const isDark = colors.background === '#0F1115';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>AMOUNT PAID</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountSymbol, { color: common.primary }]}>{currency}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoFocus
                value={amount}
                onChangeText={(val) => {
                  // Prevent negative inputs
                  const cleaned = val.replace(/[^0-9.]/g, '');
                  // Limit to 2 decimal places
                  if (cleaned.includes('.')) {
                    const parts = cleaned.split('.');
                    if (parts[1] && parts[1].length > 2) return;
                  }
                  setAmount(cleaned);
                }}
              />
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>What did you pay for?</Text>
            <View style={[styles.textInputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="e.g. Lunch at college, Auto fare, Groceries"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={handleDescriptionChange}
              />
            </View>

            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSelectSuggestion(suggestion)}
                  >
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.suggestionText, { color: colors.text }]}>
                      {suggestion.description} ({currency}{suggestion.amount})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Category Chips Selection */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? common.primaryLight : colors.card,
                        borderColor: isSelected ? common.primary : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Ionicons 
                      name={cat.icon as any} 
                      size={18} 
                      color={isSelected ? common.primary : colors.textSecondary} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text 
                      style={[
                        styles.categoryChipText, 
                        { color: isSelected ? common.primary : colors.text }
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.paymentContainer}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodChip,
                      {
                        backgroundColor: isSelected ? common.primary : colors.card,
                        borderColor: isSelected ? common.primary : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <Text 
                      style={[
                        styles.paymentMethodText, 
                        { color: isSelected ? '#FFF' : colors.text }
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date & Time Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Date & Time</Text>
            <TouchableOpacity 
              style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={common.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {expenseDate.toLocaleDateString()} at {expenseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="datetime"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Optional Note */}
          <View style={[styles.fieldGroup, { marginBottom: 40 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Additional Note (Optional)</Text>
            <View style={[styles.textInputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Add details (e.g. shared with Rahul)"
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

        </ScrollView>

        {/* Save Expense Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: common.primary }]}
            onPress={handleSave}
            activeOpacity={0.9}
          >
            <Text style={styles.saveButtonText}>Save Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Reanimated Success Checkmark Modal overlay */}
        <Modal transparent visible={isSuccess} animationType="fade">
          <View style={[styles.successOverlay, { backgroundColor: isDark ? 'rgba(15,17,21,0.95)' : 'rgba(255,255,255,0.95)' }]}>
            <Animated.View style={[styles.successCard, successAnimatedStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.successIconRing, { backgroundColor: common.primaryLight }]}>
                <Ionicons name="checkmark" size={60} color={common.primary} />
              </View>
              <Text style={[styles.successText, { color: colors.text }]}>Expense Saved Successfully</Text>
            </Animated.View>
          </View>
        </Modal>

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
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 20,
  },
  amountContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountSymbol: {
    fontSize: 36,
    fontWeight: 'bold',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'left',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInputWrapper: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    height: 38,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  paymentMethodChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    width: 280,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  successIconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
