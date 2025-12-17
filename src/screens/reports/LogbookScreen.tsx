import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Flight } from '../../types';
import { FileText } from 'lucide-react-native';

export const LogbookScreen = () => {
    const [flights, setFlights] = useState<Flight[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadFlights = async () => {
                try {
                    const result = await db.getAllAsync('SELECT * FROM flights WHERE pdf_path IS NOT NULL ORDER BY date DESC');
                    setFlights(result as Flight[]);
                } catch (error) {
                    console.error(error);
                }
            };
            loadFlights();
        }, [])
    );

    const handleOpenPDF = async (pdfPath?: string) => {
        if (!pdfPath) {
            Alert.alert('Error', 'No PDF available for this flight');
            return;
        }

        if (!(await Sharing.isAvailableAsync())) {
            Alert.alert('Error', 'Sharing is not available on this device');
            return;
        }

        await Sharing.shareAsync(pdfPath);
    };

    const renderItem = ({ item }: { item: Flight }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleOpenPDF(item.pdfPath)}>
            <View style={styles.iconContainer}>
                <FileText color={colors.primary} size={24} />
            </View>
            <View style={styles.info}>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}</Text>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.duration}>Duration: {Math.floor(item.duration / 60)}m {item.duration % 60}s</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout>
            <Text style={styles.title}>Logbook</Text>
            <FlatList
                data={flights}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>No flight reports yet.</Text>}
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    title: {
        ...typography.h2,
        marginBottom: spacing.m,
    },
    list: {
        paddingBottom: 40,
    },
    card: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.s,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: spacing.m,
    },
    info: {
        flex: 1,
    },
    date: {
        ...typography.body,
        fontWeight: '600',
    },
    type: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    duration: {
        ...typography.caption,
        marginTop: 2,
    },
    emptyText: {
        ...typography.body,
        textAlign: 'center',
        marginTop: spacing.xl,
        color: colors.textSecondary,
    },
});
