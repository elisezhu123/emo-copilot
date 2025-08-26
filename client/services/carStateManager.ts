// Global car state management
type DriverStateType = 'anxious' | 'stressed' | 'neutral' | 'focused' | 'calm' | 'relaxed';

interface CarState {
  acTemperature: number;
  isAcOn: boolean;
  isHeatingOn: boolean;
  seatHeating: boolean;
  musicVolume: number;
  lightsOn: boolean;
  driverState: DriverStateType;
  manualOverride: boolean;
  manualOverrideStartTime: number | null;
}

class CarStateManager {
  private static instance: CarStateManager;
  private state: CarState;
  private listeners: Array<(state: CarState) => void> = [];

  constructor() {
    // Load state from localStorage or use defaults
    const savedState = localStorage.getItem('carState');
    this.state = savedState ? JSON.parse(savedState) : {
      acTemperature: 22,
      isAcOn: false,
      isHeatingOn: false,
      seatHeating: false,
      musicVolume: 50,
      lightsOn: false,
      driverState: 'neutral' as DriverStateType,
      manualOverride: false,
      manualOverrideStartTime: null
    };
  }

  static getInstance(): CarStateManager {
    if (!CarStateManager.instance) {
      CarStateManager.instance = new CarStateManager();
    }
    return CarStateManager.instance;
  }

  getState(): CarState {
    return { ...this.state };
  }

  updateState(updates: Partial<CarState>): void {
    this.state = { ...this.state, ...updates };
    
    // Save to localStorage
    localStorage.setItem('carState', JSON.stringify(this.state));
    
    // Notify listeners
    this.listeners.forEach(listener => listener(this.state));
    
    console.log('🚗 Car state updated:', this.state);
  }

  subscribe(listener: (state: CarState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Convenience methods
  setAirConditioner(temperature: number, isOn: boolean): void {
    this.updateState({ acTemperature: temperature, isAcOn: isOn });
  }

  setHeating(isOn: boolean): void {
    this.updateState({ isHeatingOn: isOn });
  }

  setSeatHeating(isOn: boolean): void {
    this.updateState({ seatHeating: isOn });
  }

  setLights(isOn: boolean): void {
    this.updateState({ lightsOn: isOn });
  }

  setVolume(volume: number): void {
    this.updateState({ musicVolume: Math.max(0, Math.min(100, volume)) });
  }

  setDriverState(driverState: DriverStateType, isManual: boolean = false): void {
    const updates: Partial<CarState> = { driverState };

    if (isManual) {
      updates.manualOverride = true;
      updates.manualOverrideStartTime = Date.now();
      console.log('🧠 Manual driver state set:', driverState, 'with 5-minute override');
    }

    this.updateState(updates);
  }

  checkManualOverrideExpiry(): boolean {
    if (!this.state.manualOverride || !this.state.manualOverrideStartTime) {
      return false;
    }

    const elapsed = Date.now() - this.state.manualOverrideStartTime;
    const fiveMinutes = 5 * 60 * 1000;

    if (elapsed >= fiveMinutes) {
      console.log('🧠 Manual override expired after 5 minutes, resuming automatic detection');
      this.updateState({
        manualOverride: false,
        manualOverrideStartTime: null
      });
      return true; // Override expired
    }

    return false; // Override still active
  }

  isManualOverrideActive(): boolean {
    if (!this.state.manualOverride) {
      return false;
    }

    // Check if override has expired
    this.checkManualOverrideExpiry();
    return this.state.manualOverride;
  }
}

export const carStateManager = CarStateManager.getInstance();
export type { CarState, DriverStateType };
