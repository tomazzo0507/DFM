import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';

const ownerSchema = z.object({
    name: z.string().min(1, 'Required'),
    idType: z.enum(['CC', 'NIT']),
    idNum: z.string().min(1, 'Required'),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

export const OwnerSetupScreen = ({ navigation }: any) => {
    const { control, handleSubmit, setValue, watch } = useForm<OwnerFormData>({
        resolver: zodResolver(ownerSchema),
        defaultValues: {
            name: '',
            idType: 'CC',
            idNum: '',
        },
    });

    const idType = watch('idType');

    const onSubmit = async (data: OwnerFormData) => {
        try {
            await db.runAsync(
                `INSERT INTO owners (name, id_type, id_num) VALUES (?, ?, ?)`,
                [data.name, data.idType, data.idNum]
            );
            Alert.alert('Success', 'Owner registered successfully', [
                { text: 'OK', onPress: () => navigation.navigate('PilotManagement') }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save owner');
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.content}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Owner Name" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <View style={styles.typeContainer}>
                    <Button
                        title="CC"
                        variant={idType === 'CC' ? 'primary' : 'outline'}
                        onPress={() => setValue('idType', 'CC')}
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                        title="NIT"
                        variant={idType === 'NIT' ? 'primary' : 'outline'}
                        onPress={() => setValue('idType', 'NIT')}
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>

                <Controller
                    control={control}
                    name="idNum"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="ID Number" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <Button title="Next: Pilots" onPress={handleSubmit(onSubmit)} style={{ marginTop: 24 }} />
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingTop: spacing.xl,
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: spacing.m,
    },
});
