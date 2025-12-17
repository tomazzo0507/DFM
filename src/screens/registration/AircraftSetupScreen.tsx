import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
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
    code: z.string().min(1, 'Required'),
    hours: z.string().regex(/^\d+:\d{2}$/, 'Format HH:MM').or(z.literal('00:00')),
});

const batterySchema = z.object({
    code: z.string().min(1, 'Required'),
    cycles: z.string().transform((val) => parseInt(val, 10) || 0),
});

const cameraSchema = z.object({
    code: z.string().min(1, 'Required'),
    description: z.string().optional(),
});

const aircraftSchema = z.object({
    name: z.string().min(1, 'Required'),
    code: z.string().min(1, 'Required'),
    numMotors: z.string().transform((val) => parseInt(val, 10) || 0),
    motors: z.array(motorSchema),
    batteriesMain: z.array(batterySchema),
    batteriesSpare: z.array(batterySchema),
    cameras: z.array(cameraSchema),
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

export const AircraftSetupScreen = ({ navigation }: any) => {
    const [step, setStep] = useState(1);

    const { control, handleSubmit, watch, setValue, getValues } = useForm<AircraftFormData>({
        resolver: zodResolver(aircraftSchema),
        defaultValues: {
            name: '',
            code: '',
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
            // Save to SQLite
            await db.runAsync(
                `INSERT INTO aircraft (name, code, motors, batteries_main, batteries_spare, cameras) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    data.name,
                    data.code,
                    JSON.stringify(data.motors),
                    JSON.stringify(data.batteriesMain),
                    JSON.stringify(data.batteriesSpare),
                    JSON.stringify(data.cameras),
                ]
            );
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
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.title}>Aircraft Setup - Step {step}/3</Text>

                {step === 1 && (
                    <View>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Aircraft Name" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="code"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input label="Registration Code" value={value} onChangeText={onChange} error={error?.message} />
                            )}
                        />
                        <Controller
                            control={control}
                            name="numMotors"
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <Input
                                    label="Number of Motors"
                                    value={value?.toString()}
                                    onChangeText={onChange}
                                    keyboardType="numeric"
                                    error={error?.message}
                                />
                            )}
                        />

                        <Text style={styles.sectionTitle}>Motors</Text>
                        {motorFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Text style={styles.cardTitle}>Motor {index + 1}</Text>
                                <Controller
                                    control={control}
                                    name={`motors.${index}.code`}
                                    render={({ field: { onChange, value } }) => (
                                        <Input label="Motor Code" value={value} onChangeText={onChange} />
                                    )}
                                />
                                <Controller
                                    control={control}
                                    name={`motors.${index}.hours`}
                                    render={({ field: { onChange, value } }) => (
                                        <Input label="Initial Hours (HH:MM)" value={value} onChangeText={onChange} placeholder="00:00" />
                                    )}
                                />
                            </View>
                        ))}
                        <Button title="Next: Batteries" onPress={nextStep} style={{ marginTop: 20 }} />
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.sectionTitle}>Main Batteries</Text>
                        {batMainFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Battery Code"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesMain.${index}.code`, text)}
                                />
                                <Input
                                    label="Cycles"
                                    keyboardType="numeric"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesMain.${index}.cycles`, text)}
                                />
                                <Button title="Remove" variant="outline" onPress={() => removeBatMain(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Add Main Battery" variant="secondary" onPress={() => appendBatMain({ code: '', cycles: 0 })} />

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Spare Batteries</Text>
                        {batSpareFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Battery Code"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesSpare.${index}.code`, text)}
                                />
                                <Input
                                    label="Cycles"
                                    keyboardType="numeric"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`batteriesSpare.${index}.cycles`, text)}
                                />
                                <Button title="Remove" variant="outline" onPress={() => removeBatSpare(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Add Spare Battery" variant="secondary" onPress={() => appendBatSpare({ code: '', cycles: 0 })} />

                        <View style={styles.row}>
                            <Button title="Back" variant="outline" onPress={prevStep} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Next: Cameras" onPress={nextStep} style={{ flex: 1, marginLeft: 8 }} />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.sectionTitle}>Cameras</Text>
                        {cameraFields.map((field, index) => (
                            <View key={field.id} style={styles.card}>
                                <Input
                                    label="Camera Code"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`cameras.${index}.code`, text)}
                                />
                                <Input
                                    label="Description"
                                    // @ts-ignore
                                    onChangeText={(text) => setValue(`cameras.${index}.description`, text)}
                                />
                                <Button title="Remove" variant="outline" onPress={() => removeCamera(index)} style={{ marginTop: 8 }} />
                            </View>
                        ))}
                        <Button title="Add Camera" variant="secondary" onPress={() => appendCamera({ code: '', description: '' })} />

                        <View style={styles.row}>
                            <Button title="Back" variant="outline" onPress={prevStep} style={{ flex: 1, marginRight: 8 }} />
                            <Button title="Finish Setup" onPress={handleSubmit(onSubmit)} style={{ flex: 1, marginLeft: 8 }} />
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    title: {
        ...typography.h2,
        marginBottom: spacing.l,
    },
    sectionTitle: {
        ...typography.h3,
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
        ...typography.body,
        fontWeight: '600',
        marginBottom: spacing.s,
    },
    row: {
        flexDirection: 'row',
        marginTop: spacing.xl,
    },
});
