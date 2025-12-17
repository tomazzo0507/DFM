import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export const ScreenLayout = ({ children, style }: ScreenLayoutProps) => {
    return (
        <SafeAreaView style={[styles.container, style]}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
});
