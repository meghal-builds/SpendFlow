import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect, G, Line } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

interface BarData {
  label: string; // e.g. "Sun", "Mon" or "15" (day of month)
  value: number;
}

interface BarChartProps {
  data: BarData[];
  currencySymbol: string;
}

export default function BarChart({ data, currencySymbol }: BarChartProps) {
  const { colors, common } = useTheme();

  const chartHeight = 150;
  const paddingBottom = 24;
  const paddingTop = 12;
  const paddingLeft = 10;
  
  const contentHeight = chartHeight - paddingTop - paddingBottom;
  
  // Find max value for scaling
  const maxVal = Math.max(...data.map(d => d.value), 0);
  
  if (maxVal === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.emptyChart, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
            No spending data for this period
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg height={chartHeight} width="100%">
          <G>
            {/* Draw a light base line */}
            <Line
              x1={paddingLeft}
              y1={chartHeight - paddingBottom}
              x2="95%"
              y2={chartHeight - paddingBottom}
              stroke={colors.border}
              strokeWidth={1}
            />

            {data.map((bar, index) => {
              const totalBars = data.length;
              // Divide width among bars
              const barWidth = Math.min(24, 70 / totalBars); // Percentages or proportional widths
              
              // Calculate positioning
              const percentageX = paddingLeft + (index * (85 / totalBars)) + '%';
              
              // Scale height
              const barHeight = maxVal > 0 ? (bar.value / maxVal) * contentHeight : 0;
              const yPos = chartHeight - paddingBottom - barHeight;
              
              return (
                <G key={index}>
                  {/* Background Bar Track */}
                  <Rect
                    x={percentageX}
                    y={paddingTop}
                    width={`${barWidth}%`}
                    height={contentHeight}
                    fill={colors.border}
                    opacity={0.15}
                    rx={4}
                  />
                  {/* Filled Bar */}
                  {bar.value > 0 && (
                    <Rect
                      x={percentageX}
                      y={yPos}
                      width={`${barWidth}%`}
                      height={barHeight}
                      fill={common.primary}
                      rx={4}
                    />
                  )}
                </G>
              );
            })}
          </G>
        </Svg>
        
        {/* X Axis Labels */}
        <View style={styles.xAxisRow}>
          {data.map((bar, index) => (
            <Text 
              key={index} 
              style={[styles.xAxisLabel, { color: colors.textSecondary, width: `${100 / data.length}%` }]}
              numberOfLines={1}
            >
              {bar.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    width: '100%',
  },
  chartWrapper: {
    height: 175,
    width: '100%',
    position: 'relative',
  },
  emptyChart: {
    height: 150,
    width: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  xAxisLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
