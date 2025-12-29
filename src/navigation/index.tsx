import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AircraftSetupScreen, OwnerSetupScreen, PilotManagementScreen } from '../screens/registration';
import { HomeScreen } from '../screens/dashboard/HomeScreen';
import { ChecklistScreen, PreFlightFormScreen, FlightTimerScreen, PostFlightFormScreen } from '../screens/flight';
import { LogbookScreen, FlightBookScreen, OperationalLogbookScreen, TestLogbookScreen } from '../screens/reports';
import { db } from '../db';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

export type RootStackParamList = {
    AircraftSetup: undefined;
    OwnerSetup: undefined;
    PilotManagement: undefined;
    Dashboard: undefined;
    FlightFlow: undefined; // This might become a nested navigator later
    Checklist: undefined;
    PreFlightForm: undefined;
    FlightTimer: undefined;
    PostFlightForm: undefined;
    Reports: undefined; // Nested navigator or simple screen
    Logbook: undefined;
    FlightBook: undefined;
    OperationalLogbook: undefined;
    TestLogbook: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    const [initialRouteName, setInitialRouteName] = useState<keyof RootStackParamList | null>(null);

    useEffect(() => {
        const decideInitialRoute = async () => {
            try {
                const aircraft = await db.getFirstAsync('SELECT id FROM aircraft LIMIT 1');
                setInitialRouteName(aircraft ? 'Dashboard' : 'AircraftSetup');
            } catch {
                setInitialRouteName('AircraftSetup');
            }
        };
        decideInitialRoute();
    }, []);

    useEffect(() => {
        const autoAbortIfNeeded = async () => {
            try {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'boot',hypothesisId:'H1',location:'src/navigation/index.tsx:autoAbortIfNeeded',message:'Checking for stale in-progress flights',data:{},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
                const inProgress = await db.getAllAsync('SELECT id, type FROM flights WHERE status = ?', ['EnCurso']);
                if (Array.isArray(inProgress) && inProgress.length > 0) {
                    for (const f of inProgress as any[]) {
                        const html = `<html><body><h1>DRAGOM FLIGHT MANAGER - REPORTE DE VUELO</h1><h2>ESTADO DEL VUELO: ABORTADO POR FALLO</h2><p>Fecha: ${new Date().toLocaleString()}</p></body></html>`;
                        const { uri } = await Print.printToFileAsync({ html });
                        const dirObj = new FileSystem.Directory(FileSystem.Paths.document, 'DFM', 'Bitacora', f.type || 'Operativo');
                        try { dirObj.create({ intermediates: true, idempotent: true }); } catch {}
                        const fileName = `Flight_${f.id}_ABORTADO_FALLO.pdf`;
                        const destFile = new FileSystem.File(dirObj, fileName);
                        const srcFile = new FileSystem.File(uri);
                        srcFile.move(destFile);
                        const newPath = destFile.uri;
                        await db.runAsync(`UPDATE flights SET status = ?, pdf_path = ? WHERE id = ?`, ['Abortado', newPath, f.id]);
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/45b3dca9-a99d-4431-9c9a-0889feaa197e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'boot',hypothesisId:'H1',location:'src/navigation/index.tsx:autoAbortIfNeeded',message:'Auto-aborted stale flight',data:{flightId:f.id, path:newPath},timestamp:Date.now()})}).catch(()=>{});
                        // #endregion
                    }
                }
            } catch {}
        };
        autoAbortIfNeeded();
    }, []);

    return (
        <NavigationContainer>
            {initialRouteName && (
                <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
                    {/* Registration Flow */}
                    <Stack.Screen name="AircraftSetup" component={AircraftSetupScreen} />
                    <Stack.Screen name="OwnerSetup" component={OwnerSetupScreen} />
                    <Stack.Screen name="PilotManagement" component={PilotManagementScreen} />

                    {/* Dashboard */}
                    <Stack.Screen name="Dashboard" component={HomeScreen} />

                    {/* Flight Flow */}
                    <Stack.Screen name="Checklist" component={ChecklistScreen} />
                    <Stack.Screen name="PreFlightForm" component={PreFlightFormScreen} />
                    <Stack.Screen name="FlightTimer" component={FlightTimerScreen} />
                    <Stack.Screen name="PostFlightForm" component={PostFlightFormScreen} />

                    {/* Reports */}
                    <Stack.Screen name="Logbook" component={LogbookScreen} />
                    <Stack.Screen name="FlightBook" component={FlightBookScreen} />
                    <Stack.Screen name="OperationalLogbook" component={OperationalLogbookScreen} />
                    <Stack.Screen name="TestLogbook" component={TestLogbookScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
};
