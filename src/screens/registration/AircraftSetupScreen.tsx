import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextStyle } from 'react-native';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';

// Schema
const motorSchema = z.object({
    code: z.string().min(1, 'Requerido'),
    hours: z.string().regex(/^\d+:\d{2}$/, 'Formato HH:MM').or(z.literal('00:00')),
});

const batterySchema = z.object({
    code: z.string().min(1, 'Requerido'),
    cycles: z.string().transform((val) => parseInt(val, 10) || 0),
});

const cameraSchema = z.object({
    code: z.string().min(1, 'Requerido'),
    description: z.string().optional(),
});

const aircraftSchema = z.object({
    name: z.string().trim().min(1, 'Requerido'),
    code: z.string().trim().min(1, 'Requerido'),
    partNum: z.string().trim().min(1, 'Requerido'),
    serialNum: z.string().trim().min(1, 'Requerido'),
    numMotors: z.string().transform((val) => parseInt(val, 10) || 0),
    motors: z.array(motorSchema),
    batteriesMain: z.array(batterySchema),
    batteriesSpare: z.array(batterySchema),
    cameras: z.array(cameraSchema),
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

export const AircraftSetupScreen = ({ navigation }: any) => {
    const [step, setStep] = useState(1);

    const parseHHMMToMinutes = (value: string) => {
        const m = value?.match?.(/^(\d+):(\d{2})$/);
        if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        return 0;
    };

    const { control, handleSubmit, watch, setValue, getValues } = useForm<AircraftFormData>({
        resolver: zodResolver(aircraftSchema) as any,
        defaultValues: {
            name: '',
            code: '',
            partNum: '',
            serialNum: '',
            numMotors: 0,
            motors: [],
            batteriesMain: [],
            batteriesSpare: [],
            cameras: [],
        },
    });

    const { fields: motorFields, append: appendMotor, replace: replaceMotors } = useFieldArray({
        control,
        name: 'motors',
    });

    const { fields: batMainFields, append: appendBatMain, remove: removeBatMain } = useFieldArray({
        control,
        name: 'batteriesMain',
    });

    const { fields: batSpareFields, append: appendBatSpare, remove: removeBatSpare } = useFieldArray({
        control,
        name: 'batteriesSpare',
    });

    const { fields: cameraFields, append: appendCamera, remove: removeCamera } = useFieldArray({
        control,
        name: 'cameras',
    });

    const numMotors = watch('numMotors');

    // Effect to sync motors array with numMotors input
    React.useEffect(() => {
        const currentCount = motorFields.length;
        const targetCount = numMotors || 0;

        if (targetCount > currentCount) {
            for (let i = currentCount; i < targetCount; i++) {
                appendMotor({ code: '', hours: '00:00' });
            }
        } else if (targetCount < currentCount) {
            // We don't remove automatically to avoid accidental data loss, 
            // or we could slice. For now let's just slice to match requirement "Para cada motor"
            // actually, replace might be better if we want to reset, but let's just keep existing ones
            // and remove extra if user reduces number.
            const newMotors = getValues('motors').slice(0, targetCount);
            replaceMotors(newMotors);
        }
    }, [numMotors]);

    const onSubmit = async (data: AircraftFormData) => {
        try {
            const motorsToSave = (data.motors || []).map(m => ({
                ...m,
                hours: parseHHMMToMinutes(m.hours),
            }));
            const existing: any = await db.getFirstAsync('SELECT id FROM aircraft LIMIT 1');
            if (existing?.id) {
                await db.runAsync(
                    `UPDATE aircraft SET name = ?, code = ?, part_num = ?, serial_num = ?, motors = ?, batteries_main = ?, batteries_spare = ?, cameras = ? WHERE id = ?`,
                    [
                        data.name,
                        data.code,
                        data.partNum,
                        data.serialNum,
                        JSON.stringify(motorsToSave),
                        JSON.stringify(data.batteriesMain),
                        JSON.stringify(data.batteriesSpare),
                        JSON.stringify(data.cameras),
                        existing.id,
                    ]
                );
            } else {
                await db.runAsync(
                    `INSERT INTO aircraft (name, code, part_num, serial_num, motors, batteries_main, batteries_spare, cameras) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.name,
                        data.code,
                        data.partNum,
                        data.serialNum,
                        JSON.stringify(motorsToSave),
                        JSON.stringify(data.batteriesMain),
                        JSON.stringify(data.batteriesSpare),
                        JSON.stringify(data.cameras),
                    ]
                );
            }
            Alert.alert('Success', 'Aircraft registered successfully', [
                { text: 'OK', onPress: () => navigation.navigate('OwnerSetup') }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save aircraft');
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: spacing.m }}>
                <Text style={styles.title}>Configuración de aeronave - Paso {step}/3</Text>

                {step === 1 && (
                    <View>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Nombre de la aeronave" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="code"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Código de registro" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="partNum"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Número de parte (P/N)" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="serialNum"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Número de serie (S/N)" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="numMotors"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input
                                    label="Número de motores"
                                    value={value?.toString()}
                                    onChangeText={onChange}
                                    keyboardType="numeric"
                                    error={error?.message}
                                />
                            )}
                        />

                        <Text style={styles.sectionTitle}>Motores</Text>
                        {motorFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Text style={styles.cardTitle}>Motor {index + 1}</Text>
                                <Controller
                                    control={control}
                                    name={`motors.${index}.code`}
                                    render={({ field: { onChange, value } }) => (
                                        <Input label="Código de motor" value={value} onChangeText={onChange} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`motors.${index}.hours`}
                                    render={({ field: { onChange, value } }) => (
                                        <Input label="Horas iniciales (HH:MM)" value={value} onChangeText={onChange} placeholder="00:00" />
                                    )}
                                />
                            </View>
                        ))}
                        <Button title="Siguiente: Baterías" onPress={nextStep} style={{ marginTop: 20 }} />
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Baterías principales</Text>
                        {batMainFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Código de batería"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesMain.${index}.code`, text)}
                                />
                                <Input
                                    label="Ciclos"
                                    keyboardType="numeric"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesMain.${index}.cycles`, text)}
                                />
                                <Button title="Eliminar" variant="outline" onPress={() => removeBatMain(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Agregar batería principal" variant="secondary" onPress={() => appendBatMain({ code: '', cycles: 0 })} />

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Baterías de repuesto</Text>
                        {batSpareFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Código de batería"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesSpare.${index}.code`, text)}
                                />
                                <Input
                                    label="Ciclos"
                                    keyboardType="numeric"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesSpare.${index}.cycles`, text)}
                                />
                                <Button title="Eliminar" variant="outline" onPress={() => removeBatSpare(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Agregar batería de repuesto" variant="secondary" onPress={() => appendBatSpare({ code: '', cycles: 0 })} />

                        <View style={styles.row}>
                            <Button title="Atrás" variant="outline" onPress={prevStep} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Siguiente: Cámaras" onPress={nextStep} style={{ flex: 1, marginLeft: 8 }} />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.sectionTitle}>Cámaras</Text>
                        {cameraFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Código de cámara"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`cameras.${index}.code`, text)}
                                />
                                <Input
                                    label="Descripción"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`cameras.${index}.description`, text)}
                                />
                                <Button title="Eliminar" variant="outline" onPress={() => removeCamera(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Agregar cámara" variant="secondary" onPress={() => appendCamera({ code: '', description: '' })} />

                        <View style={styles.row}>
                            <Button title="Atrás" variant="outline" onPress={prevStep} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Finalizar configuración" onPress={handleSubmit(onSubmit as any)} style={{ flex: 1, marginLeft: 8 }} />
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    title: {
        ...(typography.h2 as TextStyle),
        marginBottom: spacing.l,
    },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
        marginBottom: spacing.m,
        marginTop: spacing.m,
    },
    card: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    cardTitle: {
        ...(typography.body as TextStyle),
        fontWeight: '600' as TextStyle['fontWeight'],
        marginBottom: spacing.s,
    },
    row: {
        flexDirection: 'row',
        marginTop: spacing.xl,
    },
});
