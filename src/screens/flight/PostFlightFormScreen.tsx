import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image, TouchableOpacity, TextStyle } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SignaturePad } from '../../components/ui/SignaturePad';
import { colors, spacing, typography } from '../../theme';
import { db } from '../../db';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { getLogoBase64, wrapReportHTML } from '../../utils/report';
import { db as database } from '../../db';

const postFlightSchema = z.object({
    status: z.string().trim().min(1, 'Required'),
    notes: z.string().transform((s) => s?.trim?.() ?? '').optional(),
    pdfName: z.string().trim().min(1, 'Required').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters'),
});

type PostFlightFormData = z.infer<typeof postFlightSchema>;

export const PostFlightFormScreen = ({ navigation, route }: any) => {
    const { flightId, duration } = route.params;
    const [signatures, setSignatures] = useState<{ [key: string]: string }>({});
    const [currentSigner, setCurrentSigner] = useState<string | null>(null);
    const [crew, setCrew] = useState<any | null>(null);

    const { control, handleSubmit, setValue } = useForm<PostFlightFormData>({
        resolver: zodResolver(postFlightSchema),
        defaultValues: {
            status: '',
            notes: '',
            pdfName: `Flight_${flightId}`,
        },
    });

    useEffect(() => {
        const loadCrew = async () => {
            try {
                const row: any = await db.getFirstAsync('SELECT crew FROM flights WHERE id = ?', [flightId]);
                if (row?.crew) {
                    setCrew(JSON.parse(row.crew));
                }
            } catch {}
        };
        loadCrew();
    }, [flightId]);

    const roles: Array<{ key: string; label: string; required: boolean }> = useMemo(() => {
        const base: Array<{ key: string; label: string; required: boolean }> = [
            { key: 'Internal Pilot', label: 'Internal Pilot', required: true },
            { key: 'External Pilot', label: 'External Pilot', required: true },
        ];
        if (crew?.missionLeader) {
            base.push({ key: 'Mission Leader', label: 'Mission Leader', required: true });
        }
        if (crew?.flightEngineer) {
            base.push({ key: 'Flight Engineer', label: 'Flight Engineer', required: true });
        }
        return base;
    }, [crew]);

    const handleSign = (role: string) => {
        setCurrentSigner(role);
    };

    const onSignatureSaved = (signature: string) => {
        if (currentSigner) {
            setSignatures(prev => ({ ...prev, [currentSigner]: signature }));
            setCurrentSigner(null);
        }
    };

    const generatePDF = async (data: PostFlightFormData, flightRow: any) => {
        // Fetch aircraft and pilots
        const aircraftRow: any = await database.getFirstAsync('SELECT * FROM aircraft LIMIT 1');
        const aircraft = aircraftRow
            ? {
                partNum: aircraftRow.part_num || '',
                serialNum: aircraftRow.serial_num || '',
                totalHours: aircraftRow.total_hours || 0,
                motors: JSON.parse(aircraftRow.motors || '[]') as Array<{ id: string; code: string; hours: number }>,
                batteriesMain: JSON.parse(aircraftRow.batteries_main || '[]') as Array<{ id: string; code: string; cycles: number }>,
                batteriesSpare: JSON.parse(aircraftRow.batteries_spare || '[]') as Array<{ id: string; code: string; cycles: number }>,
              }
            : null;

        const crew = flightRow.crew ? JSON.parse(flightRow.crew) : {};
        const equipment = flightRow.equipment ? JSON.parse(flightRow.equipment) : { batteries: [], camera: undefined };
        const prev = flightRow.prevuelo ? JSON.parse(flightRow.prevuelo) : {};
        const carga = flightRow.carga ? JSON.parse(flightRow.carga) : {};
        const fases = flightRow.fases ? JSON.parse(flightRow.fases) : [];
        const type = flightRow.type;

        // Pilot names
        const pilotIds: number[] = [crew.pilotInternal, crew.pilotExternal, crew.missionLeader, crew.flightEngineer].filter(Boolean);
        const idToName = new Map<number, string>();
        for (const pid of pilotIds) {
            const row: any = await database.getFirstAsync('SELECT name FROM pilots WHERE id = ?', [pid]);
            if (row?.name) idToName.set(pid, row.name);
        }

        // Helpers
        const pad = (n: number) => n.toString().padStart(2, '0');
        const secondsToHMS = (sec: number) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return `${pad(h)}:${pad(m)}:${pad(s)}`;
        };
        const minutesToHHMM = (minutes: number) => {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${pad(h)}:${pad(m)}`;
        };
        const formatLocalTime = (iso?: string) => {
            if (!iso) return '';
            const d = new Date(iso);
            return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        // Durations
        const durSec = flightRow.duration || 0;
        const durMin = Math.floor(durSec / 60);

        // Batteries (first two selected) map to codes/cycles (selection by code)
        const allBats = [...(aircraft?.batteriesMain || []), ...(aircraft?.batteriesSpare || [])];
        const usedBats = (equipment.batteries || []).slice(0, 2).map((code: string) => allBats.find(b => b.code === code));
        const b1 = usedBats[0];
        const b2 = usedBats[1];

        // Motors table values (time today = flight duration minutes; total = motor.hours)
        const motors = aircraft?.motors || [];

        // Carga info
        const cargaInfo = carga?.hasPayload ? `Con carga - ${carga?.weight || 0} kg` : 'Sin carga';
        const cargaLiberada = (carga?.hasPayload && carga?.released && typeof carga?.releaseElapsedSeconds === 'number')
            ? `Liberada en ${secondsToHMS(carga.releaseElapsedSeconds)} (hora local ${formatLocalTime(carga.releaseTime)})`
            : 'No aplica';

        // Fases (Ensayo)
        let fasesString = 'No aplica';
        if (type === 'Ensayo' && Array.isArray(fases) && fases.length > 0) {
            fasesString = fases.map((f: any) => {
                const start = f.startTime ? new Date(f.startTime) : null;
                const end = f.endTime ? new Date(f.endTime) : null;
                const startStr = start ? `${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}` : '??:??:??';
                const endStr = end ? `${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}` : '??:??:??';
                const dur = f.duration ? secondsToHMS(Math.floor(f.duration)) : '00:00:00';
                return `${f.name}: ${startStr} - ${endStr} (${dur})`;
            }).join('<br/>');
        }

        const logo = await getLogoBase64();

        // HTML Body with values filled
        const body = `
  <table>
    <tr>
      <td class="col1 img-cell">
        <img class="logo" src="/assets/ciac logo.png" alt="Logo CIAC">
      </td>
      <td class="col2 center">
        <strong>
          CORPORACIÓN DE LA INDUSTRIA AERONÁUTICA COLOMBIANA<br>
          DRAGOM FLIGHT MANAGER - REPORTE DE VUELO
        </strong>
      </td>
      <td class="col3 smallbox">
        <strong>Aeronave: UAV-Dragom</strong><br>
        <hr>
        <strong>P/N: </strong><span id="dfm_partnum">${aircraft?.partNum || ''}</span><br>
        <hr>
        <strong>S/N: </strong><span id="dfm_serialnum">${aircraft?.serialNum || ''}</span>
      </td>
    </tr>

    <tr><td colspan="3" class="gray">INFORMACIÓN GENERAL DEL VUELO</td></tr>
    <tr>
      <td><strong>Fecha (DD/MM/AAAA)</strong> <span id="pv_fecha">${prev?.fecha || ''}</span></td>
      <td><strong>Hora (HH:MM)</strong> <span id="pv_hora">${prev?.hora || ''}</span></td>
      <td><strong>Tiempo estimado (min)</strong> <span id="pv_tiempo_est">${prev?.tiempoEstimado || ''}</span></td>
    </tr>
    <tr>
      <td><strong>Coordenadas</strong> <span id="pv_coordenadas">${prev?.coordenadas || ''}</span></td>
      <td colspan="2"><strong>Ubicación general</strong> <span id="pv_ubicacion_general">${prev?.ubicacionGeneral || ''}</span></td>
    </tr>
    <tr>
      <td colspan="3"><strong>Propósito del vuelo</strong> <span id="pv_proposito">${prev?.proposito || ''}</span></td>
    </tr>

    <tr><td colspan="3" class="gray">TRIPULACIÓN</td></tr>
    <tr>
      <td><strong>Piloto Interno</strong> <span id="pv_piloto_interno">${idToName.get(crew.pilotInternal) || ''}</span></td>
      <td><strong>Piloto Externo</strong> <span id="pv_piloto_externo">${idToName.get(crew.pilotExternal) || ''}</span></td>
      <td><strong>Líder de Misión</strong> <span id="pv_lider_mision">${crew.missionLeader ? (idToName.get(crew.missionLeader) || '') : ''}</span></td>
    </tr>
    <tr>
      <td><strong>Ing. de Vuelo</strong> <span id="pv_ing_vuelo">${crew.flightEngineer ? (idToName.get(crew.flightEngineer) || '') : ''}</span></td>
      <td></td><td></td>
    </tr>

    <tr><td colspan="3" class="gray">ESTADO DE LA AERONAVE PREVIO AL VUELO</td></tr>
    <tr><td colspan="3"><strong>Descripción de la aeronave</strong><br><span id="pv_estado_aeronave">${prev?.estadoPrevuelo || ''}</span></td></tr>

    <tr><td colspan="3" class="gray">RESUMEN DE VUELO</td></tr>
    <tr>
      <td><strong>Hora despegue</strong> <span id="post_hora_despegue">${flightRow.start_time ? formatLocalTime(flightRow.start_time) : ''}</span></td>
      <td><strong>Hora aterrizaje</strong> <span id="post_hora_aterrizaje">${flightRow.end_time ? formatLocalTime(flightRow.end_time) : ''}</span></td>
      <td><strong>Tiempo de vuelo (min)</strong> <span id="post_tiempo_vuelo">${durMin}</span></td>
    </tr>

    <tr><td colspan="3" class="gray">DETALLES DE VUELO</td></tr>
    <tr><td colspan="3"><strong>Carga paga</strong><br><span id="vuelo_carga_info">${cargaInfo}</span></td></tr>
    <tr><td colspan="3"><strong>Carga liberada</strong><br><span id="vuelo_carga_liberada">${cargaLiberada}</span></td></tr>
    <tr><td colspan="3"><strong>Fases de vuelo (solo ensayo)</strong><br><span id="vuelo_fases">${fasesString}</span></td></tr>
  </table>

  <table>
    <tr>
      <td class="col1 img-cell">
        <img class="logo" src="/assets/ciac logo.png" alt="Logo CIAC">
      </td>
      <td class="col2 center">
        <strong>
          CORPORACIÓN DE LA INDUSTRIA AERONÁUTICA COLOMBIANA<br>
          DRAGOM FLIGHT MANAGER - REPORTE DE VUELO
        </strong>
      </td>
      <td class="col3 smallbox">
        <strong>Aeronave: UAV-Dragom</strong><br>
        <hr>
        <strong>P/N: </strong><span id="dfm_partnum_2">${aircraft?.partNum || ''}</span><br>
        <hr>
        <strong>S/N: </strong><span id="dfm_serialnum_2">${aircraft?.serialNum || ''}</span>
      </td>
    </tr>

    <tr><td colspan="3" class="gray">ESTADO DE LA AERONAVE POST VUELO</td></tr>
    <tr><td colspan="3"><span id="post_estado_aeronave">${data.status}</span></td></tr>

    <tr><td colspan="3" class="gray">NOTAS DE VUELO</td></tr>
    <tr><td colspan="3"><span id="post_notas_vuelo">${data.notes || ''}</span></td></tr>

    <tr><td colspan="3" class="gray">REGISTRO DE TIEMPOS Y CICLOS ACUMULADOS - AERONAVE Y EQUIPOS</td></tr>
    <tr class="row-compact"><td colspan="3" class="no-padding">
      <table class="minutes-7col">
        <tr>
          <th>A/C</th><th>BATERÍA 1</th><th>BATERÍA 2</th><th>MOTOR 1</th><th>MOTOR 2</th><th>MOTOR 3</th><th>MOTOR 4</th>
        </tr>
        <tr>
          <td>
            <table class="sub-table">
              <tr><td>S/N</td><td><span id="dfm_ac_sn">${aircraft?.serialNum || ''}</span></td></tr>
              <tr><td>TIEMPO HOY</td><td>TIEMPO TOTAL</td></tr>
              <tr><td><span id="dfm_ac_tiempo_hoy">${minutesToHHMM(durMin)}</span></td><td><span id="dfm_ac_tiempo_total">${minutesToHHMM(aircraft?.totalHours || 0)}</span></td></tr>
            </table>
          </td>

          <td>
            <table class="sub-table">
              <tr><td>CÓDIGO</td><td><span id="dfm_b1_codigo">${b1?.code || ''}</span></td></tr>
              <tr><td colspan="2">CICLOS TOTAL</td></tr>
              <tr><td colspan="2"><span id="dfm_b1_ciclos_total">${b1?.cycles ?? ''}</span></td></tr>
            </table>
          </td>

          <td>
            <table class="sub-table">
              <tr><td>CÓDIGO</td><td><span id="dfm_b2_codigo">${b2?.code || ''}</span></td></tr>
              <tr><td colspan="2">CICLOS TOTAL</td></tr>
              <tr><td colspan="2"><span id="dfm_b2_ciclos_total">${b2?.cycles ?? ''}</span></td></tr>
            </table>
          </td>

          ${[0,1,2,3].map(i => {
            const m = motors[i];
            const idx = i+1;
            const hoy = minutesToHHMM(durMin);
            const total = minutesToHHMM((m?.hours || 0));
            return `
            <td>
              <table class="sub-table">
                <tr><td>CÓDIGO</td><td><span id="dfm_m${idx}_codigo">${m?.code || ''}</span></td></tr>
                <tr><td>TIEMPO HOY</td><td>TIEMPO TOTAL</td></tr>
                <tr><td><span id="dfm_m${idx}_tiempo_hoy">${hoy}</span></td><td><span id="dfm_m${idx}_tiempo_total">${total}</span></td></tr>
              </table>
            </td>`;
          }).join('')}
        </tr>
      </table>
    </td></tr>

    <tr><td colspan="3" class="gray">ACEPTACIÓN TRIPULACIÓN DE VUELO</td></tr>
    <tr class="row-compact"><td colspan="3" class="no-padding">
      <table class="signatures-simple">
        <tr>
          <td class="firmas" id="firma_piloto_interno">${signatures['Internal Pilot'] ? `<img src="${signatures['Internal Pilot']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
          <td class="firmas" id="firma_piloto_externo">${signatures['External Pilot'] ? `<img src="${signatures['External Pilot']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
          <td class="firmas" id="firma_lider">${crew.missionLeader && signatures['Mission Leader'] ? `<img src="${signatures['Mission Leader']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
          <td class="firmas" id="firma_ing_vuelo">${crew.flightEngineer && signatures['Flight Engineer'] ? `<img src="${signatures['Flight Engineer']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
        </tr>
        <tr>
          <td><strong>Nombre:</strong> <span id="nombre_piloto_interno">${idToName.get(crew.pilotInternal) || ''}</span></td>
          <td><strong>Nombre:</strong> <span id="nombre_piloto_externo">${idToName.get(crew.pilotExternal) || ''}</span></td>
          <td><strong>Nombre:</strong> <span id="nombre_lider">${crew.missionLeader ? (idToName.get(crew.missionLeader) || '') : ''}</span></td>
          <td><strong>Nombre:</strong> <span id="nombre_ing_vuelo">${crew.flightEngineer ? (idToName.get(crew.flightEngineer) || '') : ''}</span></td>
        </tr>
        <tr>
          <td><strong>Piloto Interno</strong></td>
          <td><strong>Piloto Externo</strong></td>
          <td><strong>Líder de Misión</strong></td>
          <td><strong>Ing. de Vuelo</strong></td>
        </tr>
      </table>
    </td></tr>
  </table>
        `;

        const html = wrapReportHTML(body, logo);

        const { uri } = await Print.printToFileAsync({ html });

        // Normalize pdf name: underscores, 150 chars
        const normalized = data.pdfName.replace(/\s+/g, '_').slice(0, 150);
        const dirObj = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Bitacora', type);
        try { dirObj.create({ intermediates: true, idempotent: true }); } catch {}
        const destFile = new FileSystem.File(dirObj, `${normalized}.pdf`);
        const srcFile = new FileSystem.File(uri);
        srcFile.move(destFile);
        return destFile.uri;
    };

    const onSubmit = async (data: PostFlightFormData) => {
        // Validate signatures (required roles only)
        const missing = roles.filter(r => r.required && !signatures[r.key]).map(r => r.label);
        if (missing.length > 0) {
            Alert.alert('Error', `Missing required signatures: ${missing.join(', ')}`);
            return;
        }

        try {
            // Fetch full flight data for PDF
            const flightRes = await db.getFirstAsync('SELECT * FROM flights WHERE id = ?', [flightId]);

            const pdfPath = await generatePDF(data, flightRes);

            await db.runAsync(
                `UPDATE flights SET postvuelo = ?, signatures = ?, pdf_path = ? WHERE id = ?`,
                [
                    JSON.stringify({ status: data.status, notes: data.notes }),
                    JSON.stringify(signatures),
                    pdfPath,
                    flightId
                ]
            );

            // Navigate to PostFlight Checklist
            navigation.navigate('Checklist', { type: (flightRes as any).type, stage: 'PostFlight' });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save post-flight data');
        }
    };

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Post-Flight Report</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Duration: {Math.floor(duration / 60)}m {duration % 60}s</Text>
                </View>

                <Controller
                    control={control}
                    name="status"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Post-Flight Status" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value } }) => (
                        <Input label="Notes" value={value} onChangeText={onChange} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="pdfName"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Report Name (PDF)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <Text style={styles.sectionTitle}>Signatures</Text>
                {roles.map(({ key, label, required }) => (
                    <View key={key} style={styles.signatureRow}>
                        <Text style={styles.roleText}>
                            {label}{required ? ' *' : ''}
                        </Text>
                        {signatures[key] ? (
                            <TouchableOpacity onPress={() => handleSign(key)}>
                                <Image source={{ uri: signatures[key] }} style={styles.signatureImage} />
                            </TouchableOpacity>
                        ) : (
                            <Button title="Sign" variant="outline" onPress={() => handleSign(key)} style={{ width: 100 }} />
                        )}
                    </View>
                ))}

                <Button title="Save & Generate Report" onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.xl }} />

                <SignaturePad
                    visible={!!currentSigner}
                    title={`Signature: ${currentSigner}`}
                    onOK={onSignatureSaved}
                    onCancel={() => setCurrentSigner(null)}
                />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    title: {
        ...(typography.h2 as TextStyle),
        marginBottom: spacing.m,
    },
    infoCard: {
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    infoText: {
        ...(typography.h3 as TextStyle),
        textAlign: 'center',
    },
    sectionTitle: {
        ...(typography.h3 as TextStyle),
        marginTop: spacing.l,
        marginBottom: spacing.m,
    },
    signatureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceHighlight,
    },
    roleText: {
        ...(typography.body as TextStyle),
    },
    signatureImage: {
        width: 100,
        height: 50,
        resizeMode: 'contain',
        backgroundColor: 'white',
    },
});
