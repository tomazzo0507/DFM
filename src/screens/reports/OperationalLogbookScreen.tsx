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
import { zipFilesBase64 } from '../../utils/zip';

export const OperationalLogbookScreen = () => {
	const [flights, setFlights] = useState<Flight[]>([]);

	useFocusEffect(
		useCallback(() => {
			const loadFlights = async () => {
				try {
					const result = await db.getAllAsync('SELECT * FROM flights WHERE type = ? AND pdf_path IS NOT NULL ORDER BY date DESC', ['Operativo']);
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

	const exportZIP = async () => {
		try {
			const files = flights.filter(f => f.pdfPath).map((f) => ({
				name: `flight_${f.id}.pdf`,
				path: f.pdfPath as string,
			}));
			if (files.length === 0) {
				Alert.alert('No files', 'No PDFs to export');
				return;
			}
			const outDir = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Export', 'BitacoraOperativa');
			try { outDir.create({ intermediates: true, idempotent: true }); } catch {}
			const outFile = new FileSystem.File(outDir, 'bitacora_operativa.zip');
			const path = await zipFilesBase64(files, outFile.uri);
			Alert.alert('Exported', `Saved to: ${path}`);
			if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
		} catch (e) {
			console.error(e);
			Alert.alert('Error', 'Failed to export ZIP');
		}
	};

	const renderItem = ({ item }: { item: Flight }) => (
		<TouchableOpacity style={styles.card} onPress={() => handleOpenPDF(item.pdfPath)}>
			<View style={styles.iconContainer}>
				<FileText color={colors.primary} size={24} />
			</View>
			<View style={styles.info}>
				<Text style={styles.date}>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}</Text>
				<Text style={styles.type}>{item.type}</Text>
				<Text style={styles.duration}>Duración: {Math.floor(item.duration / 60)}m {item.duration % 60}s</Text>
			</View>
		</TouchableOpacity>
	);

	return (
		<ScreenLayout>
			<View style={styles.header}>
				<Text style={styles.title}>Bitácora Operativa</Text>
				<TouchableOpacity onPress={exportZIP}><Text style={styles.export}>Exportar ZIP</Text></TouchableOpacity>
			</View>
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
	export: {
		...(typography.button as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
		color: colors.primary,
	},
	list: { paddingBottom: 40 },
	card: {
		backgroundColor: colors.surfaceHighlight,
		padding: spacing.m,
		borderRadius: 8,
		marginBottom: spacing.s,
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconContainer: { marginRight: spacing.m },
	info: { flex: 1 },
	date: { ...(typography.body as TextStyle), fontWeight: '600' as TextStyle['fontWeight'] },
	type: { ...typography.caption, color: colors.textSecondary },
	duration: { ...typography.caption, marginTop: 2 },
	emptyText: { ...typography.body, textAlign: 'center', marginTop: spacing.xl, color: colors.textSecondary },
});


