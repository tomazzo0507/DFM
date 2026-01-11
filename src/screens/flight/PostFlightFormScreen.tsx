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
import * as FSLegacy from 'expo-file-system/legacy';
import { getLogoBase64, wrapReportHTML, sanitizeSignature } from '../../utils/report';
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
            { key: 'Piloto', label: 'Piloto', required: true },
        ];
        if (crew?.missionLeader) {
            base.push({ key: 'Líder de Misión', label: 'Líder de Misión', required: false });
        }
        if (crew?.flightEngineer) {
            base.push({ key: 'Ingeniero de Vuelo', label: 'Ingeniero de Vuelo', required: false });
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

    // CRITICAL FIX: Minimal HTML fallback for PDF generation
    const buildMinimalHTML = (data: PostFlightFormData, flightRow: any, aircraft: any, crew: any, safeSignatures: { [key: string]: string }) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const durSec = flightRow.duration || 0;
        const durMin = Math.floor(durSec / 60);
        const formatLocalTime = (iso?: string) => {
            if (!iso) return '';
            const d = new Date(iso);
            return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };
        
        return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
    h1 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #ddd; }
  </style>
</head>
<body>
  <h1>DRAGOM FLIGHT MANAGER - REPORTE DE VUELO</h1>
  <h2>Vuelo ID: ${flightRow.id || 'N/A'}</h2>
  <table>
    <tr><th>Fecha</th><td>${flightRow.date ? new Date(flightRow.date).toLocaleDateString() : 'N/A'}</td></tr>
    <tr><th>Tipo</th><td>${flightRow.type || 'N/A'}</td></tr>
    <tr><th>Duración</th><td>${durMin} minutos</td></tr>
    <tr><th>Hora despegue</th><td>${flightRow.start_time ? formatLocalTime(flightRow.start_time) : 'N/A'}</td></tr>
    <tr><th>Hora aterrizaje</th><td>${flightRow.end_time ? formatLocalTime(flightRow.end_time) : 'N/A'}</td></tr>
  </table>
  <h3>Estado Post-Vuelo</h3>
  <p>${data.status || 'N/A'}</p>
  ${data.notes ? `<h3>Notas</h3><p>${data.notes}</p>` : ''}
  <h3>Firmas</h3>
  <p>Piloto: ${safeSignatures['Piloto'] ? 'Firmado' : 'No firmado'}</p>
  ${crew?.missionLeader ? `<p>Líder de Misión: ${safeSignatures['Líder de Misión'] ? 'Firmado' : 'No firmado'}</p>` : ''}
  ${crew?.flightEngineer ? `<p>Ingeniero de Vuelo: ${safeSignatures['Ingeniero de Vuelo'] ? 'Firmado' : 'No firmado'}</p>` : ''}
</body>
</html>`;
    };

    const generatePDF = async (data: PostFlightFormData, flightRow: any) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'PostFlightFormScreen:generatePDF:entry',message:'enter generatePDF',data:{pdfName:data.pdfName,flightId,flightType:flightRow?.type},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        
        // CRITICAL FIX: Validate flightRow parameter
        if (!flightRow) {
            throw new Error('flightRow is null or undefined');
        }
        
        // CRITICAL FIX: Validate type before proceeding
        const type = flightRow.type;
        if (!type) {
            throw new Error('Flight type is required but missing in flightRow');
        }
        
        // Fetch aircraft and pilots
        const aircraftRow: any = await database.getFirstAsync('SELECT * FROM aircraft LIMIT 1');
        let aircraft = null;
        
        if (aircraftRow) {
            // CRITICAL FIX: Safe JSON parsing for aircraft data
            let motors: Array<{ id: string; code: string; hours: number }> = [];
            let batteriesMain: Array<{ id: string; code: string; cycles: number }> = [];
            let batteriesSpare: Array<{ id: string; code: string; cycles: number }> = [];
            
            try {
                motors = JSON.parse(aircraftRow.motors || '[]');
                if (!Array.isArray(motors)) motors = [];
            } catch (e) {
                console.error('Error parsing aircraft motors JSON:', e);
            }
            
            try {
                batteriesMain = JSON.parse(aircraftRow.batteries_main || '[]');
                if (!Array.isArray(batteriesMain)) batteriesMain = [];
            } catch (e) {
                console.error('Error parsing aircraft batteries_main JSON:', e);
            }
            
            try {
                batteriesSpare = JSON.parse(aircraftRow.batteries_spare || '[]');
                if (!Array.isArray(batteriesSpare)) batteriesSpare = [];
            } catch (e) {
                console.error('Error parsing aircraft batteries_spare JSON:', e);
            }
            
            aircraft = {
                partNum: aircraftRow.part_num || '',
                serialNum: aircraftRow.serial_num || '',
                totalHours: aircraftRow.total_hours || 0,
                motors,
                batteriesMain,
                batteriesSpare,
            };
        }

        // CRITICAL FIX: Safe JSON parsing with error handling
        let crew: any = {};
        let equipment: any = { batteries: '', cameras: [] };
        let prev: any = {};
        let carga: any = {};
        let fases: any[] = [];
        
        try {
            crew = flightRow.crew ? JSON.parse(flightRow.crew) : {};
        } catch (e) {
            console.error('Error parsing crew JSON:', e);
        }
        
        try {
            equipment = flightRow.equipment ? JSON.parse(flightRow.equipment) : { batteries: '', cameras: [] };
        } catch (e) {
            console.error('Error parsing equipment JSON:', e);
        }
        
        try {
            prev = flightRow.prevuelo ? JSON.parse(flightRow.prevuelo) : {};
        } catch (e) {
            console.error('Error parsing prevuelo JSON:', e);
        }
        
        try {
            carga = flightRow.carga ? JSON.parse(flightRow.carga) : {};
        } catch (e) {
            console.error('Error parsing carga JSON:', e);
        }
        
        try {
            fases = flightRow.fases ? JSON.parse(flightRow.fases) : [];
            if (!Array.isArray(fases)) fases = [];
        } catch (e) {
            console.error('Error parsing fases JSON:', e);
        }

        // CRITICAL FIX: Ensure crew is always a valid object for template access
        if (!crew || typeof crew !== 'object' || Array.isArray(crew)) {
            crew = {};
        }

        // Pilot names
        // CRITICAL FIX: Safe access to crew.pilot with type checking
        const pilotId = ('pilot' in crew) ? crew.pilot : null;
        const pilotIds: number[] = pilotId ? [pilotId].filter((id): id is number => typeof id === 'number' && id > 0) : [];
        const idToName = new Map<number, string>();
        for (const pid of pilotIds) {
            try {
                const row: any = await database.getFirstAsync('SELECT name FROM pilots WHERE id = ?', [pid]);
                if (row?.name) idToName.set(pid, row.name);
            } catch (e) {
                console.error(`Error fetching pilot name for ID ${pid}:`, e);
            }
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

        // Batteries (first two) — now free text: attempt to parse as codes, else empty
        const allBats = [...(aircraft?.batteriesMain || []), ...(aircraft?.batteriesSpare || [])];
        const batteryCodes: string[] = Array.isArray(equipment.batteries)
          ? equipment.batteries
          : (typeof equipment.batteries === 'string'
              ? equipment.batteries.split(/[,;]+|\s{2,}/).map((s: string) => s.trim()).filter(Boolean)
              : []);
        const usedBats = batteryCodes.slice(0, 2).map((code: string) => allBats.find(b => b.code === code));
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

        // CRITICAL FIX: Load logo asynchronously and non-blocking
        // If logo fails, PDF generation continues without it
        console.log('[PDF] Attempting to load logo...');
        let logo: string | null = null;
        try {
            logo = await Promise.race([
                getLogoBase64(),
                new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5s timeout
            ]);
            if (logo) {
                console.log('[PDF] Logo loaded successfully');
            } else {
                console.log('[PDF] Logo not available (timeout or failed)');
            }
        } catch (e) {
            console.warn('[PDF] Logo loading failed or timed out, continuing without logo:', e);
            logo = null;
        }
        
        // CRITICAL FIX: Sanitize all signatures before using in HTML
        console.log('[PDF] Sanitizing signatures...', { signatureKeys: Object.keys(signatures) });
        const safeSignatures: { [key: string]: string } = {};
        for (const [key, sig] of Object.entries(signatures)) {
            const sanitized = sanitizeSignature(sig as string);
            if (sanitized) {
                safeSignatures[key] = sanitized;
                console.log(`[PDF] Signature for ${key} is valid`);
            } else {
                console.warn(`[PDF] Invalid signature for ${key}, will show as text only`);
            }
        }
        console.log('[PDF] Sanitized signatures:', { safeKeys: Object.keys(safeSignatures) });

        // HTML Body with values filled
        const body = `
  <table>
    <tr>
      <td class="col1 img-cell">
        <img class="logo" src="/assets/ciac_logo.png" alt="Logo CIAC">
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
      <td><strong>Piloto</strong> <span id="pv_piloto">${idToName.get(crew?.pilot) || ''}</span></td>
      <td><strong>Líder de Misión</strong> <span id="pv_lider_mision">${crew?.missionLeader || ''}</span></td>
    </tr>
    <tr>
      <td><strong>Ing. de Vuelo</strong> <span id="pv_ing_vuelo">${crew?.flightEngineer || ''}</span></td>
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
        <img class="logo" src="/assets/ciac_logo.png" alt="Logo CIAC">
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
          <td class="firmas" id="firma_piloto">${safeSignatures['Piloto'] ? `<img src="${safeSignatures['Piloto']}" style="max-width:100%;max-height:100%"/>` : '<span style="color:#999;">Firma requerida</span>'}</td>
          <td class="firmas" id="firma_lider">${crew?.missionLeader && safeSignatures['Líder de Misión'] ? `<img src="${safeSignatures['Líder de Misión']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
          <td class="firmas" id="firma_ing_vuelo">${crew?.flightEngineer && safeSignatures['Ingeniero de Vuelo'] ? `<img src="${safeSignatures['Ingeniero de Vuelo']}" style="max-width:100%;max-height:100%"/>` : ''}</td>
          <td class="firmas"></td>
        </tr>
        <tr>
          <td><strong>Nombre:</strong> <span id="nombre_piloto">${idToName.get(crew?.pilot) || ''}</span></td>
          <td><strong>Nombre:</strong> <span id="nombre_lider">${crew?.missionLeader || ''}</span></td>
          <td><strong>Nombre:</strong> <span id="nombre_ing_vuelo">${crew?.flightEngineer || ''}</span></td>
          <td></td>
        </tr>
        <tr>
          <td><strong>Piloto</strong></td>
          <td><strong>Líder de Misión</strong></td>
          <td><strong>Ing. de Vuelo</strong></td>
          <td></td>
        </tr>
      </table>
    </td></tr>
  </table>
        `;

        const html = wrapReportHTML(body, logo);

        // CRITICAL FIX: Generate PDF with timeout and fallback
        let uri: string;
        try {
            console.log('[PDF] Attempting to generate PDF with full HTML...');
            // Try with full HTML first, with timeout
            const pdfPromise = Print.printToFileAsync({ html });
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('PDF generation timeout after 30s')), 30000)
            );
            
            const result = await Promise.race([pdfPromise, timeoutPromise]);
            
            if (!result || !result.uri) {
                throw new Error('printToFileAsync returned invalid result: missing uri');
            }
            uri = result.uri;
            console.log('[PDF] PDF generated successfully with full HTML:', uri);
        } catch (e) {
            // CRITICAL FIX: Fallback to minimal HTML if full HTML fails
            console.warn('[PDF] Full HTML PDF generation failed, trying minimal HTML:', e);
            
            try {
                console.log('[PDF] Attempting to generate PDF with minimal HTML...');
                const minimalHTML = buildMinimalHTML(data, flightRow, aircraft, crew, safeSignatures);
                const result = await Print.printToFileAsync({ html: minimalHTML });
                if (!result || !result.uri) {
                    throw new Error('Minimal HTML PDF generation also failed');
                }
                uri = result.uri;
                console.log('[PDF] PDF generated successfully with minimal HTML:', uri);
            } catch (fallbackError) {
                const errorMsg = e instanceof Error ? e.message : String(e);
                const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                console.error('[PDF] Both full and minimal HTML PDF generation failed:', { original: errorMsg, fallback: fallbackMsg });
                throw new Error(`Failed to generate PDF: ${errorMsg}. Fallback also failed: ${fallbackMsg}`);
            }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'PostFlightFormScreen:generatePDF:printed',message:'printToFileAsync returned',data:{tempUri:uri},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        // Normalize pdf name: underscores, 150 chars
        const normalized = data.pdfName.replace(/\s+/g, '_').slice(0, 150);

        // CRITICAL FIX: Validate type is defined before using it in path
        if (!type || typeof type !== 'string') {
            throw new Error(`Invalid flight type: ${type}. Cannot create PDF directory.`);
        }

        // Try new FS API first
        try {
            console.log('[PDF] Attempting to save PDF using new FS API...', { type, normalized });
            const dir = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Bitacora', type);
            try { await dir.create({ intermediates: true, idempotent: true }); } catch (e) {
                console.error('[PDF] Error creating directory:', e);
            }
            const destFile = new FileSystem.File(dir, `${normalized}.pdf`);
            console.log('[PDF] Destination file path:', destFile.uri);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'PostFlightFormScreen:generatePDF:newFS:beforeMove',message:'moving with new FS API',data:{destUri:destFile.uri},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            await new FileSystem.File(uri).move(destFile);
            console.log('[PDF] PDF moved successfully with new FS API:', destFile.uri);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'PostFlightFormScreen:generatePDF:newFS:afterMove',message:'moved with new FS API',data:{finalUri:destFile.uri},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return destFile.uri;
        } catch (e) {
            console.warn('[PDF] New FS API failed, falling back to legacy FS API:', e);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'PostFlightFormScreen:generatePDF:newFS:error',message:'new FS move failed',data:{error:String((e as any)?.message||(e as any))},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            // Fallback to legacy FS API
            const baseDir = (FSLegacy.documentDirectory || '') + `DFM/Bitacora/${type}`;
            console.log('[PDF] Attempting to save PDF using legacy FS API...', { baseDir, normalized });
            try { 
                await FSLegacy.makeDirectoryAsync(baseDir, { intermediates: true }); 
            } catch (dirError) {
                console.error('[PDF] Error creating legacy directory:', dirError);
                // Continue anyway - directory might already exist
            }
            const destPath = `${baseDir}/${normalized}.pdf`;
            console.log('[PDF] Legacy destination path:', destPath);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'PostFlightFormScreen:generatePDF:legacy:beforeMove',message:'moving with legacy FS API',data:{destPath},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            try {
                await FSLegacy.moveAsync({ from: uri, to: destPath });
                console.log('[PDF] PDF moved successfully with legacy FS API:', destPath);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'PostFlightFormScreen:generatePDF:legacy:afterMove',message:'moved with legacy FS API',data:{finalUri:destPath},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
                return destPath;
            } catch (legacyError) {
                // CRITICAL FIX: If both FS APIs fail, throw error instead of returning invalid path
                const errorMsg = legacyError instanceof Error ? legacyError.message : String(legacyError);
                console.error('[PDF] Both new and legacy FS APIs failed:', { newFSError: e, legacyError });
                throw new Error(`Failed to save PDF file: New FS API failed (${String(e)}), Legacy FS API also failed (${errorMsg})`);
            }
        }
    };

    const onSubmit = async (data: PostFlightFormData) => {
        // Validate signatures (required roles only)
        const missing = roles.filter(r => r.required && !signatures[r.key]).map(r => r.label);
        if (missing.length > 0) {
            Alert.alert('Error', `Missing required signatures: ${missing.join(', ')}`);
            return;
        }

        try {
            console.log('[PDF] Starting PDF generation process...');
            
            // Fetch full flight data for PDF
            const flightRes: any = await db.getFirstAsync('SELECT * FROM flights WHERE id = ?', [flightId]);
            
            // CRITICAL FIX: Validate flightRes before proceeding
            if (!flightRes) {
                Alert.alert('Error', `Flight with ID ${flightId} not found in database`);
                console.error(`[PDF] Flight not found: flightId=${flightId}`);
                return;
            }

            // CRITICAL FIX: Validate required flight data
            if (!flightRes.type) {
                Alert.alert('Error', 'Flight type is missing. Cannot generate PDF.');
                console.error('[PDF] Flight type missing:', flightRes);
                return;
            }

            console.log('[PDF] Calling generatePDF...', { flightId, type: flightRes.type, pdfName: data.pdfName });
            const pdfPath = await generatePDF(data, flightRes);
            console.log('[PDF] generatePDF returned:', pdfPath);
            
            // CRITICAL FIX: Validate pdfPath before saving to database
            if (!pdfPath || typeof pdfPath !== 'string' || pdfPath.trim().length === 0) {
                console.error('[PDF] Invalid pdfPath returned:', pdfPath);
                throw new Error('PDF generation returned invalid path');
            }
            
            console.log('[PDF] Saving pdfPath to database:', pdfPath);
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'PostFlightFormScreen:onSubmit:pdfPath',message:'pdf generated',data:{pdfPath},timestamp:Date.now()})}).catch(()=>{});
            // #endregion

            await db.runAsync(
                `UPDATE flights SET postvuelo = ?, signatures = ?, pdf_path = ? WHERE id = ?`,
                [
                    JSON.stringify({ status: data.status, notes: data.notes }),
                    JSON.stringify(signatures),
                    pdfPath,
                    flightId
                ]
            );
            
            console.log('[PDF] PDF path saved to database successfully');

            // Navigate to PostFlight Checklist
            navigation.navigate('Checklist', { type: (flightRes as any).type, stage: 'PostFlight' });
        } catch (error) {
            console.error('[PDF] Error in onSubmit:', error);
            console.error('[PDF] Error stack:', error instanceof Error ? error.stack : 'No stack');
            const errorMessage = error instanceof Error ? error.message : String(error);
            Alert.alert('Error', `Failed to save post-flight data: ${errorMessage}`);
        }
    };

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Reporte postvuelo</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>Duración: {Math.floor(duration / 60)}m {duration % 60}s</Text>
                </View>

                <Controller
                    control={control}
                    name="status"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Estado postvuelo" value={value} onChangeText={onChange} error={error?.message} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="notes"
                    render={({ field: { onChange, value } }) => (
                        <Input label="Notas" value={value} onChangeText={onChange} multiline numberOfLines={3} style={{ height: 80 }} />
                    )}
                />
                <Controller
                    control={control}
                    name="pdfName"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <Input label="Nombre del reporte (PDF)" value={value} onChangeText={onChange} error={error?.message} />
                    )}
                />

                <Text style={styles.sectionTitle}>Firmas</Text>
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
                            <Button title="Firmar" variant="outline" onPress={() => handleSign(key)} style={{ width: 100 }} />
                        )}
                    </View>
                ))}

                <Button title="Guardar y generar reporte" onPress={handleSubmit(onSubmit)} style={{ marginTop: spacing.xl }} />

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
