import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
}

export const Button = ({ title, variant = 'primary', loading, style, disabled, ...props }: ButtonProps) => {
    const getBackgroundColor = () => {
        if (disabled) return colors.surfaceHighlight;
        if (variant === 'primary') return colors.primary;
        if (variant === 'secondary') return colors.secondary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return colors.textSecondary;
        if (variant === 'outline') return colors.primary;
        return colors.background;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor(), borderColor: variant === 'outline' ? colors.primary : 'transparent' },
                style,
            ]}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        paddingHorizontal: spacing.l,
    },
    text: {
        ...typography.button,
    },
});
