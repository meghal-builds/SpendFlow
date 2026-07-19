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
import { formatToReadableDate, formatToReadableTime, getStartAndEndOfWeek, getPreviousWeekDateRange, getMonthName } from '../utils/dateHelpers';
import { formatIndianCurrency } from '../utils/format';
import { 
  calculateTotal,
  filterExpensesByDateRange,
  calculateCategoryTotals,
  calculateDailyTotals,
  getHighestSpendingDay,
  calculatePercentageChange
} from '../utils/calculations';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { CATEGORY_COLORS } from './(tabs)/index';

export default function WeeklyReport() {
  const { colors, common, shadows } = useTheme();

  // Store data
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);

  // Active Week (current week)
  const { start, end } = getStartAndEndOfWeek();
  const currentWeekExpenses = filterExpensesByDateRange(expenses, start, end);
  const currentWeekTotal = calculateTotal(currentWeekExpenses);
  const transactionCount = currentWeekExpenses.length;
  const dailyAverage = currentWeekTotal / 7;

  // Previous Week
  const { start: prevStart, end: prevEnd } = getPreviousWeekDateRange(start);
  const prevWeekExpenses = filterExpensesByDateRange(expenses, prevStart, prevEnd);
  const prevWeekTotal = calculateTotal(prevWeekExpenses);

  // Percentage Change
  const percentageChange = calculatePercentageChange(currentWeekTotal, prevWeekTotal);
  const isIncrease = percentageChange > 0;

  // Highest spending day
  const highestDayObj = getHighestSpendingDay(currentWeekExpenses);
  
  // Lowest spending day (find day with minimum spend)
  const getLowestSpendingDayName = () => {
    if (currentWeekExpenses.length === 0) return null;
    const dailyTotals = calculateDailyTotals(currentWeekExpenses, start, end);
    // Find min amount
    let minDay = dailyTotals[0];
    for (const dt of dailyTotals) {
      if (dt.amount < minDay.amount) {
        minDay = dt;
      }
    }
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      dayName: weekdays[new Date(minDay.date).getDay()],
      amount: minDay.amount
    };
  };

  const lowestDayObj = getLowestSpendingDayName();

  const categoryTotals = calculateCategoryTotals(currentWeekExpenses);

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

  const getBarData = () => {
    const dailyTotals = calculateDailyTotals(currentWeekExpenses, start, end);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dailyTotals.map((dt) => {
      const dayIndex = new Date(dt.date).getDay();
      return {
        label: weekdays[dayIndex],
        value: dt.amount,
      };
    });
  };

  const barChartData = getBarData();

  // Grouped expenses list
  const getGroupedSections = () => {
    const groups: Record<string, { date: string; total: number; data: any[] }> = {};
    for (const exp of currentWeekExpenses) {
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

  const formattedWeekLabel = () => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getDate()} ${getMonthName(s.getMonth()).substring(0, 3)} - ${e.getDate()} ${getMonthName(e.getMonth()).substring(0, 3)} ${e.getFullYear()}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Weekly Summary</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{formattedWeekLabel()}</Text>

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>TOTAL SPENT THIS WEEK</Text>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {formatIndianCurrency(currentWeekTotal, currency)}
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

          {prevWeekTotal > 0 && (
            <View style={[styles.percentageRow, { borderTopColor: colors.border }]}>
              <Ionicons 
                name={isIncrease ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={isIncrease ? common.danger : common.primary} 
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.percentageText, { color: isIncrease ? common.danger : common.primary }]}>
                {Math.round(Math.abs(percentageChange))}% {isIncrease ? 'more' : 'less'} than last week
              </Text>
            </View>
          )}
        </View>

        {currentWeekExpenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses recorded this week.
            </Text>
          </View>
        ) : (
          <>
            {/* Insights and Stats Grid */}
            <View style={styles.insightsGrid}>
              {highestDayObj && highestDayObj.amount > 0 && (
                <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Text style={[styles.insightBoxLabel, { color: colors.textSecondary }]}>HIGHEST SPENDING DAY</Text>
                  <Text style={[styles.insightBoxVal, { color: colors.text }]}>
                    {new Date(highestDayObj.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                  </Text>
                  <Text style={[styles.insightBoxSub, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(highestDayObj.amount, currency)} spent
                  </Text>
                </View>
              )}
              {lowestDayObj && (
                <View style={[styles.insightBox, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                  <Text style={[styles.insightBoxLabel, { color: colors.textSecondary }]}>LOWEST SPENDING DAY</Text>
                  <Text style={[styles.insightBoxVal, { color: colors.text }]}>{lowestDayObj.dayName}</Text>
                  <Text style={[styles.insightBoxSub, { color: colors.textSecondary }]}>
                    {formatIndianCurrency(lowestDayObj.amount, currency)} spent
                  </Text>
                </View>
              )}
            </View>

            {/* Daily trend bar chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Spend Trend</Text>
              <BarChart data={barChartData} currencySymbol={currency} />
            </View>

            {/* Category breakdown donut chart */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Share</Text>
              <DonutChart data={donutData} total={currentWeekTotal} currencySymbol={currency} />
              
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

            {/* Grouped list of transactions */}
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Weekly Transactions</Text>
            {sections.map((sec) => (
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
