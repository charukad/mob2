import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

import { COLORS, FONTS } from '../../constants/theme';

// Activity type definitions and colors (consistent with other files)
const ACTIVITY_TYPES = {
  visit: {
    icon: 'map-marker',
    color: COLORS.primary,
    label: 'Visit'
  },
  food: {
    icon: 'food-fork-drink',
    color: '#FF8C00',
    label: 'Food'
  },
  transport: {
    icon: 'car',
    color: '#4682B4',
    label: 'Transport'
  },
  accommodation: {
    icon: 'bed',
    color: '#8A2BE2',
    label: 'Accommodation'
  },
  activity: {
    icon: 'hiking',
    color: '#32CD32',
    label: 'Activity'
  },
  other: {
    icon: 'dots-horizontal',
    color: '#708090',
    label: 'Other'
  }
};

const BudgetTracker = ({ 
  itinerary, 
  activities, 
  totalBudget = 0, 
  currency = 'USD',
  showPieChart = true
}) => {
  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    if (!activities || activities.length === 0) return 0;
    
    return activities.reduce((sum, activity) => {
      return sum + (parseFloat(activity.cost) || 0);
    }, 0);
  }, [activities]);
  
  // Calculate expenses by type
  const expensesByType = useMemo(() => {
    if (!activities || activities.length === 0) {
      return Object.keys(ACTIVITY_TYPES).map(type => ({
        type,
        amount: 0,
        color: ACTIVITY_TYPES[type].color,
        icon: ACTIVITY_TYPES[type].icon,
        label: ACTIVITY_TYPES[type].label
      }));
    }
    
    const byType = {};
    
    // Initialize all types with zero
    Object.keys(ACTIVITY_TYPES).forEach(type => {
      byType[type] = {
        type,
        amount: 0,
        color: ACTIVITY_TYPES[type].color,
        icon: ACTIVITY_TYPES[type].icon,
        label: ACTIVITY_TYPES[type].label
      };
    });
    
    // Sum up expenses by type
    activities.forEach(activity => {
      const type = activity.type || 'other';
      byType[type].amount += (parseFloat(activity.cost) || 0);
    });
    
    return Object.values(byType).sort((a, b) => b.amount - a.amount);
  }, [activities]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} ${currency}`;
  };
  
  // Calculate budget usage percentage
  const budgetUsagePercentage = useMemo(() => {
    if (totalBudget <= 0) return 0;
    return Math.min(totalExpenses / totalBudget, 1);
  }, [totalBudget, totalExpenses]);
  
  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    // Filter out types with zero amount
    const nonZeroExpenses = expensesByType.filter(item => item.amount > 0);
    
    if (nonZeroExpenses.length === 0) {
      // Return a placeholder if no expenses
      return [{
        name: 'No Expenses',
        amount: 1,
        color: COLORS.lightGray,
        legendFontColor: COLORS.gray,
        legendFontSize: 12
      }];
    }
    
    return nonZeroExpenses.map(item => ({
      name: item.label,
      amount: item.amount,
      color: item.color,
      legendFontColor: COLORS.darkGray,
      legendFontSize: 12
    }));
  }, [expensesByType]);
  
  return (
    <View style={styles.container}>
      {/* Budget Overview */}
      <View style={styles.overviewContainer}>
        <View style={styles.budgetHeader}>
          <Text style={styles.title}>Budget Overview</Text>
          <Text style={styles.budgetAmount}>
            {totalBudget > 0 ? formatCurrency(totalBudget) : 'No budget set'}
          </Text>
        </View>
        
        <View style={styles.expenseContainer}>
          <Text style={styles.expenseLabel}>Total Expenses</Text>
          <Text style={[
            styles.expenseAmount,
            totalExpenses > totalBudget && totalBudget > 0 ? styles.overBudget : {}
          ]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
        
        {totalBudget > 0 && (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={budgetUsagePercentage}
              color={budgetUsagePercentage >= 1 ? COLORS.error : COLORS.primary}
              style={styles.progressBar}
            />
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>
                {Math.round(budgetUsagePercentage * 100)}% used
              </Text>
              <Text style={styles.remainingLabel}>
                {formatCurrency(Math.max(totalBudget - totalExpenses, 0))} remaining
              </Text>
            </View>
          </View>
        )}
      </View>
      
      {/* Expenses by Type */}
      <View style={styles.byTypeContainer}>
        <Text style={styles.title}>Expenses by Type</Text>
        
        <ScrollView 
          horizontal={!showPieChart}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={showPieChart ? {} : styles.horizontalScrollContent}
        >
          {showPieChart && totalExpenses > 0 ? (
            <PieChart
              data={pieChartData}
              width={300}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            expensesByType.map(item => (
              <View key={item.type} style={styles.typeItem}>
                <View style={[styles.typeIcon, { backgroundColor: item.color }]}>
                  <MaterialCommunityIcons name={item.icon} size={16} color={COLORS.white} />
                </View>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeLabel}>{item.label}</Text>
                  <Text style={styles.typeAmount}>{formatCurrency(item.amount)}</Text>
                </View>
                {totalExpenses > 0 && (
                  <Text style={styles.typePercentage}>
                    {Math.round((item.amount / totalExpenses) * 100)}%
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
      
      {/* Tips Section */}
      {totalBudget > 0 && totalExpenses > totalBudget && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Budget Tips</Text>
          <Text style={styles.tipsText}>
            You are currently over budget. Consider:
            {'\n'}- Looking for free or lower cost alternatives
            {'\n'}- Prioritizing essential activities
            {'\n'}- Adjusting your budget if necessary
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  overviewContainer: {
    marginBottom: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...FONTS.h3,
    marginBottom: 8,
  },
  budgetAmount: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  expenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expenseLabel: {
    ...FONTS.body3,
  },
  expenseAmount: {
    ...FONTS.body3Bold,
  },
  overBudget: {
    color: COLORS.error,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  remainingLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  byTypeContainer: {
    marginBottom: 20,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    marginBottom: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    minWidth: 180,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    ...FONTS.body3,
    marginBottom: 2,
  },
  typeAmount: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  typePercentage: {
    ...FONTS.body3Bold,
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  tipsTitle: {
    ...FONTS.h4,
    marginBottom: 8,
  },
  tipsText: {
    ...FONTS.body3,
    lineHeight: 22,
  },
});

export default BudgetTracker;