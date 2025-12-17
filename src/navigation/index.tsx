import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AircraftSetupScreen, OwnerSetupScreen, PilotManagementScreen } from '../screens/registration';
import { HomeScreen } from '../screens/dashboard/HomeScreen';
import { ChecklistScreen, PreFlightFormScreen, FlightTimerScreen, PostFlightFormScreen } from '../screens/flight';
import { LogbookScreen, FlightBookScreen } from '../screens/reports';
import { db } from '../db';

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
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
};
