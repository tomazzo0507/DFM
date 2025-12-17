import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';
import { CheckSquare, Square } from 'lucide-react-native';

interface PickerItem {
    label: string;
    value: string | number;
}

interface MultiPickerProps {
    label: string;
    items: PickerItem[];
    values: (string | number)[];
    onValuesChange: (values: (string | number)[]) => void;
    placeholder?: string;
    error?: string;
}

export const MultiPicker = ({ label, items, values = [], onValuesChange, placeholder = 'Select...', error }: MultiPickerProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const toggleValue = (val: string | number) => {
        if (values.includes(val)) {
            onValuesChange(values.filter(v => v !== val));
        } else {
            onValuesChange([...values, val]);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.input, error && styles.inputError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[styles.text, values.length === 0 && styles.placeholder]}>
                    {values.length > 0 ? `${values.length} selected` : placeholder}
                </Text>
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <p style={styles.modalTitle}> Select {label}</p>
                        <FlatList
                            data={items}
                            keyExtractor={(item) => String(item.value)}
                            renderItem={({ item }) => {
                                const isSelected = values.includes(item.value);
                                return (
                                    <TouchableOpacity
                                        style={styles.item}
                                        onPress={() => toggleValue(item.value)}
                                    >
                                        {isSelected ? <CheckSquare color={colors.primary} size={20} /> : <Square color={colors.textSecondary} size={20} />}
                                        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <Button title="Done" onPress={() => setModalVisible(false)} style={{ marginTop: spacing.m }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: spacing.m },
    label: { ...typography.body, marginBottom: spacing.xs, color: colors.textSecondary },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.m,
    },
    inputError: { borderColor: colors.error },
    text: { fontSize: 16, color: colors.text },
    placeholder: { color: colors.textSecondary },
    errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
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
        maxHeight: '80%',
    },
    modalTitle: { ...typography.h3, marginBottom: spacing.m, textAlign: 'center' },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.surfaceHighlight },
    itemText: { ...typography.body, marginLeft: spacing.s },
    selectedItemText: { color: colors.primary, fontWeight: '600' },
});
