import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS, spacing } from '../../constants/theme';

const LoadingSpinner = ({ message = 'Loading...', size = 'large', fullScreen = true }) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: spacing.md,
    fontSize: 16,
    color: COLORS.textLight,
  },
});

export default LoadingSpinner; 