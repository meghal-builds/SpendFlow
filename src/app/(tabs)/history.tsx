import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  SectionList,
  ScrollView,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { formatIndianCurrency } from '../../utils/format';
import { 
  formatToReadableDate, 
  formatToReadableTime,
  getTodayDateString,
  getStartAndEndOfWeek,
  getStartAndEndOfMonth
} from '../../utils/dateHelpers';
import SwipeableExpenseRow from '../../components/expenses/SwipeableExpenseRow';
import { CATEGORY_COLORS } from './index';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function TransactionHistory() {
  const { colors, common, shadows } = useTheme();

  // Store actions & values
  const expenses = useAppStore((state) => state.expenses);
  const categories = useAppStore((state) => state.categories);
  const currency = useAppStore((state) => state.currency);
  const filters = useAppStore((state) => state.filters);
  const setFilters = useAppStore((state) => state.setFilters);
  const clearFilters = useAppStore((state) => state.clearFilters);
  const deleteExpense = useAppStore((state) => state.deleteExpense);
  const addExpense = useAppStore((state) => state.addExpense);

  // States
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Custom Date Picker Filter States
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');

  // Undo delete snackbar states
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [lastDeletedExpense, setLastDeletedExpense] = useState<any>(null);
  const [snackbarTimer, setSnackbarTimer] = useState<any>(null);

  // Search local input
  const [searchText, setSearchText] = useState(filters.search);

  // Sync search query with store after debouncing or simple text trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchText });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, setFilters]);

  // Sync preset selections
  const handleDatePresetSelect = (preset: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setActiveDatePreset(preset);
    if (preset === 'all') {
      setFilters({ startDate: undefined, endDate: undefined });
    } else if (preset === 'today') {
      const today = getTodayDateString();
      setFilters({ startDate: today, endDate: today });
    } else if (preset === 'week') {
      const { start, end } = getStartAndEndOfWeek();
      setFilters({ startDate: start, endDate: end });
    } else if (preset === 'month') {
      const { start, end } = getStartAndEndOfMonth();
      setFilters({ startDate: start, endDate: end });
    }
  };

  // Grouping expenses by date YYYY-MM-DD
  const getGroupedSections = () => {
    const groups: Record<string, { title: string; total: number; data: any[] }> = {};

    for (const exp of expenses) {
      const dateStr = exp.expenseDate.substring(0, 10);
      if (!groups[dateStr]) {
        groups[dateStr] = {
          title: dateStr,
          total: 0,
          data: [],
        };
      }
      groups[dateStr].total += exp.amount;
      groups[dateStr].data.push(exp);
    }

    return Object.values(groups).sort((a, b) => b.title.localeCompare(a.title));
  };

  const sections = getGroupedSections();

  const handleRowDelete = async (expense: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Setup undo backup
    setLastDeletedExpense(expense);
    await deleteExpense(expense.id);

    // Show undo snackbar
    setShowSnackbar(true);
    if (snackbarTimer) clearTimeout(snackbarTimer);
    
    const timer = setTimeout(() => {
      setShowSnackbar(false);
      setLastDeletedExpense(null);
    }, 5000); // 5 seconds duration
    setSnackbarTimer(timer);
  };

  const handleUndoDelete = async () => {
    if (lastDeletedExpense) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await addExpense({
        amount: lastDeletedExpense.amount,
        description: lastDeletedExpense.description,
        categoryId: lastDeletedExpense.categoryId,
        paymentMethod: lastDeletedExpense.paymentMethod,
        note: lastDeletedExpense.note,
        expenseDate: lastDeletedExpense.expenseDate,
      });
      setShowSnackbar(false);
      setLastDeletedExpense(null);
      if (snackbarTimer) clearTimeout(snackbarTimer);
    }
  };

  const handleRowDuplicate = async (expense: any) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addExpense({
      amount: expense.amount,
      description: `${expense.description} (Copy)`,
      categoryId: expense.categoryId,
      paymentMethod: expense.paymentMethod,
      note: expense.note,
      expenseDate: new Date().toISOString(),
    });
    setShowActionModal(false);
    Alert.alert('Expense Duplicated', 'A copy of this expense has been added to today.');
  };

  const handleRowEdit = (id: string) => {
    setShowActionModal(false);
    router.push({ pathname: '/edit-expense', params: { id } });
  };

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
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search description or note..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.filterButton, 
            { 
              borderColor: showFilters || filters.categoryId !== 'all' || filters.paymentMethod !== 'all' || filters.startDate ? common.primary : colors.border,
              backgroundColor: showFilters ? common.primaryLight : colors.card 
            }
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="funnel-outline" size={20} color={showFilters ? common.primary : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Categories Row */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>CATEGORIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  borderColor: filters.categoryId === 'all' ? common.primary : colors.border,
                  backgroundColor: filters.categoryId === 'all' ? common.primaryLight : 'transparent'
                }
              ]}
              onPress={() => setFilters({ categoryId: 'all' })}
            >
              <Text style={{ color: filters.categoryId === 'all' ? common.primary : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  { 
                    borderColor: filters.categoryId === cat.id ? common.primary : colors.border,
                    backgroundColor: filters.categoryId === cat.id ? common.primaryLight : 'transparent'
                  }
                ]}
                onPress={() => setFilters({ categoryId: cat.id })}
              >
                <Text style={{ color: filters.categoryId === cat.id ? common.primary : colors.text, fontSize: 12, fontWeight: '600' }}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Payment Methods */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 12 }]}>PAYMENT METHODS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { 
                  borderColor: filters.paymentMethod === 'all' ? common.primary : colors.border,
                  backgroundColor: filters.paymentMethod === 'all' ? common.primaryLight : 'transparent'
                }
              ]}
              onPress={() => setFilters({ paymentMethod: 'all' })}
            >
              <Text style={{ color: filters.paymentMethod === 'all' ? common.primary : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                All Methods
              </Text>
            </TouchableOpacity>
            {['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Other'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.filterChip,
                  { 
                    borderColor: filters.paymentMethod === method ? common.primary : colors.border,
                    backgroundColor: filters.paymentMethod === method ? common.primaryLight : 'transparent'
                  }
                ]}
                onPress={() => setFilters({ paymentMethod: method })}
              >
                <Text style={{ color: filters.paymentMethod === method ? common.primary : colors.text, fontSize: 12, fontWeight: '600' }}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Date range presets */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: 12 }]}>DATE BOUNDS</Text>
          <View style={styles.presetsRow}>
            {['all', 'today', 'week', 'month', 'custom'].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetBtn,
                  { 
                    borderColor: activeDatePreset === preset ? common.primary : colors.border,
                    backgroundColor: activeDatePreset === preset ? common.primaryLight : 'transparent'
                  }
                ]}
                onPress={() => handleDatePresetSelect(preset as any)}
              >
                <Text style={{ color: activeDatePreset === preset ? common.primary : colors.text, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Date Pickers */}
          {activeDatePreset === 'custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity 
                style={[styles.customDatePickerBtn, { borderColor: colors.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>From: </Text>
                <Text style={{ fontSize: 12, color: colors.text, fontWeight: 'bold' }}>
                  {tempStartDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) {
                      setTempStartDate(date);
                      // Update start filter formatted
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setFilters({ startDate: `${year}-${month}-${day}` });
                    }
                  }}
                />
              )}

              <TouchableOpacity 
                style={[styles.customDatePickerBtn, { borderColor: colors.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>To: </Text>
                <Text style={{ fontSize: 12, color: colors.text, fontWeight: 'bold' }}>
                  {tempEndDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) {
                      setTempEndDate(date);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setFilters({ endDate: `${year}-${month}-${day}` });
                    }
                  }}
                />
              )}
            </View>
          )}

          <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
            <Text style={{ color: common.primary, fontWeight: 'bold', fontSize: 12 }}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title, total } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{formatToReadableDate(title)}</Text>
            <Text style={[styles.sectionHeaderTotal, { color: colors.textSecondary }]}>
              {formatIndianCurrency(total, currency)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const catDetails = getCategoryDetails(item.categoryId);
          return (
            <SwipeableExpenseRow
              onDelete={() => handleRowDelete(item)}
              onEdit={() => handleRowEdit(item.id)}
            >
              <TouchableOpacity
                style={[styles.expenseItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedExpense(item);
                  setShowActionModal(true);
                }}
              >
                <View style={[styles.iconRing, { backgroundColor: catDetails.color + '15' }]}>
                  <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                </View>
                <View style={styles.itemMainDetails}>
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
              </TouchableOpacity>
            </SwipeableExpenseRow>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching expenses found</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Undo Delete Snackbar */}
      {showSnackbar && (
        <View style={[styles.snackbar, { backgroundColor: colors.card, borderColor: colors.border }, shadows]}>
          <Text style={[styles.snackbarText, { color: colors.text }]}>Expense deleted.</Text>
          <TouchableOpacity onPress={handleUndoDelete} style={styles.snackbarAction}>
            <Text style={{ color: common.primary, fontWeight: 'bold' }}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expense Action Option Modal */}
      {selectedExpense && (
        <Modal
          visible={showActionModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowActionModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowActionModal(false)}
          >
            <View 
              style={[styles.modalCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalDragIndicator} />
              
              <View style={styles.modalDetailsHeader}>
                <View style={[styles.modalIconRing, { backgroundColor: getCategoryDetails(selectedExpense.categoryId).color + '15' }]}>
                  <Ionicons 
                    name={getCategoryDetails(selectedExpense.categoryId).icon as any} 
                    size={28} 
                    color={getCategoryDetails(selectedExpense.categoryId).color} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalDetailTitle, { color: colors.text }]}>{selectedExpense.description}</Text>
                  <Text style={[styles.modalDetailCategory, { color: colors.textSecondary }]}>
                    {getCategoryDetails(selectedExpense.categoryId).name}
                  </Text>
                </View>
                <Text style={[styles.modalDetailAmount, { color: colors.text }]}>
                  -{formatIndianCurrency(selectedExpense.amount, currency)}
                </Text>
              </View>

              {/* Extra details fields */}
              <View style={[styles.modalMetaSection, { borderColor: colors.border }]}>
                {selectedExpense.paymentMethod && (
                  <View style={styles.modalMetaRow}>
                    <Text style={[styles.modalMetaLabel, { color: colors.textSecondary }]}>Payment Method:</Text>
                    <Text style={[styles.modalMetaValue, { color: colors.text }]}>{selectedExpense.paymentMethod}</Text>
                  </View>
                )}
                <View style={styles.modalMetaRow}>
                  <Text style={[styles.modalMetaLabel, { color: colors.textSecondary }]}>Date:</Text>
                  <Text style={[styles.modalMetaValue, { color: colors.text }]}>
                    {new Date(selectedExpense.expenseDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                  </Text>
                </View>
                <View style={styles.modalMetaRow}>
                  <Text style={[styles.modalMetaLabel, { color: colors.textSecondary }]}>Time:</Text>
                  <Text style={[styles.modalMetaValue, { color: colors.text }]}>
                    {formatToReadableTime(selectedExpense.expenseDate)}
                  </Text>
                </View>
                {selectedExpense.note && (
                  <View style={styles.modalMetaRow}>
                    <Text style={[styles.modalMetaLabel, { color: colors.textSecondary }]}>Note:</Text>
                    <Text style={[styles.modalMetaValue, { color: colors.text, fontStyle: 'italic' }]}>{selectedExpense.note}</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.border }]} 
                  onPress={() => handleRowEdit(selectedExpense.id)}
                >
                  <Ionicons name="pencil" size={18} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.border }]} 
                  onPress={() => handleRowDuplicate(selectedExpense)}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Duplicate</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: common.danger }]} 
                  onPress={() => {
                    setShowActionModal(false);
                    handleRowDelete(selectedExpense);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPanel: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  customDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  customDatePickerBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  clearFiltersBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemMainDetails: {
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
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
  },
  snackbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 999,
  },
  snackbarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  snackbarAction: {
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDetailCategory: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalDetailAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalMetaSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalMetaLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalMetaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
