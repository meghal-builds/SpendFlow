import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity, 
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { formatIndianCurrency } from '../../utils/format';
import { 
  formatDateString,
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  getPreviousWeekDateRange,
  getPreviousMonthDateRange,
  getMonthName,
  formatToReadableDate
} from '../../utils/dateHelpers';
import { 
  calculateTotal,
  filterExpensesByDateRange,
  calculateCategoryTotals,
  calculateDailyTotals,
  getHighestSpendingDay,
  calculatePercentageChange
} from '../../utils/calculations';
import DonutChart from '../../components/charts/DonutChart';
import BarChart from '../../components/charts/BarChart';
import { CATEGORY_COLORS } from './index';

type Segment = 'daily' | 'weekly' | 'monthly';

export default function ReportsScreen() {
  const { colors, common, shadows } = useTheme();

  // Store values
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);

  // States
  const [activeSegment, setActiveSegment] = useState<Segment>('weekly');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  // Computed Date Range for selected segment and anchor
  const { currentRange, prevRange } = useMemo(() => {
    const dateStr = formatDateString(anchorDate);
    
    if (activeSegment === 'daily') {
      const formattedLabel = anchorDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const prevDate = new Date(anchorDate);
      prevDate.setDate(anchorDate.getDate() - 1);
      const prevStr = formatDateString(prevDate);
      
      return {
        currentRange: { start: dateStr, end: dateStr, label: formattedLabel },
        prevRange: { start: prevStr, end: prevStr }
      };
    } else if (activeSegment === 'weekly') {
      const { start, end } = getStartAndEndOfWeek(dateStr);
      const startDate = new Date(start);
      const endDate = new Date(end);
      const label = `${startDate.getDate()} ${getMonthName(startDate.getMonth()).substring(0, 3)} - ${endDate.getDate()} ${getMonthName(endDate.getMonth()).substring(0, 3)} ${endDate.getFullYear()}`;
      
      const { start: pStart, end: pEnd } = getPreviousWeekDateRange(start);
      
      return {
        currentRange: { start, end, label },
        prevRange: { start: pStart, end: pEnd }
      };
    } else {
      const { start, end } = getStartAndEndOfMonth(dateStr);
      const label = `${getMonthName(anchorDate.getMonth())} ${anchorDate.getFullYear()}`;
      
      const { start: pStart, end: pEnd } = getPreviousMonthDateRange(start);
      
      return {
        currentRange: { start, end, label },
        prevRange: { start: pStart, end: pEnd }
      };
    }
  }, [anchorDate, activeSegment]);

  // Adjust Date Anchor
  const handlePreviousPeriod = () => {
    const newDate = new Date(anchorDate);
    if (activeSegment === 'daily') {
      newDate.setDate(anchorDate.getDate() - 1);
    } else if (activeSegment === 'weekly') {
      newDate.setDate(anchorDate.getDate() - 7);
    } else {
      newDate.setMonth(anchorDate.getMonth() - 1);
    }
    setAnchorDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(anchorDate);
    if (activeSegment === 'daily') {
      newDate.setDate(anchorDate.getDate() + 1);
    } else if (activeSegment === 'weekly') {
      newDate.setDate(anchorDate.getDate() + 7);
    } else {
      newDate.setMonth(anchorDate.getMonth() + 1);
    }
    
    // Prevent going past current date
    const today = new Date();
    if (newDate > today) {
      setAnchorDate(today);
    } else {
      setAnchorDate(newDate);
    }
  };

  // Calculations for current and previous period
  const periodExpenses = filterExpensesByDateRange(expenses, currentRange.start, currentRange.end);
  const prevPeriodExpenses = filterExpensesByDateRange(expenses, prevRange.start, prevRange.end);

  const periodTotal = calculateTotal(periodExpenses);
  const prevPeriodTotal = calculateTotal(prevPeriodExpenses);
  const transCount = periodExpenses.length;

  const percentageChange = calculatePercentageChange(periodTotal, prevPeriodTotal);
  const isIncrease = percentageChange > 0;
  const isSame = percentageChange === 0;

  // Average spending
  let dailyAverage = 0;
  if (activeSegment === 'weekly') {
    dailyAverage = periodTotal / 7;
  } else if (activeSegment === 'monthly') {
    const daysInMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
    dailyAverage = periodTotal / daysInMonth;
  }

  const highestDayObj = getHighestSpendingDay(periodExpenses);
  
  // Category Breakdown totals
  const categoryTotals = calculateCategoryTotals(periodExpenses);
  const highestCategoryObj = categoryTotals[0];
  const highestCategory = highestCategoryObj 
    ? categories.find(c => c.id === highestCategoryObj.categoryId)
    : null;

  // Render donut chart data
  const donutData = categoryTotals.map((ct) => {
    const cat = categories.find((c) => c.id === ct.categoryId);
    return {
      name: cat ? cat.name : 'Other',
      amount: ct.amount,
      percentage: ct.percentage,
      color: CATEGORY_COLORS[ct.categoryId] || CATEGORY_COLORS.cat_other,
    };
  });

  // Render Bar chart data
  const getBarChartData = () => {
    if (activeSegment === 'weekly') {
      const dailyTotals = calculateDailyTotals(periodExpenses, currentRange.start, currentRange.end);
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return dailyTotals.map((dt) => {
        const dayIndex = new Date(dt.date).getDay();
        return {
          label: weekdays[dayIndex],
          value: dt.amount,
        };
      });
    } else if (activeSegment === 'monthly') {
      // Group month into 4 weeks
      // W1: 1-7, W2: 8-14, W3: 15-21, W4: 22+
      const weeks = [
        { label: 'W1', value: 0 },
        { label: 'W2', value: 0 },
        { label: 'W3', value: 0 },
        { label: 'W4', value: 0 },
      ];

      for (const exp of periodExpenses) {
        const day = new Date(exp.expenseDate).getDate();
        if (day <= 7) weeks[0].value += exp.amount;
        else if (day <= 14) weeks[1].value += exp.amount;
        else if (day <= 21) weeks[2].value += exp.amount;
        else weeks[3].value += exp.amount;
      }
      return weeks;
    }
    return [];
  };

  const barChartData = getBarChartData();

  // Generate Written Insights
  const getInsights = () => {
    const insightsList: string[] = [];
    
    if (periodExpenses.length === 0) {
      return ['Add expenses to generate insights.'];
    }

    // Insight 1: Comparison
    if (!isSame) {
      insightsList.push(
        `You spent ${Math.round(Math.abs(percentageChange))}% ${isIncrease ? 'more' : 'less'} than the previous ${activeSegment === 'daily' ? 'day' : activeSegment === 'weekly' ? 'week' : 'month'}.`
      );
    } else if (prevPeriodTotal > 0) {
      insightsList.push(`Your spending was the same as the previous period.`);
    }

    // Insight 2: Highest Category
    if (highestCategory) {
      insightsList.push(
        `Your highest expense category was ${highestCategory.name}, accounting for ${highestCategoryObj.percentage}% of your spending.`
      );
    }

    // Insight 3: Highest day
    if (activeSegment === 'weekly' && highestDayObj && highestDayObj.amount > 0) {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = weekdays[new Date(highestDayObj.date).getDay()];
      insightsList.push(`You spent the most on ${dayName} (${formatIndianCurrency(highestDayObj.amount, currency)}).`);
    } else if (activeSegment === 'monthly' && periodExpenses.length > 0) {
      // Find highest week
      const barData = getBarChartData();
      const highestWeek = barData.reduce((max, w) => w.value > max.value ? w : max, barData[0]);
      if (highestWeek && highestWeek.value > 0) {
        const weekName = highestWeek.label === 'W1' ? '1st week (1-7)' : highestWeek.label === 'W2' ? '2nd week (8-14)' : highestWeek.label === 'W3' ? '3rd week (15-21)' : '4th week (22+)';
        insightsList.push(`Your highest spending occurred during the ${weekName} of the month.`);
      }
    }

    return insightsList;
  };

  const insights = getInsights();

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
      
      {/* Segment Selector */}
      <View style={styles.segmentWrapper}>
        <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['daily', 'weekly', 'monthly'] as Segment[]).map((seg) => (
            <TouchableOpacity
              key={seg}
              style={[
                styles.segmentBtn,
                { backgroundColor: activeSegment === seg ? common.primary : 'transparent' }
              ]}
              onPress={() => {
                setActiveSegment(seg);
                setAnchorDate(new Date());
              }}
            >
              <Text 
                style={[
                  styles.segmentText, 
                  { 
                    color: activeSegment === seg ? '#FFF' : colors.textSecondary,
                    textTransform: 'capitalize' 
                  }
                ]}
              >
                {seg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavWrapper}>
        <TouchableOpacity onPress={handlePreviousPeriod} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navLabel, { color: colors.text }]}>{currentRange.label}</Text>
        <TouchableOpacity 
          onPress={handleNextPeriod} 
          style={styles.navArrow}
          disabled={formatDateString(anchorDate) === formatDateString(new Date())}
        >
          <Ionicons 
            name="chevron-forward" 
            size={22} 
            color={formatDateString(anchorDate) === formatDateString(new Date()) ? colors.border : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {periodExpenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={60} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your report will appear after you add some expenses.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary metrics card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>TOTAL SPENT</Text>
              <Text style={[styles.cardAmount, { color: colors.text }]}>
                {formatIndianCurrency(periodTotal, currency)}
              </Text>
              
              <View style={styles.metaGrid}>
                {activeSegment !== 'daily' && (
                  <View style={styles.metaGridItem}>
                    <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Daily Average</Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {formatIndianCurrency(dailyAverage, currency)}
                    </Text>
                  </View>
                )}
                <View style={styles.metaGridItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Transactions</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{transCount}</Text>
                </View>
              </View>

              {prevPeriodTotal > 0 && (
                <View style={[styles.percentageRow, { borderTopColor: colors.border }]}>
                  <Ionicons 
                    name={isIncrease ? 'trending-up' : 'trending-down'} 
                    size={16} 
                    color={isIncrease ? common.danger : common.primary} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.percentageText, { color: isIncrease ? common.danger : common.primary }]}>
                    {Math.round(Math.abs(percentageChange))}% {isIncrease ? 'more' : 'less'} than previous {activeSegment}
                  </Text>
                </View>
              )}
            </View>

            {/* Spending Trend Bar Chart (for weekly and monthly) */}
            {activeSegment !== 'daily' && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trend</Text>
                <BarChart data={barChartData} currencySymbol={currency} />
              </View>
            )}

            {/* Donut and Category Progress bars */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
              
              <DonutChart data={donutData} total={periodTotal} currencySymbol={currency} />

              <View style={styles.progressContainer}>
                {categoryTotals.map((item) => {
                  const cat = getCategoryDetails(item.categoryId);
                  return (
                    <View key={item.categoryId} style={styles.progressRow}>
                      <View style={styles.progressLabelRow}>
                        <View style={styles.progressNameWrapper}>
                          <View style={[styles.bulletPoint, { backgroundColor: cat.color }]} />
                          <Text style={[styles.progressName, { color: colors.text }]}>{cat.name}</Text>
                        </View>
                        <Text style={[styles.progressValue, { color: colors.text }]}>
                          {formatIndianCurrency(item.amount, currency)} ({item.percentage}%)
                        </Text>
                      </View>
                      
                      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${item.percentage}%`,
                              backgroundColor: cat.color 
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Text Insights */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
              <View style={styles.insightHeader}>
                <Ionicons name="bulb-outline" size={20} color={common.warning} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Spending Insights</Text>
              </View>
              
              {insights.map((insight, idx) => (
                <View key={idx} style={styles.insightItem}>
                  <Text style={[styles.insightBullet, { color: common.primary }]}>•</Text>
                  <Text style={[styles.insightText, { color: colors.textSecondary }]}>{insight}</Text>
                </View>
              ))}
            </View>

            {/* Period Transactions List */}
            <Text style={[styles.listHeaderTitle, { color: colors.text }]}>Transactions In This Period</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: 'hidden' }, shadows]}>
              {periodExpenses.map((item, index) => {
                const catDetails = getCategoryDetails(item.categoryId);
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.expenseListItem, 
                      { borderBottomColor: index === periodExpenses.length - 1 ? 'transparent' : colors.border }
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
                          {formatToReadableDate(item.expenseDate)}
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
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentContainer: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  dateNavWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  navArrow: {
    padding: 8,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  metaGridItem: {
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
  progressNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 12,
  },
  insightBullet: {
    fontSize: 16,
    lineHeight: 18,
    marginRight: 8,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
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
});
