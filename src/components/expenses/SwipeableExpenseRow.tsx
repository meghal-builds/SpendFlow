import React, { useRef } from 'react';
import { StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface SwipeableExpenseRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
}

export default function SwipeableExpenseRow({ children, onDelete, onEdit }: SwipeableExpenseRowProps) {
  const { common } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-20, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        style={[styles.leftAction, { backgroundColor: common.primary }]}
        activeOpacity={0.8}
        onPress={() => {
          swipeableRef.current?.close();
          onEdit();
        }}
      >
        <Animated.View style={[styles.actionWrapper, { transform: [{ translateX: trans }] }]}>
          <Ionicons name="pencil" size={20} color="#FFF" />
          <Text style={styles.actionText}>Edit</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 20],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity 
        style={[styles.rightAction, { backgroundColor: common.danger }]}
        activeOpacity={0.8}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Animated.View style={[styles.actionWrapper, { transform: [{ translateX: trans }] }]}>
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  leftAction: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  rightAction: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  actionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
