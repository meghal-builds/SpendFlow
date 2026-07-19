import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface DonutSlice {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  total: number;
  currencySymbol: string;
}

export default function DonutChart({ data, total, currencySymbol }: DonutChartProps) {
  const { colors } = useTheme();
  
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Render empty state chart if total is 0
  if (total === 0 || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.chartWrapper}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          </Svg>
          <View style={styles.centerTextContainer}>
            <Text style={[styles.centerTotalText, { color: colors.textSecondary }]}>
              No Data
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} style={styles.svg}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Draw a subtle full circle background */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="transparent"
              opacity={0.3}
            />
            {data.map((slice, index) => {
              const startPercentage = data.slice(0, index).reduce((sum, item) => sum + item.percentage, 0);
              const strokeLength = circumference * (slice.percentage / 100);
              const finalOffset = circumference - strokeLength - (circumference * (startPercentage / 100));

              return (
                <Circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={finalOffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              );
            })}
          </G>
        </Svg>
        
        {/* Center Text (Total Spent) */}
        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>TOTAL</Text>
          <Text style={[styles.centerTotalText, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {currencySymbol}{Math.round(total).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  chartWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 110,
    textAlign: 'center',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  centerTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
});
