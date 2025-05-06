import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

/**
 * EmptyState component displays a placeholder when content is unavailable
 * 
 * @param {Object} props - Component props
 * @param {string} props.icon - Name of the MaterialCommunityIcons icon to display
 * @param {string} props.title - Title text to display
 * @param {string} props.message - Message explaining the empty state
 * @param {string} [props.actionLabel] - Optional text for the action button
 * @param {Function} [props.onAction] - Function to call when action button is pressed
 * @param {string} [props.iconColor] - Custom color for the icon (defaults to COLORS.gray)
 */
const EmptyState = ({ 
  icon, 
  title, 
  message, 
  actionLabel, 
  onAction,
  iconColor = COLORS.gray 
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color={iconColor}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.button}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
  },
  icon: {
    marginBottom: SIZES.padding,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SIZES.base,
    textAlign: 'center',
  },
  message: {
    fontSize: SIZES.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.padding * 2,
  },
  button: {
    marginTop: SIZES.padding,
  },
});

export default EmptyState;