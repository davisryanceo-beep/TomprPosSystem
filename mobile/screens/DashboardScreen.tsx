import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { storage } from '../utils/storage';
import { apiClockIn, apiClockOut, apiGetStaffRewards, apiClaimReward, getProducts, apiGetUser, apiGetPendingOnlineOrders, apiGetHistory } from '../services/api';
import AnnouncementsSection from '../components/AnnouncementsSection';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen({ route, navigation }: any) {
    const { colors, theme, toggleTheme } = useTheme();
    const [userId, setUserId] = useState<string | null>(route.params?.userId);

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanMode, setScanMode] = useState<'in' | 'out'>('in');
    const [storeId, setStoreId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || userId === 'LOAD_FROM_STORAGE_PLEASE') {
            storage.getItem('userId').then(id => {
                if (id) {
                    setUserId(id);
                    fetchUserProfile(id);
                }
                else navigation.replace('Login');
            });
        } else {
            fetchUserProfile(userId);
        }
    }, [userId]);

    const fetchUserProfile = async (uid: string) => {
        try {
            const user = await apiGetUser(uid);
            if (user.storeId) setStoreId(user.storeId);
        } catch (e) {
            console.log("Error fetching user:", e);
        }
    };

    const [rewards, setRewards] = useState<any[]>([]);
    const [showRewardMenu, setShowRewardMenu] = useState(false);
    const [rewardProducts, setRewardProducts] = useState<any[]>([]);
    const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
    const [monthlyStats, setMonthlyStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Online Orders
    const [pendingOrderCount, setPendingOrderCount] = useState(0);
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (storeId) {
            checkOnlineOrders(); // Check immediately
            interval = setInterval(checkOnlineOrders, 30000); // Check every 30s
        }
        return () => clearInterval(interval);
    }, [storeId]);

    useEffect(() => {
        if (userId && userId !== 'LOAD_FROM_STORAGE_PLEASE') {
            loadStats(userId);
            loadRewards();
        }
    }, [userId]);

    const loadStats = async (uid: string) => {
        try {
            const data = await apiGetHistory(uid);
            if (data.monthlyStats) {
                setMonthlyStats(data.monthlyStats);
            }
        } catch (err) {
            console.log("Error loading monthly stats:", err);
        }
    };

    const checkOnlineOrders = async () => {
        if (!storeId) return;
        try {
            const res = await apiGetPendingOnlineOrders(storeId);
            setPendingOrderCount(res.count);

            // Trigger alert if new order since last check (logic can be refined)
            if (res.latestOrder && res.latestOrder.id !== lastOrderId) {
                setLastOrderId(res.latestOrder.id);
                if (res.count > 0) {
                    Alert.alert("New Online Order!", `Order #${res.latestOrder.id.slice(-6)} received.`);
                }
            }
        } catch (e) {
            console.log("Failed to check online orders", e);
        }
    };

    useEffect(() => {
        loadRewards();
    }, [userId]);

    const loadRewards = async () => {
        if (!userId || userId === 'LOAD_FROM_STORAGE_PLEASE') return;
        try {
            const data = await apiGetStaffRewards(userId);
            setRewards(data);
        } catch (err: any) {
            console.log("Error loading rewards:", err);
        }
    };

    const handleSignOut = async () => {
        await storage.deleteItem('token');
        await storage.deleteItem('userId');
        navigation.replace('Login');
    };

    const startScan = async (mode: 'in' | 'out') => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("Permission Required", "Camera permission is needed to scan QR codes.");
                return;
            }
        }
        setScanMode(mode);
        setScanned(false);
        setShowScanner(true);
    };

    const handleBarCodeScanned = async ({ data }: any) => {
        setScanned(true);
        setShowScanner(false);
        setLoading(true);

        try {
            let storeId = data;
            try {
                const parsed = JSON.parse(data);
                if (parsed.storeId) storeId = parsed.storeId;
            } catch (e) { }

            if (scanMode === 'in') {
                const res = await apiClockIn(storeId);
                const title = res.popupType === 'success' ? '🎉 Awesome!' :
                    res.popupType === 'warning' ? '⏰ Oh Snap!' : 'Info';
                Alert.alert(title, res.popupMessage || res.message || "Clock In Successful");
                loadRewards();
            } else {
                await apiClockOut();
                Alert.alert("Success", "Clock Out Successful");
            }
        } catch (err: any) {
            Alert.alert("Error", err.response?.data?.error || "Scan failed");
        } finally {
            setLoading(false);
        }
    };

    const openRewardMenu = async (rewardId: string) => {
        setSelectedRewardId(rewardId);
        setLoading(true);
        try {
            const res = await getProducts();
            const products = res.data || [];
            setRewardProducts(products);
            setShowRewardMenu(true);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimProduct = async (product: any) => {
        if (!selectedRewardId) return;
        setLoading(true);
        try {
            await apiClaimReward(selectedRewardId, product.id);
            Alert.alert("Success", `Claimed ${product.name}! Enjoy! ☕`);
            setShowRewardMenu(false);
            loadRewards();
        } catch (err: any) {
            Alert.alert("Error", err.response?.data?.error || "Claim failed");
        } finally {
            setLoading(false);
        }
    };

    if (showScanner) {
        return (
            <View style={styles.container}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Scan Store QR Code</Text>
                    <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.cancelButton}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const availableRewards = rewards.filter(r => r.status === 'Available');

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId })}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <LinearGradient
                                colors={colors.primaryGradient}
                                style={styles.avatarCircle}
                            >
                                <Text style={styles.avatarText}>{userId ? userId.substring(0, 1).toUpperCase() : 'U'}</Text>
                            </LinearGradient>
                            <View>
                                <Text style={[styles.greeting, { color: colors.text }]}>Hello!</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>ID: {userId?.substring(0, 8)}...</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                            <Ionicons name={theme === 'dark' ? 'sunny' : 'moon'} size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('History', { userId })} style={[styles.iconBtn, { backgroundColor: colors.card }]}>
                            <Ionicons name="time-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity testID="logout-btn" onPress={handleSignOut} style={[styles.iconBtn, { backgroundColor: colors.danger + '20' }]}>
                            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Announcements */}
                {storeId && <AnnouncementsSection storeId={storeId} />}

                {/* Quick Stats - Monthly Overview */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Month Hours</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {monthlyStats?.totalHoursWorked || '0'}h
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Offs</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {monthlyStats?.usedDayOffs || '0'} / {monthlyStats?.allowedDayOffs || '0'}
                        </Text>
                    </View>
                </View>

                {/* Monthly Earnings Card */}
                {monthlyStats && (
                    <TouchableOpacity
                        style={[styles.actionCardContainer, { width: '100%', marginBottom: 25 }]}
                        onPress={() => navigation.navigate('History', { userId })}
                    >
                        <LinearGradient 
                            colors={['#059669', '#10b981']} 
                            style={[styles.actionCard, { height: 'auto', padding: 18, alignItems: 'stretch' }]}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Ionicons name="wallet-outline" size={24} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Monthly Est. Payout</Text>
                                </View>
                                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>${monthlyStats.totalSalary}</Text>
                            </View>
                            
                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }}>BASE SALARY</Text>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>${monthlyStats.baseSalary}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }}>OT PAY ({monthlyStats.totalOTHours}h)</Text>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>+${monthlyStats.otPay}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Online Orders Alert - Native Version */}
                <TouchableOpacity
                    style={[styles.actionCardContainer, { width: '100%', marginBottom: 15 }]}
                    onPress={() => storeId && navigation.navigate('OnlineOrders', { storeId })}
                >
                    <LinearGradient colors={['#2563eb', '#3b82f6']} style={[styles.actionCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 80 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <Ionicons name="notifications" size={32} color="#fff" />
                            <View>
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Online Orders</Text>
                                <Text style={{ color: '#bfdbfe', fontSize: 13 }}>{pendingOrderCount > 0 ? `${pendingOrderCount} Pending` : 'No active orders'}</Text>
                            </View>
                        </View>
                        {pendingOrderCount > 0 && (
                            <View style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>{pendingOrderCount}</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Actions Grid */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionCardContainer} onPress={() => startScan('in')}>
                        <LinearGradient colors={colors.primaryGradient} style={styles.actionCard}>
                            <Ionicons name="scan-outline" size={32} color="#fff" />
                            <Text style={styles.actionText}>Clock In</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCardContainer} onPress={() => startScan('out')}>
                        <LinearGradient colors={['#f97316', '#fb923c']} style={styles.actionCard}>
                            <Ionicons name="stop-circle-outline" size={32} color="#fff" />
                            <Text style={styles.actionText}>Clock Out</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCardContainer} onPress={() => navigation.navigate('LeaveRequest')}>
                        <LinearGradient colors={colors.accentGradient} style={styles.actionCard}>
                            <Ionicons name="calendar-outline" size={32} color="#fff" />
                            <Text style={styles.actionText}>Request Leave</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCardContainer} onPress={() => navigation.navigate('OvertimeRequest')}>
                        <LinearGradient colors={['#10b981', '#34d399']} style={styles.actionCard}>
                            <Ionicons name="time-outline" size={32} color="#fff" />
                            <Text style={styles.actionText}>Request OT</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCardContainer}
                        onPress={() => storeId && navigation.navigate('Tasks', { storeId })}
                        disabled={!storeId}
                    >
                        <LinearGradient colors={storeId ? ['#8b5cf6', '#a78bfa'] : ['#cbd5e1', '#94a3b8']} style={styles.actionCard}>
                            <Ionicons name="checkbox-outline" size={32} color="#fff" />
                            <Text style={styles.actionText}>Tasks</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Rewards */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Rewards</Text>
                {availableRewards.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="gift-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 10 }} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active rewards. Clock in early to earn!</Text>
                    </View>
                ) : (
                    <View style={styles.rewardsList}>
                        {availableRewards.map(reward => (
                            <View key={reward.id} style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <LinearGradient colors={['#f3e8ff', '#f3e8ff']} style={styles.rewardIcon}>
                                    <Text>🎁</Text>
                                </LinearGradient>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={[styles.rewardTitle, { color: colors.text }]}>Early Bird Reward</Text>
                                    <Text style={[styles.rewardDate, { color: colors.textSecondary }]}>{new Date(reward.date).toLocaleDateString()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => openRewardMenu(reward.id)}>
                                    <LinearGradient colors={['#9333ea', '#a855f7']} style={styles.claimButton}>
                                        <Text style={styles.claimText}>Claim</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {loading && (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.card + 'aa' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {/* Reward Modal */}
            <Modal visible={showRewardMenu} animationType="slide" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Pick Your Drink</Text>
                            <TouchableOpacity onPress={() => setShowRewardMenu(false)}>
                                <Text style={{ color: colors.textSecondary }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.productList}>
                            {rewardProducts.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => handleClaimProduct(p)}
                                    style={[styles.productCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                                >
                                    <View style={[styles.productIcon, { backgroundColor: colors.border }]}>
                                        <Text>☕</Text>
                                    </View>
                                    <Text style={[styles.productName, { color: colors.text }]}>{p.name}</Text>
                                    <Text style={[styles.freeBadge, { color: colors.success }]}>FREE</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 50, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    greeting: { fontSize: 20, fontWeight: 'bold' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    statsRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    statCard: { flex: 1, padding: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', marginTop: 5 },
    statLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, marginBottom: 30 },
    actionCardContainer: { width: '47%', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    actionCard: { padding: 20, borderRadius: 20, alignItems: 'center', height: 120, justifyContent: 'center' },
    actionText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginTop: 10 },

    emptyState: { padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
    emptyText: { textAlign: 'center' },
    rewardsList: { gap: 10 },
    rewardCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1 },
    rewardIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    rewardTitle: { fontWeight: 'bold', fontSize: 15 },
    rewardDate: { fontSize: 12 },
    claimButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    claimText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    overlay: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
    overlayText: { color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 5 },
    cancelButton: { backgroundColor: '#fff', padding: 15, borderRadius: 30, paddingHorizontal: 40 },
    buttonText: { fontWeight: 'bold' },

    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    productList: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    productCard: { width: '47%', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
    productIcon: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    productName: { textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
    freeBadge: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
});
