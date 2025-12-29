import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Modal, StyleSheet, Alert, TouchableOpacity, TextStyle } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Pilot } from '../../types';

const pilotSchema = z.object({
    name: z.string().min(1, 'Required'),
    cc: z.string().min(1, 'Required'),
    licenseNum: z.string().min(1, 'Required'),
    licenseType: z.string().min(1, 'Required'),
    licenseExpiry: z.date(),
});

type PilotFormData = z.infer<typeof pilotSchema>;

export const PilotManagementScreen = ({ navigation }: any) => {
    const [pilots, setPilots] = useState<Pilot[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const { control, handleSubmit, reset, setValue, watch } = useForm<PilotFormData>({
        resolver: zodResolver(pilotSchema),
        defaultValues: {
            name: '',
            cc: '',
            licenseNum: '',
            licenseType: '',
            licenseExpiry: new Date(),
        },
    });

    const licenseExpiry = watch('licenseExpiry');

    const loadPilots = async () => {
        try {
            const result = await db.getAllAsync('SELECT * FROM pilots');
            setPilots(result as Pilot[]);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadPilots();
    }, []);

    const onSubmit = async (data: PilotFormData) => {
        try {
            await db.runAsync(
                `INSERT INTO pilots (name, cc, license_num, license_type, license_expiry) VALUES (?, ?, ?, ?, ?)`,
                [data.name, data.cc, data.licenseNum, data.licenseType, data.licenseExpiry.toISOString()]
            );
            setModalVisible(false);
            reset();
            loadPilots();
            Alert.alert('Success', 'Pilot registered');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save pilot');
        }
    };

    const renderPilot = ({ item }: { item: Pilot }) => (
        <View style={styles.card}>
            <Text style={styles.pilotName}>{item.name}</Text>
            <Text style={styles.pilotInfo}>Lic: {item.licenseNum} ({item.licenseType})</Text>
            <Text style={styles.pilotInfo}>Exp: {new Date(item.licenseExpiry).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={styles.title}>Pilots</Text>
                <Button title="+ New Pilot" onPress={() => setModalVisible(true)} style={{ height: 40 }} />
            </View>

            <FlatList
                data={pilots}
                renderItem={renderPilot}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No pilots registered yet.</Text>}
            />

            <Button
                title="Finish Setup"
                onPress={() => navigation.navigate('Dashboard')}
                style={styles.finishButton}
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Pilot</Text>

                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Name" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="cc"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="CC" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="licenseNum"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="License Number" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="licenseType"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="License Type" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />

                        <Text style={styles.label}>License Expiry</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                            <Text style={styles.dateText}>{licenseExpiry.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={licenseExpiry}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setValue('licenseExpiry', selectedDate);
                                }}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Save" onPress={handleSubmit(onSubmit)} style={{ flex: 1, marginLeft: 8 }} />
                        </View>
                    </View>
                </View>
            </Modal>
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
    card: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.s,
    },
    pilotName: {
		...(typography.body as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
    },
    pilotInfo: {
        ...typography.caption,
        marginTop: 2,
    },
    emptyText: {
        ...typography.body,
        textAlign: 'center',
        marginTop: spacing.xl,
        color: colors.textSecondary,
    },
    finishButton: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.m,
    },
    modalContent: {
        backgroundColor: colors.surface,
        padding: spacing.m,
        borderRadius: 12,
    },
    modalTitle: {
		...(typography.h3 as TextStyle),
		fontWeight: '600' as TextStyle['fontWeight'],
        marginBottom: spacing.m,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: spacing.m,
    },
    label: {
        ...typography.body,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    dateButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.m,
        marginBottom: spacing.m,
    },
    dateText: {
        color: colors.text,
        fontSize: 16,
    },
});
