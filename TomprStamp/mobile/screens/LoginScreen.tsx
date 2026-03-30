import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { storage } from '../utils/storage';
import { loginUser } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password; // Passwords might have spaces, but usually not leading/trailing. Let's not trim password just in case, or maybe we should? Standard users might add space by accident. Let's trim username definitely.

        if (!trimmedUsername || !trimmedPassword) {
            Alert.alert("Error", "Please enter username and password");
            return;
        }

        setLoading(true);
        try {
            const res = await loginUser({ username: trimmedUsername, password: trimmedPassword });
            const { token, user } = res.data;

            if (token) {
                await storage.setItem('token', token);
                await storage.setItem('userId', user.id);
                navigation.replace('Dashboard', { userId: user.id });
            }
        } catch (err: any) {
            if (__DEV__) console.log(err.response?.data);
            Alert.alert("Login Failed", err.response?.data?.error || "Invalid Credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={colors.bgGradient}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <LinearGradient
                            colors={colors.primaryGradient}
                            style={styles.iconCircle}
                        >
                            <Text style={{ fontSize: 32 }}>🏪</Text>
                        </LinearGradient>
                        <Text style={[styles.title, { color: colors.text }]}>Tompr Pos Cafe Management</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Staff Portal</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>USERNAME</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="e.g. barista_jane"
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={colors.primaryGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.button, loading && { opacity: 0.7 }]}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        padding: 30,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    button: {
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
