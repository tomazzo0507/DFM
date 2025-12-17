import { create } from 'zustand';
import { Aircraft, Flight, Pilot } from '../types';

interface AppState {
    aircraft: Aircraft | null;
    setAircraft: (aircraft: Aircraft | null) => void;
    currentFlight: Flight | null;
    setCurrentFlight: (flight: Flight | null) => void;
    pilots: Pilot[];
    setPilots: (pilots: Pilot[]) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    aircraft: null,
    setAircraft: (aircraft) => set({ aircraft }),
    currentFlight: null,
    setCurrentFlight: (currentFlight) => set({ currentFlight }),
    pilots: [],
    setPilots: (pilots) => set({ pilots }),
    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),
}));
