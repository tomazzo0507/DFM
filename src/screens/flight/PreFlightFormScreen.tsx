import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextStyle, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Picker } from '../../components/ui/Picker';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import { Pilot, Aircraft } from '../../types';

const preFlightSchema = z.object({
    pilot: z.number().min(1, 'Requerido'),
    missionLeader: z.string().optional(),
    flightEngineer: z.string().optional(),
    batteries: z.string().trim().min(1, 'Requerido'),
    cameras: z.array(z.string()).optional(),
    date: z.string().trim().min(1, 'Requerido'),        // DD/MM/AAAA
    time: z.string().trim().min(1, 'Requerido'),        // HH:MM
    coordinates: z.string().trim().min(1, 'Requerido'),
    locationGeneral: z.string().trim().min(1, 'Requerido'),
    purpose: z.string().trim().min(1, 'Requerido'),
    estimatedTime: z.string().trim().min(1, 'Requerido'),
    aircraftState: z.string().trim().min(1, 'Requerido'), // Estado prevuelo
});

type PreFlightFormData = z.infer<typeof preFlightSchema>;

export const PreFlightFormScreen = ({ navigation, route }: any) => {
    const { type } = route.params || { type: 'Operativo' };
    const [pilots, setPilots] = useState<Pilot[]>([]);
    const [aircraft, setAircraft] = useState<Aircraft | null>(null);

    const { control, handleSubmit, setValue, watch } = useForm<PreFlightFormData>({
        resolver: zodResolver(preFlightSchema),
        defaultValues: {
            batteries: '',
            cameras: [],
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
                setPilots((pilotsRes as any[]).map(r => ({
                    id: r.id,
                    name: r.name,
                    cc: r.cc,
                    licenseNum: r.license_num,
                    licenseType: r.license_type,
                    licenseExpiry: r.license_expiry,
                })));

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
                        pilot: data.pilot,
                        missionLeader: data.missionLeader,
                        flightEngineer: data.flightEngineer,
                    }),
                    JSON.stringify({
                        batteries: data.batteries,
                        cameras: data.cameras || [],
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

    const cameraItems = aircraft ? aircraft.cameras.map(c => ({ label: c.code, value: c.id })) : [];

    const selectedCameras = watch('cameras') || [];
    const availableCameraItems = cameraItems.filter(ci => !selectedCameras.includes(String(ci.value)));

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Formulario de Prevuelo</Text>
                <Text style={styles.subtitle}>Vuelo {type}</Text>

                <Text style={styles.sectionTitle}>Información general</Text>
                <Controller
                    control={control}
                    name="date"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Fecha (DD/MM/AAAA)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="time"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Hora (HH:MM)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="purpose"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Propósito del vuelo" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="estimatedTime"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Tiempo estimado (min)" value={value} onChangeText={onChange} keyboardType="numeric" error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="coordinates"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Coordenadas" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="locationGeneral"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Ubicación general" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="aircraftState"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Estado de la aeronave (prevuelo)" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />

                <Text style={styles.sectionTitle}>Tripulación</Text>
                <Controller
                    control={control}
                    name="pilot"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Picker
                            label="Piloto (Requerido)"
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
                        <Input label="Líder de misión (opcional)" value={value || ''} onChangeText={onChange} />
                    )}
                />
                <Controller
                    control={control}
                    name="flightEngineer"
                    render={({ field: { onChange, value } }) => (
                        <Input label="Ingeniero de vuelo (opcional)" value={value || ''} onChangeText={onChange} />
                    )}
                />

                <Text style={styles.sectionTitle}>Equipos</Text>
                <Controller
                    control={control}
                    name="batteries"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Baterías (descripción)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />
                <Controller
                    control={control}
                    name="cameras"
                    render={({ field: { value } }) => (
                        <View>
                            <Text style={{ ...(typography.body as TextStyle), marginBottom: 8 }}>Cámaras seleccionadas: {value?.length || 0}</Text>
                            {availableCameraItems.length > 0 && (
                        <Picker
                                    label="Seleccionar cámara"
                                    items={availableCameraItems}
                                    value={undefined}
                                    onValueChange={(v) => setValue('cameras', [ ...(value || []), String(v) ])}
                                />
                            )}
                            {availableCameraItems.length === 0 && (
                                <Text style={{ ...(typography.caption as TextStyle) }}>No hay más cámaras disponibles para agregar.</Text>
                            )}
                            {value && value.length > 0 && value.map((cid: string) => (
                                <View key={cid} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical: 4 }}>
                                    <Text style={{ ...(typography.body as TextStyle) }}>{cameraItems.find(ci => String(ci.value) === cid)?.label || cid}</Text>
                                    <TouchableOpacity onPress={() => setValue('cameras', (value as string[]).filter(x => x !== cid))}>
                                        <Text style={{ color: colors.secondary }}>Eliminar</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {availableCameraItems.length > 0 && (
                                <Button title="Agregar cámara" onPress={() => { /* se agrega mediante el Picker arriba */ }} style={{ marginTop: 8 }} />
                            )}
                        </View>
                    )}
                />

                <Button title="Iniciar vuelo" onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.xl }} />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    title: { ...(typography.h2 as TextStyle), color: colors.primary },
    subtitle: { ...(typography.h3 as TextStyle), color: colors.textSecondary, marginBottom: spacing.l },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
});
