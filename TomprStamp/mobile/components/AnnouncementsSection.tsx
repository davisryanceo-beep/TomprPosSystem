import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiGetAnnouncements } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'Normal' | 'Important';
    timestamp: string;
    authorName: string;
}

export default function AnnouncementsSection({ storeId }: { storeId: string }) {
    const { colors } = useTheme();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (storeId) {
            loadData();
        }
    }, [storeId]);

    const loadData = async () => {
        try {
            const data = await apiGetAnnouncements(storeId);
            setAnnouncements(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading || announcements.length === 0) return null;

    const renderItem = ({ item }: { item: Announcement }) => {
        const isImportant = item.priority === 'Important';
        const gradientColors = isImportant
            ? ['#f87171', '#ef4444'] as const // Red gradient for important
            : ['#60a5fa', '#3b82f6'] as const; // Blue gradient for normal

        return (
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: colors.border }]}
            >
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {isImportant && <Ionicons name="alert-circle" size={18} color="#fff" />}
                </View>
                <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                <View style={styles.footerRow}>
                    <View style={styles.authorBadge}>
                        <Text style={styles.authorText}>{item.authorName}</Text>
                    </View>
                    <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                </View>
            </LinearGradient>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📢 Announcements</Text>
            <FlatList
                data={announcements}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                snapToInterval={width * 0.75 + 15}
                decelerationRate="fast"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 15,
    },
    card: {
        width: width * 0.75,
        borderRadius: 20,
        padding: 20,
        marginRight: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        justifyContent: 'space-between',
        height: 160,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginRight: 10,
    },
    content: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 15,
        lineHeight: 20,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    authorBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    authorText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
});
