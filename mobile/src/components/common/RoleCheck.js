import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { Button } from 'react-native-paper';
import { COLORS } from '../../constants/theme';
import { hasRole, getDashboardName } from '../../utils/roleUtils';

/**
 * Component to verify if user is accessing the correct dashboard
 * based on their role. Shows a warning if they're in the wrong dashboard.
 * 
 * @param {Object} props
 * @param {string} props.expectedRole - The role that should be using this dashboard
 * @param {Function} props.onPressSwitch - Function to call when switch button is pressed
 * @param {React.ReactNode} props.children - Child components to render when role is correct
 */
const RoleCheck = ({ expectedRole, onPressSwitch, children }) => {
  const { user } = useSelector(state => state.auth);
  
  // If no user is logged in, don't show the warning
  if (!user) return children;
  
  // Check if user has the expected role
  const hasCorrectRole = hasRole(user, expectedRole);
  
  // If role is correct, just render children
  if (hasCorrectRole) return children;
  
  // Log role mismatch for debugging
  console.warn(`Role mismatch - User has role ${user.role} but is accessing ${expectedRole} dashboard`);
  
  // Default handler for switching dashboards
  const handlePressSwitch = () => {
    if (onPressSwitch) {
      onPressSwitch();
    } else {
      Alert.alert(
        'Wrong Dashboard',
        `You are currently viewing the ${getDashboardName({ role: expectedRole })} but your account is registered as a ${user.role}. Please contact support if you believe this is an error.`,
        [{ text: 'OK' }]
      );
    }
  };
  
  // Render warning and children
  return (
    <View style={styles.container}>
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>
          Warning: You are viewing the {getDashboardName({ role: expectedRole })} 
          but your account is registered as a {user.role.charAt(0).toUpperCase() + user.role.slice(1)}.
        </Text>
        <Button 
          mode="contained" 
          onPress={handlePressSwitch}
          style={styles.button}
        >
          Switch Dashboard
        </Button>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: COLORS.warning,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  button: {
    marginVertical: 5,
    backgroundColor: '#fff',
  },
});

export default RoleCheck; 