import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Picker } from '../../components/ui/Picker';
import { MultiPicker } from '../../components/ui/MultiPicker';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Pilot, Aircraft } from '../../types';

const preFlightSchema = z.object({
    pilotInternal: z.number().min(1, 'Required'),
    pilotExternal: z.number().min(1, 'Required'),
    missionLeader: z.number().optional(),
    flightEngineer: z.number().optional(),
    batteries: z.array(z.string()).min(1, 'Select at least one battery'),
    camera: z.string().optional(),
    purpose: z.string().min(1, 'Required'),
    estimatedTime: z.string().min(1, 'Required'),
    location: z.string().min(1, 'Required'),
});

type PreFlightFormData = z.infer<typeof preFlightSchema>;

export const PreFlightFormScreen = ({ navigation, route }: any) => {
    const { type } = route.params || { type: 'Operativo' };
    const [pilots, setPilots] = useState<Pilot[]>([]);
    const [aircraft, setAircraft] = useState<Aircraft | null>(null);

    const { control, handleSubmit, setValue, watch } = useForm<PreFlightFormData>({
        resolver: zodResolver(preFlightSchema),
        defaultValues: {
            batteries: [],
            purpose: '',
            estimatedTime: '',
            location: '',
        },
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const pilotsRes = await db.getAllAsync('SELECT * FROM pilots');
                setPilots(pilotsRes as Pilot[]);

                const aircraftRes = await db.getFirstAsync('SELECT * FROM aircraft LIMIT 1');
                if (aircraftRes) {
                    setAircraft({
                        ...aircraftRes,
                        motors: JSON.parse((aircraftRes as any).motors),
                        batteriesMain: JSON.parse((aircraftRes as any).batteries_main),
                        batteriesSpare: JSON.parse((aircraftRes as any).batteries_spare),
                        cameras: JSON.parse((aircraftRes as any).cameras),
                    } as Aircraft);
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadData();
    }, []);

    const onSubmit = async (data: PreFlightFormData) => {
        try {
            // Create Flight Record
            const result = await db.runAsync(
                `INSERT INTO flights (type, status, date, crew, equipment, prevuelo) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    type,
                    'Programado',
                    new Date().toISOString(),
                    JSON.stringify({
                        pilotInternal: data.pilotInternal,
                        pilotExternal: data.pilotExternal,
                        missionLeader: data.missionLeader,
                        flightEngineer: data.flightEngineer,
                    }),
                    JSON.stringify({
                        batteries: data.batteries,
                        camera: data.camera,
                    }),
                    JSON.stringify({
                        purpose: data.purpose,
                        estimatedTime: data.estimatedTime,
                        location: data.location,
                    }),
                ]
            );

            // Navigate to Timer
            navigation.navigate('FlightTimer', { flightId: result.lastInsertRowId, type });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create flight');
        }
    };

    const pilotItems = pilots
        .filter(p => new Date(p.licenseExpiry) > new Date())
        .map(p => ({ label: p.name, value: p.id }));

    const batteryItems = aircraft ? [
        ...aircraft.batteriesMain.map(b => ({ label: `Main: ${b.code}`, value: b.id })),
        ...aircraft.batteriesSpare.map(b => ({ label: `Spare: ${b.code}`, value: b.id })),
    ] : [];

    const cameraItems = aircraft ? aircraft.cameras.map(c => ({ label: c.code, value: c.id })) : [];

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Pre-Flight Form</Text>
                <Text style={styles.subtitle}>{type} Flight</Text>

                <Text style={styles.sectionTitle}>General Info</Text>
                <Controller
                    control={control}
                    name="purpose"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Purpose of Flight" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="estimatedTime"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Estimated Time (min)" value={value} onChangeText={onChange} keyboardType="numeric" error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="location"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Location / Coordinates" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <Text style={styles.sectionTitle}>Crew</Text>
                <Controller
                    control={control}
                    name="pilotInternal"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Picker
                            label="Internal Pilot (Required)"
                            items={pilotItems}
                            value={value}
                            onValueChange={onChange}
                            error={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="pilotExternal"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Picker
                            label="External Pilot (Required)"
                            items={pilotItems}
                            value={value}
                            onValueChange={onChange}
                            error={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="missionLeader"
                    render={({ field: { onChange, value } }) => (
                        <Picker
                            label="Mission Leader (Optional)"
                            items={pilotItems}
                            value={value}
                            onValueChange={onChange}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="flightEngineer"
                    render={({ field: { onChange, value } }) => (
                        <Picker
                            label="Flight Engineer (Optional)"
                            items={pilotItems}
                            value={value}
                            onValueChange={onChange}
                        />
                    )}
                />

                <Text style={styles.sectionTitle}>Equipment</Text>
                <Controller
                    control={control}
                    name="batteries"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <MultiPicker
                            label="Batteries (Select all used)"
                            items={batteryItems}
                            values={value}
                            onValuesChange={onChange}
                            error={error?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="camera"
                    render={({ field: { onChange, value } }) => (
                        <Picker
                            label="Camera (Optional)"
                            items={cameraItems}
                            value={value}
                            onValueChange={onChange}
                        />
                    )}
                />

                <Button title="Start Flight" onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.xl }} />
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
        color: colors.primary,
    },
    subtitle: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.l,
    },
    sectionTitle: {
        ...typography.h3,
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
});
