import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Aircraft, Flight } from '../../types';

export const HomeScreen = ({ navigation }: any) => {
    const [aircraft, setAircraft] = useState<Aircraft | null>(null);
    const [activeFlight, setActiveFlight] = useState<Flight | null>(null);

    const loadData = async () => {
        try {
            // Check for active flight
            const active = await db.getFirstAsync('SELECT * FROM flights WHERE status = ?', ['EnCurso']);
            if (active) {
                setActiveFlight(active as Flight);
            } else {
                setActiveFlight(null);
            }

            const result = await db.getFirstAsync('SELECT * FROM aircraft LIMIT 1');
            if (result) {
                const parsed = {
                    ...result,
                    motors: JSON.parse((result as any).motors),
                    batteriesMain: JSON.parse((result as any).batteries_main),
                    batteriesSpare: JSON.parse((result as any).batteries_spare),
                    cameras: JSON.parse((result as any).cameras),
                };
                setAircraft(parsed as Aircraft);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const formatHours = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const getMaintenanceWarnings = () => {
        if (!aircraft) return [];
        const warnings: string[] = [];
        aircraft.motors.forEach((m, i) => {
            // 180 hours = 10800 minutes
            if (m.hours >= 10800) {
                warnings.push(`Motor ${m.code} has exceeded 180 hours!`);
            }
        });
        return warnings;
    };

    if (!aircraft) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading Aircraft Data...</Text>
                    <Button title="Go to Setup" onPress={() => navigation.navigate('AircraftSetup')} style={{ marginTop: 20 }} />
                </View>
            </ScreenLayout>
        );
    }

    const warnings = getMaintenanceWarnings();

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>{aircraft.name} ({aircraft.code})</Text>
                </View>

                {activeFlight && (
                    <View style={styles.activeFlightCard}>
                        <Text style={styles.activeFlightTitle}>Flight in Progress!</Text>
                        <Button
                            title="RESUME FLIGHT"
                            onPress={() => navigation.navigate('FlightTimer', { flightId: activeFlight.id, type: activeFlight.type })}
                            style={{ marginTop: 8, backgroundColor: colors.success }}
                        />
                    </View>
                )}

                {warnings.length > 0 && (
                    <View style={styles.warningCard}>
                        <Text style={styles.warningTitle}>Maintenance Alerts</Text>
                        {warnings.map((w, i) => (
                            <Text key={i} style={styles.warningText}>• {w}</Text>
                        ))}
                    </View>
                )}

                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Flight Time</Text>
                        <Text style={styles.statValue}>{formatHours(aircraft.totalHours || 0)}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Motors</Text>
                        <Text style={styles.statValue}>{aircraft.motors.length}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Start Flight</Text>
                <View style={styles.row}>
                    <Button
                        title="Operational Flight"
                        onPress={() => navigation.navigate('Checklist', { type: 'Operativo' })}
                        style={{ flex: 1, marginRight: 8, height: 60 }}
                    />
                    <Button
                        title="Test Flight"
                        variant="secondary"
                        onPress={() => navigation.navigate('Checklist', { type: 'Ensayo' })}
                        style={{ flex: 1, marginLeft: 8, height: 60 }}
                    />
                </View>

                <Text style={styles.sectionTitle}>Management</Text>
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('AircraftSetup')}>
                        <Text style={styles.gridText}>Edit Aircraft</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('PilotManagement')}>
                        <Text style={styles.gridText}>Pilots</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Logbook')}>
                        <Text style={styles.gridText}>Logbooks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('FlightBook')}>
                        <Text style={styles.gridText}>Flight Books</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    header: {
        marginBottom: spacing.l,
    },
    title: {
        ...typography.h1,
        color: colors.primary,
    },
    subtitle: {
        ...typography.h3,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    activeFlightCard: {
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.success,
    },
    activeFlightTitle: {
        ...typography.h3,
        color: colors.success,
        textAlign: 'center',
        marginBottom: spacing.s,
    },
    warningCard: {
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.error,
    },
    warningTitle: {
        ...typography.h3,
        color: colors.error,
        marginBottom: spacing.s,
    },
    warningText: {
        ...typography.body,
        color: colors.error,
        marginBottom: 4,
    },
    statsCard: {
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 12,
        padding: spacing.l,
        flexDirection: 'row',
        marginBottom: spacing.xl,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        ...typography.caption,
        marginBottom: spacing.xs,
    },
    statValue: {
        ...typography.h2,
        color: colors.text,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginHorizontal: spacing.m,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.m,
        marginTop: spacing.m,
    },
    row: {
        flexDirection: 'row',
        marginBottom: spacing.l,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.m,
    },
    gridItem: {
        width: '47%',
        backgroundColor: colors.surface,
        padding: spacing.l,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    gridText: {
        ...typography.button,
        color: colors.text,
    },
});
