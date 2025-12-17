export interface Motor {
    id: string;
    code: string;
    hours: number; // in minutes? or float hours? Requirement says HH:MM. Storing as minutes is easier for math.
}

export interface Battery {
    id: string;
    code: string;
    cycles: number;
}

export interface Camera {
    id: string;
    code: string;
    description: string;
}

export interface Aircraft {
    id: number;
    name: string;
    code: string;
    motors: Motor[];
    batteriesMain: Battery[];
    batteriesSpare: Battery[];
    cameras: Camera[];
    totalHours: number; // minutes
}

export interface Owner {
    id: number;
    name: string;
    idType: 'CC' | 'NIT';
    idNum: string;
}

export interface Pilot {
    id: number;
    name: string;
    cc: string;
    licenseNum: string;
    licenseType: string;
    licenseExpiry: string; // ISO date string
}

export type FlightType = 'Operativo' | 'Ensayo';
export type FlightStatus = 'Programado' | 'EnCurso' | 'Finalizado' | 'Abortado';

export interface FlightCrew {
    pilotInternal: number; // Pilot ID
    pilotExternal: number; // Pilot ID
    missionLeader?: number; // Pilot ID
    flightEngineer?: number; // Pilot ID
}

export interface FlightEquipment {
    batteries: string[]; // Battery IDs
    camera?: string; // Camera ID
}

export interface Flight {
    id: number;
    type: FlightType;
    status: FlightStatus;
    date: string;
    startTime?: string;
    endTime?: string;
    duration: number; // seconds or minutes? Cronometer usually seconds.
    crew: FlightCrew;
    equipment: FlightEquipment;
    prevuelo?: any; // Define form structure later
    postvuelo?: any;
    cronometro?: any;
    carga?: any;
    fases?: any;
    signatures?: any;
    pdfPath?: string;
}
