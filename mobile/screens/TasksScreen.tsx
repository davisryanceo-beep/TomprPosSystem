import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGetStoreTasks, apiCompleteTask } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function TasksScreen({ route, navigation }: any) {
    const { storeId } = route.params;
    const { colors } = useTheme();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await apiGetStoreTasks(storeId);
            setTasks(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (taskId: string) => {
        try {
            await apiCompleteTask(taskId);
            // Optimistic update
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Completed' } : t));
            Alert.alert("Good Job!", "Task marked as complete.");
        } catch (e) {
            Alert.alert("Error", "Failed to complete task");
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, item.status === 'Completed' && { opacity: 0.6 }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }, item.status === 'Completed' && styles.completedText]}>{item.title}</Text>
                {item.description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{item.description}</Text>}
                {item.dueDate && <Text style={[styles.due, { color: colors.danger }]}>Due: {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
            </View>
            <TouchableOpacity
                onPress={() => item.status !== 'Completed' && handleComplete(item.id)}
                disabled={item.status === 'Completed'}
            >
                {item.status === 'Completed' ? (
                    <LinearGradient colors={colors.success ? [colors.success, colors.success] : ['#10b981', '#10b981']} style={styles.checkButton}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                    </LinearGradient>
                ) : (
                    <View style={[styles.checkButton, { borderColor: colors.border }]} />
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Store Tasks</Text>
                    <TouchableOpacity onPress={loadTasks} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="refresh" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={tasks}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="clipboard-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks pending. Nice work!</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
    list: { padding: 20 },
    card: { flexDirection: 'row', borderRadius: 16, padding: 18, marginBottom: 15, alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    content: { flex: 1, marginRight: 15 },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    completedText: { textDecorationLine: 'line-through' },
    desc: { fontSize: 13, marginBottom: 4 },
    due: { fontSize: 12, fontWeight: '600' },
    checkButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 15, fontSize: 16 },
});
