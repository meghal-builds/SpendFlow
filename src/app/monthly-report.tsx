import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { formatToReadableDate, formatToReadableTime, getStartAndEndOfMonth, getPreviousMonthDateRange, getMonthName } from '../utils/dateHelpers';
import { formatIndianCurrency } from '../utils/format';
import { 
  calculateTotal,
  filterExpensesByDateRange,
  calculateCategoryTotals,
  getHighestSpendingDay,
  calculatePercentageChange
} from '../utils/calculations';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { CATEGORY_COLORS } from './(tabs)/index';

export default function MonthlyReport() {
  const { colors, common, shadows } = useTheme();

  // Store data
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);

  // Active Month (current month)
  const todayStr = new Date().toISOString();
  const { start, end } = getStartAndEndOfMonth(todayStr);
  const currentMonthExpenses = filterExpensesByDateRange(expenses, start, end);
  const currentMonthTotal = calculateTotal(currentMonthExpenses);
  const transactionCount = currentMonthExpenses.length;
  
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyAverage = currentMonthTotal / daysInMonth;

  // Previous Month
  const { start: prevStart, end: prevEnd } = getPreviousMonthDateRange(start);
  const prevMonthExpenses = filterExpensesByDateRange(expenses, prevStart, prevEnd);
  const prevMonthTotal = calculateTotal(prevMonthExpenses);

  // Percentage Change
  const percentageChange = calculatePercentageChange(currentMonthTotal, prevMonthTotal);
  const isIncrease = percentageChange > 0;

  // Highest spending day
  const highestDayObj = getHighestSpendingDay(currentMonthExpenses);

  // Top 5 Biggest expenses
  const topFiveExpenses = [...currentMonthExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const categoryTotals = calculateCategoryTotals(currentMonthExpenses);

  // Chart data
  const donutData = categoryTotals.map((ct) => {
    const cat = categories.find((c) => c.id === ct.categoryId);
    return {
      name: cat ? cat.name : 'Other',
      amount: ct.amount,
      percentage: ct.percentage,
      color: CATEGORY_COLORS[ct.categoryId] || CATEGORY_COLORS.cat_other,
    };
  });

  const getWeeklyBarData = () => {
    const weeks = [
      { label: 'Week 1', value: 0 },
      { label: 'Week 2', value: 0 },
      { label: 'Week 3', value: 0 },
      { label: 'Week 4', value: 0 },
    ];

    for (const exp of currentMonthExpenses) {
      const day = new Date(exp.expenseDate).getDate();
      if (day <= 7) weeks[0].value += exp.amount;
      else if (day <= 14) weeks[1].value += exp.amount;
      else if (day <= 21) weeks[2].value += exp.amount;
      else weeks[3].value += exp.amount;
    }
    return weeks;
  };

  const barChartData = getWeeklyBarData();

  // Find highest spending week
  const highestWeekObj = barChartData.reduce((max, w) => w.value > max.value ? w : max, barChartData[0]);

  // Grouped expenses list
  const getGroupedSections = () => {
    const groups: Record<string, { date: string; total: number; data: any[] }> = {};
    for (const exp of currentMonthExpenses) {
      const dateStr = exp.expenseDate.substring(0, 10);
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, total: 0, data: [] };
      }
      groups[dateStr].total += exp.amount;
      groups[dateStr].data.push(exp);
    }
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  };

  const sections = getGroupedSections();

  const getCategoryDetails = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      name: cat ? cat.name : 'Other',
      icon: cat ? cat.icon : 'ellipsis-horizontal',
      color: CATEGORY_COLORS[catId] || CATEGORY_COLORS.cat_other,
    };
  };

  const formattedMonthLabel = () => {
    const d = new Date();
    return `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Monthly Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{formattedMonthLabel()} Report</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Monthly Expense Statement</Text>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>TOTAL MONTHLY SPENDING</Text>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {formatIndianCurrency(currentMonthTotal, currency)}
          </Text>
          
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Daily Average</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatIndianCurrency(dailyAverage, currency)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Transactions</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{transactionCount}</Text>
            </View>
          </View>

          {prevMonthTotal > 0 && (
            <View style={[styles.percentageRow, { borderTopColor: colors.border }]}>
              <Ionicons 
                name={isIncrease ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={isIncrease ? common.danger : common.primary} 
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.percentageText, { color: isIncrease ? common.danger : common.primary }]}>
                {Math.round(Math.abs(percentageChange))}% {isIncrease ? 'more' : 'less'} than last month
              </Text>
            </View>
          )}
        </View>

        {currentMonthExpenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses recorded this month.
            </Text>
          </View>
        ) : (
          <>
            {/* Insights Grid */}
            <View style={styles.insightsGrid}>
              {highestDayObj && highestDayObj.amount > 0 && (
                <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Text style={[styles.insightBoxLabel, { color: colors.textSecondary }]}>PEAK SPENDING DAY</Text>
                  <Text style={[styles.insightBoxVal, { color: colors.text }]}>
                    {new Date(highestDayObj.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={[styles.insightBoxSub, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(highestDayObj.amount, currency)} spent
                  </Text>
                </View>
              )}
              {highestWeekObj && highestWeekObj.value > 0 && (
                <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Text style={[styles.insightBoxLabel, { color: colors.textSecondary }]}>PEAK SPENDING WEEK</Text>
                  <Text style={[styles.insightBoxVal, { color: colors.text }]}>{highestWeekObj.label}</Text>
                  <Text style={[styles.insightBoxSub, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(highestWeekObj.value, currency)} spent
                  </Text>
                </View>
              )}
            </View>

            {/* Weekly trend bar chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Distribution</Text>
              <BarChart data={barChartData} currencySymbol={currency} />
            </View>

            {/* Category breakdown donut chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Distribution</Text>
              <DonutChart data={donutData} total={currentMonthTotal} currencySymbol={currency} />
              
              <View style={styles.progressContainer}>
                {categoryTotals.slice(0, 5).map((item) => {
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
            </View>

            {/* Top 5 Biggest Expenses */}
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Top 5 Biggest Expenses</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }, shadows]}>
              {topFiveExpenses.map((item, index) => {
                const catDetails = getCategoryDetails(item.categoryId);
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.expenseListItem, 
                      { borderBottomColor: index === topFiveExpenses.length - 1 ? 'transparent' : colors.border }
                    ]}
                  >
                    <View style={[styles.itemIconRing, { backgroundColor: catDetails.color + '15' }]}>
                      <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                        {formatToReadableDate(item.expenseDate)} {item.paymentMethod ? `• ${item.paymentMethod}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                      -{formatIndianCurrency(item.amount, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Full Transaction list grouped by day */}
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>All Transactions ({formattedMonthLabel()})</Text>
            {sections.slice(0, 10).map((sec) => ( // limit to latest 10 days for performance in summary page
              <View key={sec.date} style={styles.dayGroupContainer}>
                <View style={[styles.dayGroupHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dayGroupDate, { color: colors.text }]}>
                    {formatToReadableDate(sec.date)}
                  </Text>
                  <Text style={[styles.dayGroupTotal, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(sec.total, currency)}
                  </Text>
                </View>
                
                <View style={[styles.dayGroupList, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  {sec.data.map((item, index) => {
                    const catDetails = getCategoryDetails(item.categoryId);
                    return (
                      <View 
                        key={item.id} 
                        style={[
                          styles.expenseListItem, 
                          { borderBottomColor: index === sec.data.length - 1 ? 'transparent' : colors.border }
                        ]}
                      >
                        <View style={[styles.itemIconRing, { backgroundColor: catDetails.color + '15' }]}>
                          <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.description}
                          </Text>
                          <Text style={[styles.itemMetaText, { color: colors.textSecondary }]}>
                            {formatToReadableTime(item.expenseDate)} {item.paymentMethod ? `• ${item.paymentMethod}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.itemAmount, { color: colors.text }]}>
                          -{formatIndianCurrency(item.amount, currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 4,
  },
  insightBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  insightBoxVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  insightBoxSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  progressContainer: {
    marginTop: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 12,
  },
  dayGroupContainer: {
    marginBottom: 16,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  dayGroupDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayGroupTotal: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayGroupList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  expenseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  itemMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
