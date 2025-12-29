import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextStyle } from 'react-native';
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
    date: z.string().trim().min(1, 'Required'),        // DD/MM/AAAA
    time: z.string().trim().min(1, 'Required'),        // HH:MM
    coordinates: z.string().trim().min(1, 'Required'),
    locationGeneral: z.string().trim().min(1, 'Required'),
    purpose: z.string().trim().min(1, 'Required'),
    estimatedTime: z.string().trim().min(1, 'Required'),
    aircraftState: z.string().trim().min(1, 'Required'), // Estado prevuelo
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
            date: '',
            time: '',
            coordinates: '',
            locationGeneral: '',
            purpose: '',
            estimatedTime: '',
            aircraftState: '',
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

                // Prefill date/time defaults
                const now = new Date();
                const pad = (n: number) => n.toString().padStart(2, '0');
                setValue('date', `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`);
                setValue('time', `${pad(now.getHours())}:${pad(now.getMinutes())}`);
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
                        fecha: data.date,
                        hora: data.time,
                        coordenadas: data.coordinates,
                        ubicacionGeneral: data.locationGeneral,
                        proposito: data.purpose,
                        tiempoEstimado: data.estimatedTime,
                        estadoPrevuelo: data.aircraftState,
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

    const parsedFlightDate = (() => {
        // date format DD/MM/AAAA
        const d = watch('date');
        if (!d) return new Date();
        const [dd, mm, yyyy] = d.split('/').map((x) => parseInt(x, 10));
        if (!dd || !mm || !yyyy) return new Date();
        return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    })();

    const pilotItems = pilots
        .filter(p => {
            const exp = new Date(p.licenseExpiry);
            return exp >= parsedFlightDate;
        })
        .map(p => ({ label: p.name, value: p.id }));

    const batteryItems = aircraft ? [
        ...aircraft.batteriesMain.map(b => ({ label: `Main: ${b.code}`, value: b.code })),
        ...aircraft.batteriesSpare.map(b => ({ label: `Spare: ${b.code}`, value: b.code })),
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
                    name="date"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Date (DD/MM/AAAA)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="time"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Time (HH:MM)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
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
                    name="coordinates"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Coordinates" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="locationGeneral"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="General Location" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="aircraftState"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Aircraft State (Pre-flight)" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} style={{ height: 80 }} />
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
        ...(typography.h2 as TextStyle),
        color: colors.primary,
    },
    subtitle: {
        ...(typography.h3 as TextStyle),
        color: colors.textSecondary,
        marginBottom: spacing.l,
    },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
});
