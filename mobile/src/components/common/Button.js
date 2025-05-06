import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { colors } from '../../constants/theme';

const Button = ({
  mode = 'contained',
  style,
  labelStyle,
  children,
  loading = false,
  disabled = false,
  icon,
  ...props
}) => {
  return (
    <PaperButton
      mode={mode}
      style={[
        styles.button,
        mode === 'outlined' && styles.outlinedButton,
        disabled && styles.disabledButton,
        style,
      ]}
      labelStyle={[styles.label, labelStyle]}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      {...props}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  outlinedButton: {
    borderColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.7,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default Button;