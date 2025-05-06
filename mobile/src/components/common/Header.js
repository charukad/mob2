import React from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Import theme constants
import { colors, spacing } from '../../utils/themeUtils';

/**
 * Reusable header component for the app
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title to display in the header
 * @param {boolean} props.showBack - Whether to show back button (defaults to false)
 * @param {Function} props.onBack - Custom back handler (optional)
 * @param {React.ReactNode} props.headerRight - Custom content for right side of header (optional)
 * @param {boolean} props.transparent - Whether header should be transparent (defaults to false)
 * @param {Object} props.style - Additional styles for the header container
 */
const Header = ({
  title,
  showBack = false,
  onBack,
  headerRight,
  transparent = false,
  style,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  
  // Handle back button press
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: transparent ? 'transparent' : colors.primary,
          paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={transparent ? 'transparent' : colors.primary}
        translucent
      />
      
      <View style={styles.content}>
        {showBack && (
          <Appbar.BackAction
            onPress={handleBackPress}
            color={colors.white}
            style={styles.backButton}
          />
        )}
        
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        
        <View style={styles.rightContainer}>
          {headerRight}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    marginLeft: -spacing.xs,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default Header;