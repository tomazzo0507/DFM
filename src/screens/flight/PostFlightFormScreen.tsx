import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SignaturePad } from '../../components/ui/SignaturePad';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

const postFlightSchema = z.object({
    status: z.string().min(1, 'Required'),
    notes: z.string().optional(),
    pdfName: z.string().min(1, 'Required').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters'),
});

type PostFlightFormData = z.infer<typeof postFlightSchema>;

export const PostFlightFormScreen = ({ navigation, route }: any) => {
    const { flightId, duration } = route.params;
    const [signatures, setSignatures] = useState<{ [key: string]: string }>({});
    const [currentSigner, setCurrentSigner] = useState<string | null>(null);
    const [crew, setCrew] = useState<any | null>(null);

    const { control, handleSubmit, setValue } = useForm<PostFlightFormData>({
        resolver: zodResolver(postFlightSchema),
        defaultValues: {
            status: '',
            notes: '',
            pdfName: `Flight_${flightId}`,
        },
    });

    useEffect(() => {
        const loadCrew = async () => {
            try {
                const row = await db.getFirstAsync('SELECT crew FROM flights WHERE id = ?', [flightId]);
                if (row?.crew) {
                    setCrew(JSON.parse(row.crew));
                }
            } catch {}
        };
        loadCrew();
    }, [flightId]);

    const roles: Array<{ key: string; label: string; required: boolean }> = useMemo(() => {
        const base: Array<{ key: string; label: string; required: boolean }> = [
            { key: 'Internal Pilot', label: 'Internal Pilot', required: true },
            { key: 'External Pilot', label: 'External Pilot', required: true },
        ];
        if (crew?.missionLeader) {
            base.push({ key: 'Mission Leader', label: 'Mission Leader', required: true });
        }
        if (crew?.flightEngineer) {
            base.push({ key: 'Flight Engineer', label: 'Flight Engineer', required: true });
        }
        return base;
    }, [crew]);

    const handleSign = (role: string) => {
        setCurrentSigner(role);
    };

    const onSignatureSaved = (signature: string) => {
        if (currentSigner) {
            setSignatures(prev => ({ ...prev, [currentSigner]: signature }));
            setCurrentSigner(null);
        }
    };

    const generatePDF = async (data: PostFlightFormData, flightData: any) => {
        // Basic HTML template for now
        const html = `
      <html>
        <body>
          <h1>Flight Report: ${data.pdfName}</h1>
          <p>Date: ${flightData.date}</p>
          <p>Duration: ${duration} seconds</p>
          <p>Status: ${data.status}</p>
          <p>Notes: ${data.notes}</p>
          <h2>Signatures</h2>
          ${Object.entries(signatures).map(([role, sig]) => `
            <div>
              <h3>${role}</h3>
              <img src="${sig}" width="200" />
            </div>
          `).join('')}
        </body>
      </html>
    `;

        const { uri } = await Print.printToFileAsync({ html });
        const newPath = `${FileSystem.documentDirectory}${data.pdfName}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: newPath });
        return newPath;
    };

    const onSubmit = async (data: PostFlightFormData) => {
        // Validate signatures (required roles only)
        const missing = roles.filter(r => r.required && !signatures[r.key]).map(r => r.label);
        if (missing.length > 0) {
            Alert.alert('Error', `Missing required signatures: ${missing.join(', ')}`);
            return;
        }

        try {
            // Fetch full flight data for PDF
            const flightRes = await db.getFirstAsync('SELECT * FROM flights WHERE id = ?', [flightId]);

            const pdfPath = await generatePDF(data, flightRes);

            await db.runAsync(
                `UPDATE flights SET postvuelo = ?, signatures = ?, pdf_path = ? WHERE id = ?`,
                [
                    JSON.stringify({ status: data.status, notes: data.notes }),
                    JSON.stringify(signatures),
                    pdfPath,
                    flightId
                ]
            );

            // Navigate to PostFlight Checklist
            navigation.navigate('Checklist', { type: (flightRes as any).type, stage: 'PostFlight' });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save post-flight data');
        }
    };

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Post-Flight Report</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Duration: {Math.floor(duration / 60)}m {duration % 60}s</Text>
                </View>

                <Controller
                    control={control}
                    name="status"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Post-Flight Status" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value } }) => (
                        <Input label="Notes" value={value} onChangeText={onChange} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="pdfName"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Report Name (PDF)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <Text style={styles.sectionTitle}>Signatures</Text>
                {roles.map(({ key, label, required }) => (
                    <View key={key} style={styles.signatureRow}>
                        <Text style={styles.roleText}>
                            {label}{required ? ' *' : ''}
                        </Text>
                        {signatures[key] ? (
                            <TouchableOpacity onPress={() => handleSign(key)}>
                                <Image source={{ uri: signatures[key] }} style={styles.signatureImage} />
                            </TouchableOpacity>
                        ) : (
                            <Button title="Sign" variant="outline" onPress={() => handleSign(key)} style={{ width: 100 }} />
                        )}
                    </View>
                ))}

                <Button title="Save & Generate Report" onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.xl }} />

                <SignaturePad
                    visible={!!currentSigner}
                    title={`Signature: ${currentSigner}`}
                    onOK={onSignatureSaved}
                    onCancel={() => setCurrentSigner(null)}
                />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.m,
    },
    infoCard: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    infoText: {
        ...typography.h3,
        textAlign: 'center',
    },
    sectionTitle: {
        ...typography.h3,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceHighlight,
    },
    roleText: {
        ...typography.body,
    },
    signatureImage: {
        width: 100,
        height: 50,
        resizeMode: 'contain',
        backgroundColor: 'white',
    },
});
