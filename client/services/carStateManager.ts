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
      driverState: 'neutral' as DriverStateType
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

  setDriverState(driverState: DriverStateType): void {
    this.updateState({ driverState });
  }
}

export const carStateManager = CarStateManager.getInstance();
export type { CarState, DriverStateType };
