import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGetUser, apiUpdateProfile } from '../services/api';
import { storage } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen({ navigation }: any) {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        pin: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        storage.getItem('userId').then(id => {
            if (id) {
                setUserId(id);
                loadProfile(id);
            }
        });
    }, []);

    const loadProfile = async (id: string) => {
        try {
            const user = await apiGetUser(id);
            setForm(prev => ({
                ...prev,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                pin: user.pin || ''
            }));
        } catch (e) {
            Alert.alert("Error", "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (form.password) {
            if (form.password !== form.confirmPassword) {
                Alert.alert("Error", "Passwords do not match");
                return;
            }
            // Strong Password Regex: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongRegex.test(form.password)) {
                Alert.alert("Weak Password", "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
                return;
            }
        }

        setSaving(true);
        try {
            await apiUpdateProfile({
                firstName: form.firstName,
                lastName: form.lastName,
                pin: form.pin,
                password: form.password || undefined // Only send if set
            });
            Alert.alert("Success", "Profile updated successfully");
            navigation.goBack();
        } catch (e: any) {
            Alert.alert("Error", e.response?.data?.error || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>FIRST NAME</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={form.firstName}
                            onChangeText={t => setForm({ ...form, firstName: t })}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>LAST NAME</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={form.lastName}
                            onChangeText={t => setForm({ ...form, lastName: t })}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>PIN (4-6 DIGITS)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={form.pin}
                            onChangeText={t => setForm({ ...form, pin: t })}
                            keyboardType="numeric"
                            maxLength={6}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password (Optional)</Text>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>NEW PASSWORD</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={form.password}
                            onChangeText={t => setForm({ ...form, password: t })}
                            secureTextEntry
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>CONFIRM NEW PASSWORD</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={form.confirmPassword}
                            onChangeText={t => setForm({ ...form, confirmPassword: t })}
                            secureTextEntry
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <LinearGradient
                            colors={colors.primaryGradient}
                            style={[styles.saveButton, saving && { opacity: 0.7 }]}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveText}>Save Changes</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    divider: {
        height: 1,
        marginVertical: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    saveButton: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
