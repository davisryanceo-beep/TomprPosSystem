import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiGetPendingOnlineOrders, apiUpdateOrder } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnlineOrdersScreen({ route, navigation }: any) {
    const { colors } = useTheme();
    const { storeId } = route.params || {};

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (storeId) {
            fetchOrders();
            const interval = setInterval(fetchOrders, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [storeId]);

    const fetchOrders = async () => {
        if (!storeId) return;
        try {
            const res = await apiGetPendingOnlineOrders(storeId);
            setOrders(res.orders || []);
        } catch (e) {
            console.log("Error fetching orders", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setProcessingId(orderId);
        try {
            await apiUpdateOrder(orderId, { status: newStatus });
            Alert.alert("Success", `Order moved to ${newStatus}`);
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(null); // Close modal if completed
            }
        } catch (e: any) {
            Alert.alert("Error", e.response?.data?.error || "Failed to update order");
        } finally {
            setProcessingId(null);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let bg = colors.border;
        let color = colors.textSecondary;

        if (status === 'Created') { bg = '#dbeafe'; color = '#1e40af'; }
        else if (status === 'Preparing') { bg = '#fef3c7'; color = '#92400e'; }
        else if (status === 'Ready') { bg = '#dcfce7'; color = '#166534'; }

        return (
            <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: color, fontSize: 10, fontWeight: 'bold' }}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSelectedOrder(item)}
        >
            <View style={styles.row}>
                <View>
                    <Text style={[styles.orderId, { color: colors.text }]}>#{item.id.slice(-6)}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: colors.primary }]}>${item.finalAmount?.toFixed(2)}</Text>
                    <StatusBadge status={item.status} />
                </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {item.items?.length || 0} item(s) • {item.orderType}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Pending Orders</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending orders</Text>
                        </View>
                    }
                />
            )}

            {/* Order Details Modal */}
            <Modal visible={!!selectedOrder} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Order Details</Text>
                            <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedOrder && (
                            <ScrollView contentContainerStyle={{ padding: 20 }}>
                                <View style={styles.detailRow}>
                                    <Text style={{ color: colors.textSecondary }}>Order ID:</Text>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>#{selectedOrder.id}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={{ color: colors.textSecondary }}>Customer:</Text>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{selectedOrder.customerName || 'Guest'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={{ color: colors.textSecondary }}>Type:</Text>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{selectedOrder.orderType}</Text>
                                </View>

                                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 15 }]} />

                                <Text style={[styles.sectionHeader, { color: colors.text }]}>Items</Text>
                                {selectedOrder.items?.map((item: any, idx: number) => (
                                    <View key={idx} style={styles.itemRow}>
                                        <Text style={{ color: colors.text, flex: 1 }}>{item.quantity}x {item.productName}</Text>
                                        <Text style={{ color: colors.text }}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
                                    </View>
                                ))}

                                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 15 }]} />

                                <View style={styles.detailRow}>
                                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Total</Text>
                                    <Text style={{ color: colors.primary, fontSize: 18, fontWeight: 'bold' }}>${selectedOrder.finalAmount?.toFixed(2)}</Text>
                                </View>

                                {/* Actions */}
                                <View style={{ marginTop: 30, gap: 10 }}>
                                    {selectedOrder.status === 'Created' && (
                                        <TouchableOpacity
                                            onPress={() => handleUpdateStatus(selectedOrder.id, 'Preparing')}
                                            disabled={!!processingId}
                                        >
                                            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.actionBtn}>
                                                {processingId === selectedOrder.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start Preparing</Text>}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}

                                    {selectedOrder.status === 'Preparing' && (
                                        <TouchableOpacity
                                            onPress={() => handleUpdateStatus(selectedOrder.id, 'Completed')}
                                            disabled={!!processingId}
                                        >
                                            <LinearGradient colors={['#10b981', '#059669']} style={styles.actionBtn}>
                                                {processingId === selectedOrder.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Complete Order</Text>}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}

                                    {selectedOrder.status === 'Received' && (
                                        <TouchableOpacity
                                            onPress={() => handleUpdateStatus(selectedOrder.id, 'Preparing')}
                                            disabled={!!processingId}
                                        >
                                            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionBtn}>
                                                {processingId === selectedOrder.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Accept & Prepare</Text>}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                </View>

                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingTop: 50, borderBottomWidth: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    list: { padding: 15 },
    card: { padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderId: { fontWeight: 'bold', fontSize: 16 },
    time: { fontSize: 12, marginTop: 4 },
    amount: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    divider: { height: 1, marginVertical: 10 },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 10, fontSize: 16 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    sectionHeader: { fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    actionBtn: { padding: 15, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
