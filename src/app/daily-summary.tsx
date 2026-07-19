import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Modal,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { formatToReadableTime } from '../utils/dateHelpers';
import { formatIndianCurrency } from '../utils/format';
import { 
  getTodayExpenses, 
  getYesterdayExpenses, 
  calculateTotal, 
  calculateCategoryTotals,
  getHighestExpense
} from '../utils/calculations';
import { CATEGORY_COLORS } from './(tabs)/index';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withDelay, 
  runOnJS 
} from 'react-native-reanimated';

export default function DailySummary() {
  const { colors, common, shadows } = useTheme();

  // Store data
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);

  // States
  const [celebrate, setCelebrate] = useState(false);
  const celebrateScale = useSharedValue(0);

  // Calculations for Today
  const todayExpenses = getTodayExpenses(expenses);
  const yesterdayExpenses = getYesterdayExpenses(expenses);
  
  const todayTotal = calculateTotal(todayExpenses);
  const yesterdayTotal = calculateTotal(yesterdayExpenses);
  const transactionCount = todayExpenses.length;
  
  const highestExpense = getHighestExpense(todayExpenses);
  const categoryTotals = calculateCategoryTotals(todayExpenses);
  const mostUsedCategoryObj = categoryTotals[0];
  const mostUsedCategory = mostUsedCategoryObj 
    ? categories.find(c => c.id === mostUsedCategoryObj.categoryId)
    : null;

  // Comparison
  const diff = todayTotal - yesterdayTotal;
  const isLess = diff < 0;

  const handleEverythingAdded = () => {
    setCelebrate(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Scale animation for celebration checkmark
    celebrateScale.value = withSequence(
      withSpring(1, { damping: 8, stiffness: 100 }),
      withDelay(1500, withSpring(0, {}, (finished) => {
        if (finished) {
          runOnJS(closeAndGoHome)();
        }
      }))
    );
  };

  const closeAndGoHome = () => {
    setCelebrate(false);
    router.replace('/(tabs)');
  };

  const celebrateStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrateScale.value }],
  }));

  const getCategoryDetails = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      name: cat ? cat.name : 'Other',
      icon: cat ? cat.icon : 'ellipsis-horizontal',
      color: CATEGORY_COLORS[catId] || CATEGORY_COLORS.cat_other,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Date Title */}
        <Text style={[styles.dateTitle, { color: colors.text }]}>
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
        </Text>
        <Text style={[styles.dateSubtitle, { color: colors.textSecondary }]}>
          Here is your spending outline for today.
        </Text>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>TOTAL SPENT TODAY</Text>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {formatIndianCurrency(todayTotal, currency)}
          </Text>
          <Text style={[styles.cardSubText, { color: colors.textSecondary }]}>
            Across {transactionCount} transactions.
          </Text>

          {yesterdayTotal > 0 && (
            <View style={[styles.compareRow, { borderTopColor: colors.border }]}>
              <Ionicons 
                name={isLess ? 'trending-down' : 'trending-up'} 
                size={16} 
                color={isLess ? common.primary : common.danger} 
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: isLess ? common.primary : common.danger, fontWeight: '600', fontSize: 13 }}>
                {isLess 
                  ? `${formatIndianCurrency(Math.abs(diff), currency)} less than yesterday`
                  : `${formatIndianCurrency(diff, currency)} more than yesterday`
                }
              </Text>
            </View>
          )}
        </View>

        {todayExpenses.length > 0 && (
          <>
            {/* Quick Metrics */}
            <View style={styles.metricsGrid}>
              {highestExpense && (
                <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Ionicons name="trending-up" size={20} color={common.danger} style={{ marginBottom: 6 }} />
                  <Text style={[styles.metricBoxLabel, { color: colors.textSecondary }]}>Highest Expense</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.text }]} numberOfLines={1}>
                    {highestExpense.description}
                  </Text>
                  <Text style={[styles.metricBoxSubText, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(highestExpense.amount, currency)}
                  </Text>
                </View>
              )}
              {mostUsedCategory && (
                <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Ionicons name={mostUsedCategory.icon as any} size={20} color={common.primary} style={{ marginBottom: 6 }} />
                  <Text style={[styles.metricBoxLabel, { color: colors.textSecondary }]}>Top Category</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.text }]} numberOfLines={1}>
                    {mostUsedCategory.name}
                  </Text>
                  <Text style={[styles.metricBoxSubText, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(mostUsedCategoryObj.amount, currency)}
                  </Text>
                </View>
              )}
            </View>

            {/* Category summary progress bars */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
              {categoryTotals.map((item) => {
                const cat = getCategoryDetails(item.categoryId);
                return (
                  <View key={item.categoryId} style={styles.progressRow}>
                    <View style={styles.progressLabelRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.bulletPoint, { backgroundColor: cat.color }]} />
                        <Text style={[styles.progressName, { color: colors.text }]}>{cat.name}</Text>
                      </View>
                      <Text style={[styles.progressValue, { color: colors.text }]}>
                        {formatIndianCurrency(item.amount, currency)} ({item.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Transactions List */}
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>{"Today's Expenses"}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }, shadows]}>
              {todayExpenses.map((item, index) => {
                const catDetails = getCategoryDetails(item.categoryId);
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.expenseListItem, 
                      { borderBottomColor: index === todayExpenses.length - 1 ? 'transparent' : colors.border }
                    ]}
                  >
                    <View style={[styles.itemIconRing, { backgroundColor: catDetails.color + '15' }]}>
                      <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                          {formatToReadableTime(item.expenseDate)}
                        </Text>
                        {item.paymentMethod && (
                          <>
                            <Text style={[styles.bullet, { color: colors.textSecondary }]}>•</Text>
                            <Text style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                              {item.paymentMethod}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                      -{formatIndianCurrency(item.amount, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {todayExpenses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses recorded today. Did you forget to add something?
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtnSecondary, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push('/add-expense')}
          >
            <Ionicons name="add" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnTextSecondary, { color: colors.text }]}>Add Missing Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtnPrimary, { backgroundColor: common.primary }]}
            onPress={handleEverythingAdded}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextPrimary}>Everything Added</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Celebration Modal overlay */}
      <Modal transparent visible={celebrate} animationType="fade">
        <View style={[styles.celebrateOverlay, { backgroundColor: 'rgba(16,185,129,0.95)' }]}>
          <Animated.View style={[styles.celebrateCard, celebrateStyle]}>
            <View style={styles.celebrateRing}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.celebrateTitle}>All Caught Up!</Text>
            <Text style={styles.celebrateSubtitle}>
              {"Great job maintaining your logs. Let's keep SpendFlowing!"}
            </Text>
          </Animated.View>
        </View>
      </Modal>

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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 20,
  },
  dateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  dateSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 13,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 4,
  },
  metricBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricBoxValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricBoxSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  progressRow: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  progressName: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10,
  },
  expenseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIconRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemMetaText: {
    fontSize: 11,
  },
  bullet: {
    marginHorizontal: 4,
    fontSize: 10,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtnTextPrimary: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  celebrateOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrateCard: {
    width: 300,
    borderRadius: 24,
    backgroundColor: '#FFF',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  celebrateRing: {
    marginBottom: 20,
  },
  celebrateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  celebrateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
