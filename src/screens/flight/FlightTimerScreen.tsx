import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, BackHandler, Modal, TextStyle } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as FSLegacy from 'expo-file-system/legacy';

export const FlightTimerScreen = ({ navigation, route }: any) => {
    const { flightId, type } = route.params;
    const [status, setStatus] = useState<'Programado' | 'EnCurso' | 'Finalizado' | 'Abortado'>('Programado');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);

    // Payload State
    const [hasPayload, setHasPayload] = useState(false);
    const [payloadWeight, setPayloadWeight] = useState('');
    const [payloadReleased, setPayloadReleased] = useState(false);
    const [payloadReleaseTime, setPayloadReleaseTime] = useState<string | null>(null);
    const [payloadReleaseElapsed, setPayloadReleaseElapsed] = useState<number | null>(null);

    // Phases State (Test Flight)
    const [currentPhase, setCurrentPhase] = useState<string | null>(null);
    const [phases, setPhases] = useState<any[]>([]);
    const [abortVisible, setAbortVisible] = useState(false);
    const [abortReason, setAbortReason] = useState('');

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Attempt to resume from DB
        const resumeIfNeeded = async () => {
            try {
                const row: any = await db.getFirstAsync('SELECT * FROM flights WHERE id = ?', [flightId]);
                if (row) {
                    const carga = row.carga ? JSON.parse(row.carga) : null;
                    if (carga) {
                        setHasPayload(!!carga.hasPayload);
                        setPayloadWeight(carga.weight || '');
                        setPayloadReleased(!!carga.released);
                        setPayloadReleaseTime(carga.releaseTime || null);
                        setPayloadReleaseElapsed(typeof carga.releaseElapsedSeconds === 'number' ? carga.releaseElapsedSeconds : null);
                    }
                    const fases = row.fases ? JSON.parse(row.fases) : [];
                    setPhases(fases);
                    setStatus(row.status);
                    if (row.status === 'EnCurso' && row.start_time) {
                        const start = Date.parse(row.start_time);
                        if (!Number.isNaN(start)) {
                            setStartTime(start);
                            setElapsed(Date.now() - start);
                        }
                    }
                }
            } catch {}
        };
        resumeIfNeeded();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [flightId]);

    useEffect(() => {
        if (status === 'EnCurso' && startTime) {
            timerRef.current = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [status, startTime]);

    useEffect(() => {
        const onBackPress = () => {
            if (status === 'EnCurso') {
                Alert.alert('Flight in progress', 'You cannot leave while a flight is running.');
                return true;
            }
            return false;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [status]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStart = async () => {
        if (hasPayload && (!payloadWeight || isNaN(Number(payloadWeight)))) {
            Alert.alert('Error', 'Please enter valid payload weight');
            return;
        }

        const start = Date.now();
        setStartTime(start);
        setStatus('EnCurso');

        await db.runAsync(
            `UPDATE flights SET status = ?, start_time = ?, carga = ? WHERE id = ?`,
            [
                'EnCurso',
                new Date(start).toISOString(),
                JSON.stringify({ hasPayload, weight: payloadWeight, released: false }),
                flightId
            ]
        );
    };

    const generateAbortPDF = async (reason?: string) => {
        const date = new Date().toLocaleString();
        const html = `
        <html><body>
          <h1>DRAGOM FLIGHT MANAGER - REPORTE DE VUELO</h1>
          <h2>ESTADO DEL VUELO: ABORTADO${reason ? ' - ' + reason : ''}</h2>
          <p>Fecha: ${date}</p>
        </body></html>`;
        const { uri } = await Print.printToFileAsync({ html });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A1',location:'FlightTimerScreen:generateAbortPDF:printed',message:'printToFileAsync returned',data:{tempUri:uri},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        try {
            const dir = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Bitacora', 'Abortados');
            try { await dir.create({ intermediates: true, idempotent: true }); } catch {}
            const destFile = new FileSystem.File(dir, `Flight_${flightId}_ABORTADO.pdf`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A2',location:'FlightTimerScreen:generateAbortPDF:newFS:beforeMove',message:'moving with new FS API',data:{destUri:destFile.uri},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            await new FileSystem.File(uri).move(destFile);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A2',location:'FlightTimerScreen:generateAbortPDF:newFS:afterMove',message:'moved with new FS API',data:{finalUri:destFile.uri},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return destFile.uri;
        } catch {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A3',location:'FlightTimerScreen:generateAbortPDF:newFS:error',message:'new FS move failed; using legacy',data:{},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            const baseDir = (FSLegacy.documentDirectory || '') + 'DFM/Bitacora/Abortados';
            try { await FSLegacy.makeDirectoryAsync(baseDir, { intermediates: true }); } catch {}
            const destPath = `${baseDir}/Flight_${flightId}_ABORTADO.pdf`;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A4',location:'FlightTimerScreen:generateAbortPDF:legacy:beforeMove',message:'moving with legacy FS API',data:{destPath},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            await FSLegacy.moveAsync({ from: uri, to: destPath });
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A4',location:'FlightTimerScreen:generateAbortPDF:legacy:afterMove',message:'moved with legacy FS API',data:{finalUri:destPath},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return destPath;
        }
    };

    const handleStop = async () => {
        Alert.alert('Confirm', 'End flight?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End',
                onPress: async () => {
                    setStatus('Finalizado');
                    const endTime = Date.now();
                    const duration = Math.floor((endTime - (startTime || endTime)) / 1000); // seconds

                    await db.runAsync(
                        `UPDATE flights SET status = ?, end_time = ?, duration = ?, fases = ? WHERE id = ?`,
                        [
                            'Finalizado',
                            new Date(endTime).toISOString(),
                            duration,
                            JSON.stringify(phases),
                            flightId
                        ]
                    );

                    // Accumulate hours to aircraft and motors (minutes)
                    try {
                        const parseHHMMToMinutes = (value: any): number => {
                            if (typeof value === 'number' && !Number.isNaN(value)) return value;
                            if (typeof value === 'string') {
                                const m = value.match(/^(\d+):(\d{2})$/);
                                if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                            }
                            return 0;
                        };
                        const ac: any = await db.getFirstAsync('SELECT * FROM aircraft LIMIT 1');
                        if (ac) {
                            const minutes = Math.floor(duration / 60);
                            const total = (ac.total_hours || 0) + minutes;
                            const motors = JSON.parse(ac.motors || '[]');
                            const updatedMotors = motors.map((m: any) => ({
                                ...m,
                                hours: parseHHMMToMinutes(m.hours) + minutes,
                            }));
                            await db.runAsync(
                                `UPDATE aircraft SET total_hours = ?, motors = ? WHERE id = ?`,
                                [total, JSON.stringify(updatedMotors), ac.id]
                            );
                        }
                    } catch {}

                    navigation.navigate('PostFlightForm', { flightId, duration });
                }
            }
        ]);
    };

    const handleAbort = () => {
        setAbortVisible(true);
    };

    const handleReleasePayload = async () => {
        const time = new Date().toISOString();
        setPayloadReleased(true);
        setPayloadReleaseTime(time);
        const relElapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
        setPayloadReleaseElapsed(relElapsed);

        // Update DB
        await db.runAsync(
            `UPDATE flights SET carga = ? WHERE id = ?`,
            [
                JSON.stringify({ hasPayload, weight: payloadWeight, released: true, releaseTime: time, releaseElapsedSeconds: relElapsed }),
                flightId
            ]
        );
    };

    const handlePhase = (phaseName: string) => {
        const now = Date.now();
        const newPhases = [...phases];

        // Close previous phase
        if (newPhases.length > 0 && !newPhases[newPhases.length - 1].endTime) {
            newPhases[newPhases.length - 1].endTime = now;
            newPhases[newPhases.length - 1].duration = (now - newPhases[newPhases.length - 1].startTime) / 1000;
        }

        // Start new phase
        newPhases.push({
            name: phaseName,
            startTime: now,
        });

        setPhases(newPhases);
        setCurrentPhase(phaseName);
    };

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.timerContainer}>
                    <Text style={styles.timerLabel}>Duración del vuelo</Text>
                    <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                {status === 'Programado' && (
                    <View style={styles.setupContainer}>
                        <View style={styles.row}>
                            <Button
                                title="Con carga"
                                variant={hasPayload ? 'primary' : 'outline'}
                                onPress={() => setHasPayload(true)}
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button
                                title="Sin carga"
                                variant={!hasPayload ? 'primary' : 'outline'}
                                onPress={() => setHasPayload(false)}
                                style={{ flex: 1, marginLeft: 8 }}
                            />
                        </View>

                        {hasPayload && (
                            <Input
                                label="Peso de carga (kg)"
                                value={payloadWeight}
                                onChangeText={setPayloadWeight}
                                keyboardType="numeric"
                            />
                        )}

                        <Button title="INICIAR VUELO" onPress={handleStart} style={styles.startButton} />
                    </View>
                )}

                {status === 'EnCurso' && (
                    <View style={styles.controlsContainer}>
                        {hasPayload && (
                            <Button
                                title={payloadReleased ? "Carga liberada" : "Liberar carga"}
                                onPress={handleReleasePayload}
                                disabled={payloadReleased}
                                variant="secondary"
                                style={styles.actionButton}
                            />
                        )}

                        {type === 'Ensayo' && (
                            <View style={styles.phasesContainer}>
                                <Text style={styles.sectionTitle}>Fases de vuelo</Text>
                                <View style={styles.phaseGrid}>
                                    {['Ascenso', 'Descenso', 'Desplazamiento', 'Ascenso con desplazamiento', 'Descenso con desplazamiento', 'Estacionario'].map((p) => (
                                        <Button
                                            key={p}
                                            title={p}
                                            variant={currentPhase === p ? 'primary' : 'outline'}
                                            onPress={() => handlePhase(p)}
                                            style={styles.phaseButton}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        <Button title="FINALIZAR VUELO" onPress={handleStop} style={styles.stopButton} />
                    </View>
                )}

                <Button
                    title="Abortar vuelo"
                    variant="outline"
                    onPress={handleAbort}
                    style={styles.abortButton}
                />

                <Modal visible={abortVisible} transparent animationType="fade">
                    <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:16 }}>
                        <View style={{ backgroundColor:'white', borderRadius:12, padding:16 }}>
                            <Text style={{ ...(typography.h3 as TextStyle), marginBottom: spacing.s }}>Abortar vuelo</Text>
                            <Input
                                label="Motivo (opcional)"
                                value={abortReason}
                                onChangeText={setAbortReason}
                                multiline
                                numberOfLines={3}
                                style={{ height:80 }}
                            />
                            <View style={{ flexDirection:'row', marginTop: spacing.m }}>
                                <Button title="Cancelar" variant="outline" onPress={() => setAbortVisible(false)} style={{ flex:1, marginRight:8 }} />
                                <Button
                                    title="Confirmar"
                                    onPress={async () => {
                                        setAbortVisible(false);
                                        setStatus('Abortado');
                                        try {
                                            const date = new Date().toLocaleString();
                                            const html = `
                                                <html><body>
                                                  <h1>DRAGOM FLIGHT MANAGER - REPORTE DE VUELO</h1>
                                                  <h2>ESTADO DEL VUELO: ABORTADO${abortReason ? ' - ' + abortReason : ''}</h2>
                                                  <p>Fecha: ${date}</p>
                                                </body></html>`;
                                        const { uri } = await Print.printToFileAsync({ html });
                                            // #region agent log
                                            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A5',location:'FlightTimerScreen:abortConfirm:printed',message:'printToFileAsync returned',data:{tempUri:uri},timestamp:Date.now()})}).catch(()=>{});
                                            // #endregion
                                            let newPath: string;
                                            try {
                                                const dir = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Bitacora', type);
                                                try { await dir.create({ intermediates: true, idempotent: true }); } catch {}
                                                const destFile = new FileSystem.File(dir, `Flight_${flightId}_ABORTADO.pdf`);
                                                // #region agent log
                                                fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A6',location:'FlightTimerScreen:abortConfirm:newFS:beforeMove',message:'moving with new FS API',data:{destUri:destFile.uri},timestamp:Date.now()})}).catch(()=>{});
                                                // #endregion
                                                await new FileSystem.File(uri).move(destFile);
                                                newPath = destFile.uri;
                                            } catch {
                                                const baseDir = (FSLegacy.documentDirectory || '') + `DFM/Bitacora/${type}`;
                                                try { await FSLegacy.makeDirectoryAsync(baseDir, { intermediates: true }); } catch {}
                                                newPath = `${baseDir}/Flight_${flightId}_ABORTADO.pdf`;
                                                // #region agent log
                                                fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A7',location:'FlightTimerScreen:abortConfirm:legacy:beforeMove',message:'moving with legacy FS API',data:{destPath:newPath},timestamp:Date.now()})}).catch(()=>{});
                                                // #endregion
                                                await FSLegacy.moveAsync({ from: uri, to: newPath });
                                            }
                                            // #region agent log
                                            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A8',location:'FlightTimerScreen:abortConfirm:dbUpdate',message:'updating DB with pdf path',data:{newPath},timestamp:Date.now()})}).catch(()=>{});
                                            // #endregion
                                            await db.runAsync(
                                                `UPDATE flights SET status = ?, pdf_path = ? WHERE id = ?`,
                                                ['Abortado', newPath, flightId]
                                            );
                                        } catch {}
                                        navigation.navigate('Checklist', { type, stage: 'PostFlight', flightId });
                                    }}
                                    style={{ flex:1, marginLeft:8 }}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    timerContainer: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    timerLabel: {
        ...(typography.caption as TextStyle),
        marginBottom: spacing.xs,
    },
    timerValue: {
        ...(typography.h1 as TextStyle),
        fontSize: 48,
        fontVariant: ['tabular-nums'],
    },
    statusText: {
        ...(typography.body as TextStyle),
        color: colors.primary,
        marginTop: spacing.s,
    },
    setupContainer: {
        marginTop: spacing.m,
    },
    row: {
        flexDirection: 'row',
        marginBottom: spacing.m,
    },
    startButton: {
        marginTop: spacing.l,
        backgroundColor: colors.primary,
    },
    controlsContainer: {
        marginTop: spacing.m,
    },
    actionButton: {
        marginBottom: spacing.m,
    },
    phasesContainer: {
        marginBottom: spacing.l,
    },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
        marginBottom: spacing.m,
    },
    phaseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.s,
    },
    phaseButton: {
        width: '48%',
    },
    stopButton: {
        marginTop: spacing.l,
        backgroundColor: colors.secondary,
    },
    abortButton: {
        marginTop: spacing.xl,
        borderColor: colors.secondary,
    },
});
