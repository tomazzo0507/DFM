import React, { useRef } from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Button } from './Button';
import { colors, spacing, typography } from '../../theme';

interface SignaturePadProps {
    visible: boolean;
    onOK: (signature: string) => void;
    onCancel: () => void;
    title?: string;
}

export const SignaturePad = ({ visible, onOK, onCancel, title = 'Firmar aquí' }: SignaturePadProps) => {
    const ref = useRef<any>(null);

    const handleOK = (signature: string) => {
        onOK(signature);
    };

    const handleClear = () => {
        ref.current?.clearSignature();
    };

    const handleConfirm = () => {
        ref.current?.readSignature();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.canvasContainer}>
                        <SignatureCanvas
                            ref={ref}
                            onOK={handleOK}
                            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}/>
                    </View>
                    <View style={styles.buttons}>
                        <Button title="Cancelar" variant="outline" onPress={onCancel} style={{ flex: 1, marginRight: 8 }} />
                        <Button title="Limpiar" variant="secondary" onPress={handleClear} style={{ flex: 1, marginHorizontal: 8 }} />
                        <Button title="Guardar" onPress={handleConfirm} style={{ flex: 1, marginLeft: 8 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.m,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.m,
        width: '100%',
        maxWidth: 600,
    },
    title: {
        ...(typography.h3 as any),
        marginBottom: spacing.m,
        textAlign: 'center',
    },
    canvasContainer: {
        height: 260,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        marginBottom: spacing.m,
        alignSelf: 'stretch',
    },
    buttons: {
        flexDirection: 'row',
    },
});
