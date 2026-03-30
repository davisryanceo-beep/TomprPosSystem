import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGetHistory, apiGetUpcomingShifts } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function HistoryScreen({ route, navigation }: any) {
    const { userId } = route.params;
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any>({ rewards: [], logs: [], leaveRequests: [], schedule: [] });
    const [activeTab, setActiveTab] = useState<'rewards' | 'shifts' | 'leave' | 'schedule'>('rewards');

    const loadHistory = async () => {
        setLoading(true);
        try {
            const [data, schedule] = await Promise.all([
                apiGetHistory(userId),
                apiGetUpcomingShifts(userId)
            ]);
            setHistory({ ...data, schedule });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return 'N/A';
            const d = new Date(dateString);
            return isNaN(d.getTime()) ? 'Invalid Date' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
            return 'N/A';
        }
    };

    const renderRewardItem = ({ item }: any) => (
        <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.claimedProductName || "Reward Claim"}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: item.status === 'Claimed' ? colors.success + '20' : colors.warning + '20', color: item.status === 'Claimed' ? colors.success : colors.warning }]}>
                    {item.status}
                </Text>
            </View>
            <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{formatDate(item.timestamp)}</Text>
            {item.claimedOrderId && (
                <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>Order: {item.claimedOrderId.slice(0, 8)}...</Text>
            )}
        </View>
    );

    const renderShiftItem = ({ item }: any) => (
        <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.clockInTime ? new Date(item.clockInTime).toLocaleDateString() : 'N/A'}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: colors.info + '20', color: colors.info }]}>Shift</Text>
            </View>
            <View style={styles.timeContainer}>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}><Ionicons name="enter-outline" size={12} /> {item.clockInTime ? new Date(item.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</Text>
                {item.clockOutTime ? (
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}><Ionicons name="exit-outline" size={12} /> {new Date(item.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                ) : (
                    <Text style={[styles.onShift, { color: colors.success }]}>Active Now</Text>
                )}
            </View>
        </View>
    );

    const renderLeaveItem = ({ item }: any) => (
        <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.startDate || 'N/A'} to {item.endDate || 'N/A'}</Text>
                <Text style={[styles.statusBadge, {
                    backgroundColor: item.status === 'Approved' ? colors.success + '20' : item.status === 'Rejected' ? colors.danger + '20' : colors.warning + '20',
                    color: item.status === 'Approved' ? colors.success : item.status === 'Rejected' ? colors.danger : colors.warning
                }]}>
                    {item.status || 'Pending'}
                </Text>
            </View>
            <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>Reason: {item.reason || 'No reason provided'}</Text>
            {item.responseNote && (
                <Text style={[styles.noteText, { color: colors.info }]}>Note: {item.responseNote}</Text>
            )}
            <Text style={[styles.itemDate, { color: colors.textSecondary }]}>Requested: {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : 'N/A'}</Text>
        </View>
    );

    const renderScheduleItem = ({ item }: any) => (
        <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemHeader}>
                <Text style={[styles.itemName, { color: colors.text }]}>{new Date(item.date).toLocaleDateString()}</Text>
                <Text style={[styles.statusBadge, { backgroundColor: colors.info + '20', color: colors.info }]}>Upcoming</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                <Ionicons name="time-outline" size={14} /> {item.startTime} - {item.endTime}
            </Text>
            {item.notes && <Text style={[styles.itemDetail, { color: colors.textSecondary }]}>Note: {item.notes}</Text>}
        </View>
    );

    const getListData = () => {
        if (activeTab === 'rewards') return history.rewards || [];
        if (activeTab === 'shifts') return history.logs || [];
        if (activeTab === 'leave') return history.leaveRequests || [];
        return history.schedule || [];
    };

    const renderItem = ({ item }: any) => {
        if (activeTab === 'rewards') return renderRewardItem({ item });
        if (activeTab === 'shifts') return renderShiftItem({ item });
        if (activeTab === 'leave') return renderLeaveItem({ item });
        return renderScheduleItem({ item });
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>My History</Text>
                    <TouchableOpacity onPress={loadHistory} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                        <Ionicons name="refresh" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
                    {['rewards', 'shifts', 'leave', 'schedule'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tab,
                                activeTab === tab && { backgroundColor: colors.background }
                            ]}
                            onPress={() => setActiveTab(tab as any)}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeTab === tab ? colors.primary : colors.textSecondary },
                                activeTab === tab && { fontWeight: 'bold' }
                            ]}>
                                {tab === 'schedule' ? 'Roster' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={getListData()}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            activeTab === 'shifts' && history.monthlyStats ? (
                                <View style={styles.statsHub}>
                                    <LinearGradient
                                        colors={colors.primaryGradient}
                                        style={styles.mainStatsCard}
                                    >
                                        <View style={styles.statsHeader}>
                                            <Text style={styles.statsTitle}>Monthly Overview</Text>
                                            <Text style={styles.statsMonth}>{new Date().toLocaleString('default', { month: 'long' })}</Text>
                                        </View>
                                        
                                        <View style={styles.statsGrid}>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Hours Worked</Text>
                                                <Text style={styles.statValue}>{history.monthlyStats.totalHoursWorked || '0'}h</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Day Offs</Text>
                                                <Text style={styles.statValue}>
                                                    {history.monthlyStats.usedDayOffs} / {history.monthlyStats.allowedDayOffs || '0'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.salaryDivider} />
                                        
                                        <View style={styles.salaryRow}>
                                            <Text style={styles.salaryLabel}>Base Salary</Text>
                                            <Text style={styles.salaryAmount}>${history.monthlyStats.baseSalary}</Text>
                                        </View>
                                        <View style={styles.salaryRow}>
                                            <Text style={styles.salaryLabel}>OT Pay ({history.monthlyStats.totalOTHours}h)</Text>
                                            <Text style={styles.salaryAmount}>+${history.monthlyStats.otPay}</Text>
                                        </View>
                                        <View style={[styles.salaryRow, styles.totalRow]}>
                                            <Text style={styles.totalLabel}>Estimated Net</Text>
                                            <Text style={styles.totalValue}>${history.monthlyStats.totalSalary}</Text>
                                        </View>
                                    </LinearGradient>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No history found yet.</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingTop: 50,
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
    tabContainer: {
        flexDirection: 'row',
        padding: 5,
        margin: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    itemCard: {
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    statusBadge: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        overflow: 'hidden',
    },
    itemDate: {
        fontSize: 11,
        marginTop: 5,
    },
    itemDetail: {
        fontSize: 13,
        marginTop: 5,
    },
    noteText: {
        fontSize: 13,
        marginTop: 5,
        fontStyle: 'italic',
    },
    timeContainer: {
        flexDirection: 'row',
        marginTop: 5,
        gap: 20,
    },
    timeText: {
        fontSize: 13,
    },
    onShift: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
    },
    statsHub: {
        marginBottom: 20,
    },
    mainStatsCard: {
        padding: 20,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    statsTitle: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statsMonth: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '800',
    },
    salaryDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 15,
    },
    salaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    salaryLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    salaryAmount: {
        fontSize: 13,
        color: '#fff',
        fontWeight: 'bold',
    },
    totalRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    totalLabel: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '800',
    },
    totalValue: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '900',
    },
});
