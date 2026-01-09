import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Aircraft, Flight } from '../../types';

export const HomeScreen = ({ navigation }: any) => {
    const [aircraft, setAircraft] = useState<Aircraft | null>(null);
    const [activeFlight, setActiveFlight] = useState<Flight | null>(null);

    const parseHHMMToMinutes = (value: any): number => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        if (typeof value === 'string') {
            const m = value.match(/^(\d+):(\d{2})$/);
            if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        }
        return 0;
    };

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
                    totalHours: (result as any).total_hours || 0,
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
                    <Text style={styles.loadingText}>Cargando datos de la aeronave...</Text>
                    <Button title="Ir a configuración" onPress={() => navigation.navigate('AircraftSetup')} style={{ marginTop: 20 }} />
                </View>
            </ScreenLayout>
        );
    }

    const warnings = getMaintenanceWarnings();

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>INICIO</Text>
                    <Text style={styles.subtitle}>{aircraft.name} ({aircraft.code})</Text>
                </View>

                {activeFlight && (
                    <View style={styles.activeFlightCard}>
                        <Text style={styles.activeFlightTitle}>¡Vuelo en progreso!</Text>
                        <Button
                            title="REANUDAR VUELO"
                            onPress={() => navigation.navigate('FlightTimer', { flightId: activeFlight.id, type: activeFlight.type })}
                            style={{ marginTop: 8, backgroundColor: colors.primary }}
                        />
                    </View>
                )}

                {warnings.length > 0 && (
                    <View style={styles.warningCard}>
                        <Text style={styles.warningTitle}>Alertas de mantenimiento</Text>
                        {warnings.map((w, i) => (
                            <Text key={i} style={styles.warningText}>• {w}</Text>
                        ))}
                    </View>
                )}

                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Tiempo total de vuelo</Text>
                        <Text style={styles.statValue}>{formatHours(aircraft.totalHours || 0)}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Motores</Text>
                        <Text style={styles.statValue}>{aircraft.motors.length}</Text>
                    </View>
					<View style={styles.statDivider} />
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Tiempo por motor</Text>
						{aircraft.motors.map((m, index) => (
							<Text key={`${m.code || 'motor'}-${index}`} style={styles.motorValue}>
								{m.code}: {formatHours(parseHHMMToMinutes((m as any).hours))}
							</Text>
						))}
					</View>
                </View>

                <Text style={styles.sectionTitle}>Iniciar vuelo</Text>
                <View style={styles.row}>
                    <Button
                        title="Vuelo operativo"
                        onPress={() => navigation.navigate('Checklist', { type: 'Operativo' })}
                        style={{ flex: 1, marginRight: 8, height: 60 }}
                    />
                    <Button
                        title="Vuelo de ensayo"
                        variant="secondary"
                        onPress={() => navigation.navigate('Checklist', { type: 'Ensayo' })}
                        style={{ flex: 1, marginLeft: 8, height: 60 }}
                    />
                </View>

                <Text style={styles.sectionTitle}>Gestión</Text>
                <View style={styles.grid}>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('AircraftSetup')}>
                        <Text style={styles.gridText}>Editar aeronave</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('PilotManagement')}>
                        <Text style={styles.gridText}>Pilotos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('OperationalLogbook')}>
                        <Text style={styles.gridText}>Bitácora Operativa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('TestLogbook')}>
                        <Text style={styles.gridText}>Bitácora Ensayo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('FlightBook')}>
                        <Text style={styles.gridText}>Libros de vuelo</Text>
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
        ...(typography.body as TextStyle),
        color: colors.textSecondary,
    },
    header: {
        marginBottom: spacing.l,
    },
    title: {
        ...(typography.h1 as TextStyle),
        color: colors.primary,
    },
    subtitle: {
        ...(typography.h3 as TextStyle),
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    activeFlightCard: {
        backgroundColor: colors.surfaceHighlight,
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    activeFlightTitle: {
        ...(typography.h3 as TextStyle),
        color: colors.primary,
        textAlign: 'center',
        marginBottom: spacing.s,
    },
    warningCard: {
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.l,
        borderWidth: 1,
        borderColor: colors.secondary,
    },
    warningTitle: {
        ...(typography.h3 as TextStyle),
        color: colors.secondary,
        marginBottom: spacing.s,
    },
    warningText: {
        ...(typography.body as TextStyle),
        color: colors.secondary,
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
        ...(typography.caption as TextStyle),
        marginBottom: spacing.xs,
    },
    statValue: {
        ...(typography.h2 as TextStyle),
        color: colors.text,
    },
	motorValue: {
		...(typography.body as TextStyle),
		color: colors.text,
	},
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginHorizontal: spacing.m,
    },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
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
        ...(typography.button as TextStyle),
        color: colors.text,
    },
});
