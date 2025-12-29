import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextStyle } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../theme';
import { CHECKLISTS } from '../../utils/checklists';
import { CheckSquare, Square } from 'lucide-react-native';
import { db } from '../../db';

export const ChecklistScreen = ({ navigation, route }: any) => {
    const { type, stage = 'Departure', flightId } = route.params || {}; // stage: Departure/Assembly/PreFlight/PostFlight
    const items = CHECKLISTS[stage as keyof typeof CHECKLISTS] || [];
    const [checked, setChecked] = useState<boolean[]>(new Array(items.length).fill(false));

    useEffect(() => {
        const autoCheckForPostFlight = async () => {
            if (stage !== 'PostFlight' || !flightId) return;
            try {
                const row: any = await db.getFirstAsync('SELECT pdf_path FROM flights WHERE id = ?', [flightId]);
                if (row && row.pdf_path) {
                    const initial = new Array(items.length).fill(false);
                    // Auto-check the "Reporte de vuelo correctamente guardado en Bitácora" if exists as last item
                    initial[items.length - 1] = true;
                    setChecked(initial);
                }
            } catch {}
        };
        autoCheckForPostFlight();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, flightId]);

    const toggleCheck = (index: number) => {
        const newChecked = [...checked];
        newChecked[index] = !newChecked[index];
        setChecked(newChecked);
    };

    const allChecked = checked.every(Boolean);

    const handleNext = () => {
        if (!allChecked) return;

        if (stage === 'Departure') {
            navigation.push('Checklist', { type, stage: 'Assembly' });
        } else if (stage === 'Assembly') {
            navigation.push('Checklist', { type, stage: 'PreFlight' });
        } else if (stage === 'PreFlight') {
            navigation.navigate('PreFlightForm', { type });
        } else if (stage === 'PostFlight') {
            navigation.navigate('Dashboard');
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={styles.title}>{stage} Checklist</Text>
                <Text style={styles.subtitle}>{type} Flight</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {items.map((item: string, index: number) => (
                    <TouchableOpacity key={index} style={styles.item} onPress={() => toggleCheck(index)}>
                        {checked[index] ? (
                            <CheckSquare color={colors.primary} size={24} />
                        ) : (
                            <Square color={colors.textSecondary} size={24} />
                        )}
                        <Text style={[styles.itemText, checked[index] && styles.itemTextChecked]}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Button
                title="Next"
                onPress={handleNext}
                disabled={!allChecked}
                style={styles.button}
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: spacing.l,
    },
    title: {
        ...(typography.h2 as TextStyle),
        color: colors.primary,
    },
    subtitle: {
        ...(typography.h3 as TextStyle),
        color: colors.textSecondary,
    },
    list: {
        paddingBottom: 80,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceHighlight,
    },
    itemText: {
        ...(typography.body as TextStyle),
        marginLeft: spacing.m,
        flex: 1,
    },
    itemTextChecked: {
        color: colors.textSecondary,
        textDecorationLine: 'line-through',
    },
    button: {
        marginTop: spacing.m,
    },
});
