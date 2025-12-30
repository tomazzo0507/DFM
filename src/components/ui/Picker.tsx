import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from './Button';

interface PickerItem {
    label: string;
    value: string | number;
}

interface PickerProps {
    label: string;
    items: PickerItem[];
    value?: string | number;
    onValueChange: (value: string | number) => void;
    placeholder?: string;
    error?: string;
}

export const Picker = ({ label, items, value, onValueChange, placeholder = 'Select...', error }: PickerProps) => {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedItem = items.find(i => i.value === value);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.input, error && styles.inputError]}
                onPress={() => setModalVisible(true)}
            >
                <Text style={[styles.text, !selectedItem && styles.placeholder]}>
                    {selectedItem ? selectedItem.label : placeholder}
                </Text>
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select {label}</Text>
                        <FlatList
                            data={items}
                            keyExtractor={(item) => String(item.value)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.itemText, item.value === value && styles.selectedItemText]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={{ marginTop: spacing.m }} />
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
    inputError: { borderColor: colors.border },
    text: { fontSize: 16, color: colors.text },
    placeholder: { color: colors.textSecondary },
    errorText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
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
    modalTitle: { ...(typography.h3 as TextStyle), marginBottom: spacing.m, textAlign: 'center' },
    item: { paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.surfaceHighlight },
    itemText: { ...(typography.body as TextStyle) },
    selectedItemText: { color: colors.primary, fontWeight: '600' as TextStyle['fontWeight'] },
});
