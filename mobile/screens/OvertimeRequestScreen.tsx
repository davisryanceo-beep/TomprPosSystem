import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { apiSubmitOvertimeRequest } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

export default function OvertimeRequestScreen({ navigation }: any) {
    const [date, setDate] = useState('');
    const [hrs, setHrs] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    const handleSubmit = async () => {
        if (!date || !hrs || !reason) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        const requestedHours = parseFloat(hrs);
        if (isNaN(requestedHours) || requestedHours <= 0) {
            Alert.alert("Error", "Please enter a valid number of hours.");
            return;
        }

        setLoading(true);
        try {
            await apiSubmitOvertimeRequest({ date, requestedHours, reason });
            Alert.alert("Success", "Overtime request submitted!", [
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
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Request Overtime</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.infoCard}>
                        <Ionicons name="time-outline" size={20} color="#059669" />
                        <Text style={styles.infoText}>OT requests are subject to manager approval and verified hours.</Text>
                    </View>

                    <Text style={styles.label}>Date of Overtime</Text>
                    <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.inputBtn}>
                        <Text style={[styles.inputText, !date && { color: '#9ca3af' }]}>
                            {date || "Select Date"}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>

                    <Text style={styles.label}>Number of Hours</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2.5"
                        keyboardType="decimal-pad"
                        value={hrs}
                        onChangeText={setHrs}
                    />

                    <Text style={styles.label}>Reason / Tasks Performed</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What were you working on?"
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
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit OT Request</Text>}
                    </TouchableOpacity>
                </ScrollView>

                <Modal visible={showCalendar} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.calendarContainer}>
                            <Calendar
                                onDayPress={(day: any) => {
                                    setDate(day.dateString);
                                    setShowCalendar(false);
                                }}
                                markedDates={{ [date]: { selected: true, selectedColor: '#059669' } }}
                                theme={{ todayTextColor: '#059669', arrowColor: '#059669', selectedDayBackgroundColor: '#059669' }}
                            />
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCalendar(false)}>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 5 },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    infoCard: { flexDirection: 'row', backgroundColor: '#ecfdf5', padding: 15, borderRadius: 12, marginBottom: 20, alignItems: 'center', gap: 10 },
    infoText: { color: '#065f46', fontSize: 13, flex: 1 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
    inputBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inputText: { fontSize: 16, color: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    disabledBtn: { backgroundColor: '#6ee7b7' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    calendarContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%' },
    closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
    closeBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '600' }
});
