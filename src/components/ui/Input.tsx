import React from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface InputProps extends TextInputProps {
    label: string;
    error?: string;
}

export const Input = ({ label, error, style, ...props }: InputProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, error && styles.inputError, style]}
                placeholderTextColor={colors.textSecondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.m,
    },
    label: {
        ...typography.body,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.m,
        color: colors.text,
        fontSize: 16,
    },
    inputError: {
        borderColor: colors.border,
    },
    errorText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
});
