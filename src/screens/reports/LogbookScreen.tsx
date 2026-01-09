import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { ScreenLayout } from '../../components/ScreenLayout';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Flight } from '../../types';
import { FileText } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';

export const LogbookScreen = () => {
    const [flights, setFlights] = useState<Flight[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadFlights = async () => {
                try {
                    const result = await db.getAllAsync('SELECT * FROM flights WHERE pdf_path IS NOT NULL ORDER BY date DESC');
                    // Enriquecer con datos adicionales
                    const enriched = [] as any[];
                    for (const row of (result as any[])) {
                        let pilotName = '';
                        let pilotCC = '';
                        let coords = '';
                        let cargaStr = 'Sin carga';
                        try {
                            const crew = row.crew ? JSON.parse(row.crew) : null;
                            const prev = row.prevuelo ? JSON.parse(row.prevuelo) : null;
                            const carga = row.carga ? JSON.parse(row.carga) : null;
                            if (crew?.pilot) {
                                const prow: any = await db.getFirstAsync('SELECT name, cc FROM pilots WHERE id = ?', [crew.pilot]);
                                pilotName = prow?.name || '';
                                pilotCC = prow?.cc || '';
                            }
                            if (prev?.coordenadas) coords = prev.coordenadas;
                            if (carga?.hasPayload) {
                                const w = (carga.weight ?? '').toString();
                                cargaStr = `Con carga${w ? ` - ${w} kg` : ''}`;
                            }
                        } catch {}
                        enriched.push({ ...row, pilotName, pilotCC, coords, cargaStr });
                    }
                    setFlights(enriched as any);
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
                <Text style={styles.duration}>Duración: {Math.floor((item as any).duration / 60)}m {(item as any).duration % 60}s</Text>
                {!!(item as any).pilotName && <Text style={styles.meta}>Piloto: {(item as any).pilotName} {(item as any).pilotCC ? `(Doc: ${(item as any).pilotCC})` : ''}</Text>}
                {!!(item as any).cargaStr && <Text style={styles.meta}>{(item as any).cargaStr}</Text>}
                {!!(item as any).coords && <Text style={styles.meta}>Coordenadas: {(item as any).coords}</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout>
            <Text style={styles.title}>Bitácora</Text>
            <FlatList
                data={flights}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.emptyText}>Aún no hay reportes de vuelo.</Text>}
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    title: {
		...(typography.h2 as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
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
		...(typography.body as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
    },
    type: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    duration: {
        ...typography.caption,
        marginTop: 2,
    },
    meta: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    emptyText: {
        ...typography.body,
        textAlign: 'center',
        marginTop: spacing.xl,
        color: colors.textSecondary,
    },
});
