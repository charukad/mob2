import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Switch } from 'react-native';
import { Button, Card, Text, List, Divider, Title, Subheading } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { runNetworkDiagnostic, getNetworkState } from '../utils/networkUtils';
import offlineService from '../services/offlineService';
import { COLORS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bypassEnabled, setBypassEnabled] = useState(false);

  // Check initial bypass state
  useEffect(() => {
    AsyncStorage.getItem('bypassNetworkChecks').then(value => {
      setBypassEnabled(value === 'true');
    });
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // Force network check
      await offlineService.checkConnectivity();
      
      // Run detailed diagnostic
      const result = await runNetworkDiagnostic();
      console.log('Network diagnostic result:', result);
      setNetworkInfo(result);
    } catch (error) {
      console.error('Error running diagnostic:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    runDiagnostic();
  };
  
  const toggleBypass = (value) => {
    setBypassEnabled(value);
    offlineService.setBypassMode(value);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      <Card style={styles.card}>
        <Card.Title title="Account Information" />
        <Card.Content>
          <List.Item
            title="Email"
            description={user?.email || 'Not available'}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <List.Item
            title="Role"
            description={user?.role || 'Not available'}
            left={props => <List.Icon {...props} icon="account" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Network Diagnostics" />
        <Card.Content>
          <View style={styles.switchContainer}>
            <Text>Bypass Network Checks</Text>
            <Switch
              value={bypassEnabled}
              onValueChange={toggleBypass}
              trackColor={{ false: "#767577", true: COLORS.primary }}
            />
          </View>
          
          <Text style={styles.helperText}>
            {bypassEnabled 
              ? "Network checks are bypassed. The app will always act as if you're online, even if you're not."
              : "Network checks are enabled. The app will detect when you're offline."}
          </Text>
          
          <Button 
            mode="contained" 
            onPress={runDiagnostic}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Run Network Diagnostic
          </Button>

          {networkInfo && (
            <View style={styles.diagnosticResults}>
              <Title>Network Status</Title>

              <View style={styles.infoRow}>
                <Subheading>Connection Type:</Subheading>
                <Text>{networkInfo.netInfo?.type || 'Unknown'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Subheading>Connected:</Subheading>
                <Text style={networkInfo.netInfo?.isConnected ? styles.success : styles.error}>
                  {networkInfo.netInfo?.isConnected ? 'Yes' : 'No'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Subheading>Internet Reachable:</Subheading>
                <Text style={networkInfo.netInfo?.isInternetReachable === false ? styles.error : 
                         networkInfo.netInfo?.isInternetReachable === true ? styles.success : styles.warning}>
                  {networkInfo.netInfo?.isInternetReachable === false ? 'No' : 
                   networkInfo.netInfo?.isInternetReachable === true ? 'Yes' : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Subheading>App Determination:</Subheading>
                <Text style={networkInfo.ourDetermination?.isConnected ? styles.success : styles.error}>
                  {networkInfo.ourDetermination?.isConnected ? 'Online' : 'Offline'}
                </Text>
              </View>

              <Divider style={styles.divider} />
              <Title>Server Connection Tests</Title>

              {networkInfo.serverTests?.map((test, index) => (
                <View key={index} style={styles.serverTest}>
                  <View style={styles.infoRow}>
                    <Subheading>URL:</Subheading>
                    <Text>{test.url}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Subheading>Status:</Subheading>
                    <Text style={test.success ? styles.success : styles.error}>
                      {test.success ? 'Connected' : 'Failed'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Subheading>Message:</Subheading>
                    <Text>{test.message}</Text>
                  </View>
                  
                  {index < networkInfo.serverTests.length - 1 && 
                    <Divider style={styles.itemDivider} />
                  }
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Account Actions" />
        <Card.Content>
          <Button
            mode="outlined"
            icon="account-edit"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.button}
          >
            Edit Profile
          </Button>
          
          <Button
            mode="outlined"
            icon="lock-reset"
            onPress={() => navigation.navigate('ChangePassword')}
            style={styles.button}
          >
            Change Password
          </Button>
          
          <Button
            mode="contained"
            icon="logout"
            onPress={handleLogout}
            style={[styles.button, styles.logoutButton]}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 12,
    elevation: 2,
  },
  button: {
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  diagnosticResults: {
    marginTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  serverTest: {
    marginVertical: 5,
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
  },
  warning: {
    color: 'orange',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  itemDivider: {
    marginVertical: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  helperText: {
    fontStyle: 'italic',
    fontSize: 12,
    color: 'gray',
    marginBottom: 15,
  },
});

export default SettingsScreen; 