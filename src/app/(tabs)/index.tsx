import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  LayoutAnimation
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { 
  getTodayExpenses, 
  getYesterdayExpenses, 
  calculateTotal, 
  calculateCategoryTotals 
} from '../../utils/calculations';
import { formatIndianCurrency } from '../../utils/format';
import { formatToReadableTime } from '../../utils/dateHelpers';
import DonutChart from '../..//components/charts/DonutChart';
import * as Haptics from 'expo-haptics';

export const CATEGORY_COLORS: Record<string, string> = {
  cat_food: '#FF6B6B',
  cat_travel: '#4DABF7',
  cat_shopping: '#FCC419',
  cat_bills: '#20C997',
  cat_entertainment: '#AE3EC9',
  cat_health: '#FA5252',
  cat_education: '#748FFC',
  cat_rent: '#94D82D',
  cat_recharge: '#FF922B',
  cat_groceries: '#51CF66',
  cat_personal: '#15AABF',
  cat_other: '#868E96',
};

export default function HomeDashboard() {
  const { colors, common, shadows } = useTheme();
  
  // Store values
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const budgets = useAppStore((state) => state.budgets);
  const currency = useAppStore((state) => state.currency);

  // States
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  const [showChecklist, setShowChecklist] = useState(() => {
    const hour = new Date().getHours();
    return hour >= 18;
  });

  // Today & Yesterday totals
  const todayExpenses = getTodayExpenses(expenses);
  const yesterdayExpenses = getYesterdayExpenses(expenses);

  const todayTotal = calculateTotal(todayExpenses);
  const yesterdayTotal = calculateTotal(yesterdayExpenses);
  const todayCount = todayExpenses.length;

  // Comparison logic
  const difference = todayTotal - yesterdayTotal;
  const isLess = difference < 0;
  const diffText = difference === 0 
    ? 'Same as yesterday' 
    : `${formatIndianCurrency(Math.abs(difference), currency)} ${isLess ? 'less' : 'more'} than yesterday`;

  // Budget calculations
  const dailyBudget = budgets.find((b) => b.period === 'daily' && b.enabled);
  const budgetAmount = dailyBudget ? dailyBudget.amount : 0;
  const budgetProgress = budgetAmount > 0 ? Math.min(1, todayTotal / budgetAmount) : 0;
  const isBudgetExceeded = todayTotal > budgetAmount;
  const budgetRemaining = budgetAmount - todayTotal;

  // Recent expenses (latest 5)
  const recentExpenses = expenses.slice(0, 5);

  // Category breakdown for Donut Chart
  const categoryTotals = calculateCategoryTotals(todayExpenses);
  
  const donutData = categoryTotals.map((ct) => {
    const cat = categories.find((c) => c.id === ct.categoryId);
    return {
      name: cat ? cat.name : 'Other',
      amount: ct.amount,
      percentage: ct.percentage,
      color: CATEGORY_COLORS[ct.categoryId] || CATEGORY_COLORS.cat_other,
    };
  });

  const handleDismissChecklist = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowChecklist(false);
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const getCategoryIconAndName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      name: cat ? cat.name : 'Other',
      icon: cat ? cat.icon : 'ellipsis-horizontal',
      color: CATEGORY_COLORS[catId] || CATEGORY_COLORS.cat_other,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.dateText, { color: colors.text }]}>{formattedDate}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.headerIconButton, { borderColor: colors.border }]}
              onPress={() => router.push('/daily-summary')}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {todayCount > 0 && <View style={[styles.notifBadge, { backgroundColor: common.primary }]} />}
            </TouchableOpacity>
            
            <View style={[styles.avatarCircle, { backgroundColor: common.primaryLight }]}>
              <Text style={[styles.avatarText, { color: common.primary }]}>SF</Text>
            </View>
          </View>
        </View>

        {/* Today's Expense Card */}
        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{"TODAY'S SPENDING"}</Text>
          <Text style={[styles.metricAmount, { color: colors.text }]}>
            {formatIndianCurrency(todayTotal, currency)}
          </Text>
          
          <View style={styles.metricStatsRow}>
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}> {todayCount} transactions</Text>
            </View>
            <Text style={[styles.statDiffText, { color: isLess || difference === 0 ? common.primary : common.danger }]}>
              {diffText}
            </Text>
          </View>

          {/* Budget progress bar */}
          {dailyBudget && budgetAmount > 0 && (
            <View style={styles.budgetProgressContainer}>
              <View style={styles.budgetTextRow}>
                <Text style={[styles.budgetText, { color: colors.textSecondary }]}>Daily Budget Progress</Text>
                <Text style={[styles.budgetText, { color: isBudgetExceeded ? common.danger : colors.text, fontWeight: 'bold' }]}>
                  {formatIndianCurrency(todayTotal, currency)} / {formatIndianCurrency(budgetAmount, currency)}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${budgetProgress * 100}%`,
                      backgroundColor: isBudgetExceeded ? common.danger : common.primary 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.budgetRemainingText, { color: isBudgetExceeded ? common.danger : common.primary }]}>
                {isBudgetExceeded 
                  ? `${formatIndianCurrency(Math.abs(budgetRemaining), currency)} over budget`
                  : `${formatIndianCurrency(budgetRemaining, currency)} remaining`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Quick Add Expense CTA Button */}
        <TouchableOpacity
          style={[styles.quickAddButton, { backgroundColor: common.primary }]}
          activeOpacity={0.9}
          onPress={() => router.push('/add-expense')}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.quickAddText}>Add Expense</Text>
        </TouchableOpacity>

        {/* End-of-Day Checklist Card */}
        {showChecklist && (
          <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
            <View style={styles.checklistHeader}>
              <Ionicons name="checkbox-outline" size={20} color={common.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.checklistTitle, { color: colors.text }]}>Evening Checklist</Text>
            </View>
            <Text style={[styles.checklistBody, { color: colors.textSecondary }]}>
              Have you added all of today’s expenses? Keeping it updated daily helps you track budgets better.
            </Text>
            <View style={styles.checklistButtonsRow}>
              <TouchableOpacity 
                style={[styles.checklistBtnSecondary, { borderColor: colors.border }]} 
                onPress={() => router.push('/add-expense')}
              >
                <Text style={[styles.checklistBtnTextSecondary, { color: colors.text }]}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.checklistBtnPrimary, { backgroundColor: common.primary }]} 
                onPress={handleDismissChecklist}
              >
                <Text style={styles.checklistBtnTextPrimary}>Yes, Everything Added</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Category summary donut chart */}
        <View style={[styles.sectionContainer, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{"Today's Breakdown"}</Text>
          <View style={styles.donutSection}>
            <DonutChart data={donutData} total={todayTotal} currencySymbol={currency} />
            
            {donutData.length > 0 && (
              <View style={styles.legendContainer}>
                {donutData.slice(0, 4).map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendIndicator, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                      {item.percentage}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Recent Expenses List */}
        <View style={styles.recentSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={{ color: common.primary, fontWeight: '600' }}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.recentExpensesList, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          {recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses added yet</Text>
              <TouchableOpacity 
                style={[styles.emptyAddBtn, { backgroundColor: common.primary }]}
                onPress={() => router.push('/add-expense')}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Add your first expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentExpenses.map((item, index) => {
              const catDetails = getCategoryIconAndName(item.categoryId);
              return (
                <View 
                  key={item.id} 
                  style={[
                    styles.expenseListItem, 
                    { borderBottomColor: index === recentExpenses.length - 1 ? 'transparent' : colors.border }
                  ]}
                >
                  <View style={[styles.itemIconRing, { backgroundColor: catDetails.color + '15' }]}>
                    <Ionicons name={catDetails.icon as any} size={20} color={catDetails.color} />
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
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  metricAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDiffText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetProgressContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  budgetTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetText: {
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetRemainingText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  quickAddButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickAddText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checklistCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  checklistBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  checklistButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  checklistBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
  },
  checklistBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
  checklistBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  checklistBtnTextPrimary: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  donutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentExpensesList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  expenseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: 'bold',
  },
});
