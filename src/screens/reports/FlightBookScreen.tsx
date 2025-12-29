import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Flight } from '../../types';

export const FlightBookScreen = () => {
    const [flights, setFlights] = useState<Flight[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadFlights = async () => {
                try {
                    const result = await db.getAllAsync('SELECT * FROM flights ORDER BY date DESC');
                    setFlights(result as Flight[]);
                } catch (error) {
                    console.error(error);
                }
            };
            loadFlights();
        }, [])
    );

    const exportPDF = async () => {
        try {
            const html = `
        <html>
          <head>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid black; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Flight Book</h1>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${flights.map(f => `
                  <tr>
                    <td>${f.id}</td>
                    <td>${new Date(f.date).toLocaleDateString()} ${new Date(f.date).toLocaleTimeString()}</td>
                    <td>${f.type}</td>
                    <td>${f.status}</td>
                    <td>${Math.floor(f.duration / 60)}m ${f.duration % 60}s</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

			const { uri } = await Print.printToFileAsync({ html });
			const destFile = new FileSystem.File(FileSystem.Paths.document, 'Libro_Vuelos.pdf');
			const srcFile = new FileSystem.File(uri);
			srcFile.move(destFile);
			Alert.alert('Exported', `Saved to: ${destFile.uri}`);
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(destFile.uri);
			}
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export PDF');
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={styles.title}>Flight Book</Text>
                <Button title="Export PDF" onPress={exportPDF} style={{ height: 40 }} />
            </View>

            <ScrollView horizontal>
                <View>
                    <View style={[styles.row, styles.headerRow]}>
                        <Text style={[styles.cell, styles.headerCell, { width: 50 }]}>ID</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: 150 }]}>Date</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Type</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.cell, styles.headerCell, { width: 100 }]}>Duration</Text>
                    </View>
                    <ScrollView>
                        {flights.map((item) => (
                            <View key={item.id} style={styles.row}>
                                <Text style={[styles.cell, { width: 50 }]}>{item.id}</Text>
                                <Text style={[styles.cell, { width: 150 }]}>{new Date(item.date).toLocaleDateString()}</Text>
                                <Text style={[styles.cell, { width: 100 }]}>{item.type}</Text>
                                <Text style={[styles.cell, { width: 100 }]}>{item.status}</Text>
                                <Text style={[styles.cell, { width: 100 }]}>{Math.floor(item.duration / 60)}m {item.duration % 60}s</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    title: {
		...(typography.h2 as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerRow: {
        backgroundColor: colors.surfaceHighlight,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    cell: {
        padding: spacing.s,
        ...typography.body,
    },
    headerCell: {
		fontWeight: '600' as TextStyle['fontWeight'],
        color: colors.textSecondary,
    },
});
