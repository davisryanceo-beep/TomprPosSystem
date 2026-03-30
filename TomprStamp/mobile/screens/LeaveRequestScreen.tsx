import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { apiSubmitLeaveRequest } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

export default function LeaveRequestScreen({ navigation }: any) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    // Calendar State
    const [showCalendar, setShowCalendar] = useState(false);
    const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);

    const openCalendar = (field: 'start' | 'end') => {
        setActiveField(field);
        setShowCalendar(true);
    };

    const handleDateSelect = (day: any) => {
        if (activeField === 'start') {
            setStartDate(day.dateString);
        } else {
            setEndDate(day.dateString);
        }
        setShowCalendar(false);
        setActiveField(null);
    };

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            await apiSubmitLeaveRequest({ startDate, endDate, reason });
            Alert.alert("Success", "Leave request submitted successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (e: any) {
            Alert.alert("Error", e.response?.data?.error || "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Request Leave</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle-outline" size={20} color="#059669" />
                        <Text style={styles.infoText}>Your request will be sent to the store manager for approval.</Text>
                    </View>

                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity onPress={() => openCalendar('start')} style={styles.dateInputBtn}>
                        <Text style={[styles.dateText, !startDate && { color: '#9ca3af' }]}>
                            {startDate || "Select Start Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>

                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity onPress={() => openCalendar('end')} style={styles.dateInputBtn}>
                        <Text style={[styles.dateText, !endDate && { color: '#9ca3af' }]}>
                            {endDate || "Select End Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>

                    <Text style={styles.label}>Reason</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Why are you requesting leave?"
                        multiline
                        numberOfLines={4}
                        value={reason}
                        onChangeText={setReason}
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>Submit Request</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>

                {/* Calendar Modal */}
                <Modal visible={showCalendar} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.modalTitle}>
                                Select {activeField === 'start' ? 'Start' : 'End'} Date
                            </Text>
                            <Calendar
                                onDayPress={handleDateSelect}
                                markedDates={{
                                    [startDate]: { selected: true, marked: true, selectedColor: '#059669' },
                                    [endDate]: { selected: true, marked: true, selectedColor: '#059669' }
                                }}
                                theme={{
                                    todayTextColor: '#059669',
                                    arrowColor: '#059669',
                                    selectedDayBackgroundColor: '#059669',
                                    selectedDayTextColor: '#ffffff',
                                }}
                            />
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => setShowCalendar(false)}
                            >
                                <Text style={styles.closeBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: { padding: 5 },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#ecfdf5',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        gap: 10,
    },
    infoText: { color: '#065f46', fontSize: 13, flex: 1 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 10 },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    dateInputBtn: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: { fontSize: 16, color: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
    submitBtn: {
        backgroundColor: '#059669',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
    },
    disabledBtn: { backgroundColor: '#6ee7b7' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    calendarContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    closeBtn: {
        marginTop: 15,
        padding: 10,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    }
});
