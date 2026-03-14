import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import LeaveRequestScreen from './screens/LeaveRequestScreen';
import ProfileScreen from './screens/ProfileScreen';
import TasksScreen from './screens/TasksScreen';
import OnlineOrdersScreen from './screens/OnlineOrdersScreen';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from './context/ThemeContext';

const Stack = createStackNavigator();

export default function App() {
    const [initialRoute, setInitialRoute] = useState<string | null>(null);

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const userId = await SecureStore.getItemAsync('userId');
            if (token && userId) {
                setInitialRoute('Dashboard'); // Pass params properly in navigator or handle there? 
                // We need to pass params to initial route if possible, or just navigate after mount.
                // Stack Navigator allows initialParams.
            } else {
                setInitialRoute('Login');
            }
        } catch {
            setInitialRoute('Login');
        }
    };

    if (!initialRoute) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ThemeProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName={initialRoute}>
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ headerShown: false }}
                        initialParams={initialRoute === 'Dashboard' ? { userId: 'LOAD_FROM_STORAGE_PLEASE' } : undefined}
                    />
                    <Stack.Screen
                        name="History"
                        component={HistoryScreen}
                        options={{ title: 'My History' }}
                    />
                    <Stack.Screen
                        name="LeaveRequest"
                        component={LeaveRequestScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Profile"
                        component={ProfileScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Tasks"
                        component={TasksScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="OnlineOrders"
                        component={OnlineOrdersScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
                <StatusBar style="auto" />
            </NavigationContainer>
        </ThemeProvider>
    );
}
// Note: In DashboardScreen, I should handle "LOAD_FROM_STORAGE_PLEASE" or just read SecureStore again if param is missing?
// Or better, let's update DashboardScreen to read from SecureStore if param is missing.
