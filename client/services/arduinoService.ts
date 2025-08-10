interface HeartRateData {
  values: number[];
  timestamp: number;
}

interface HRVData {
  value: number;
  timestamp: number;
}

class ArduinoService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private heartRateValues: number[] = [];
  private currentHRV: number = 173; // Start at neutral 173, will change to different states over time
  private maxValues = 8;
  private subscribers: ((data: HeartRateData) => void)[] = [];
  private hrvSubscribers: ((data: HRVData) => void)[] = [];
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  constructor() {
    // Check if Web Serial API is supported
    if (!('serial' in navigator)) {
      console.warn('⚠�� Web Serial API not supported in this browser');
    }
  }

  async connect(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        console.log('💡 Web Serial API not supported - using mock data for heart rate monitoring');
        this.startMockData();
        return false;
      }

      // Request a port (this requires user interaction)
      this.port = await (navigator as any).serial.requestPort();

      // Open the port
      await this.port.open({
        baudRate: 115200, // Match Arduino's Serial.begin(115200)
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Arduino connected successfully');

      // Start reading data
      this.startReading();

      return true;
    } catch (error: any) {
      this.connectionAttempts++;

      // Handle specific error cases gracefully
      if (error.name === 'NotFoundError' || error.message.includes('No port selected')) {
        console.log('💡 No Arduino device selected - using mock data for heart rate monitoring');
      } else if (error.name === 'NotAllowedError') {
        console.log('💡 Arduino access denied - using mock data for heart rate monitoring');
      } else {
        console.log('💡 Arduino connection failed - using mock data for heart rate monitoring');
      }

      // Don't retry automatically in web environment - just use mock data
      if (!this.isConnected && this.connectionAttempts === 1) {
        this.startMockData();
      }

      return false;
    }
  }

  private async startReading() {
    if (!this.port || !this.isConnected) return;

    try {
      this.reader = this.port.readable!.getReader();
      let buffer = '';

      while (true) {
        const { value, done } = await this.reader.read();
        
        if (done) {
          console.log('📡 Arduino serial reading completed');
          break;
        }

        // Convert Uint8Array to string
        const text = new TextDecoder().decode(value);
        buffer += text;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          this.processLine(line.trim());
        }
      }
    } catch (error) {
      console.error('❌ Error reading from Arduino:', error);
      this.handleDisconnection();
    }
  }

  private processLine(line: string) {
    try {
      // Check if it's comma-separated data from CheezPPG library
      if (line.includes(',')) {
        // Format: rawPPG,avgPPG,filterPPG,ppgPeak,heartRate,hrv
        const values = line.split(',').map(val => val.trim());
        
        if (values.length >= 6) {
          const heartRate = parseInt(values[4]); // Heart rate is 5th value (index 4)
          const hrv = parseInt(values[5]);       // HRV is 6th value (index 5)
          
          // Process heart rate if valid
          if (!isNaN(heartRate) && heartRate > 30 && heartRate < 200) {
            this.addHeartRateValue(heartRate);
            console.log(`💓 Heart Rate: ${heartRate} BPM`);
          }
          
          // Process HRV if valid
          if (!isNaN(hrv) && hrv > 0 && hrv < 1000) {
            this.updateHRV(hrv);
            console.log(`📊 HRV: ${hrv} ms`);
          }
        }
      }
      // Look for different types of data (backward compatibility)
      else if (line.includes('HR:')) {
        // Heart rate data: HR:75
        const hrMatch = line.match(/HR:(\d+)/);
        if (hrMatch) {
          const heartRate = parseInt(hrMatch[1]);
          if (!isNaN(heartRate) && heartRate > 30 && heartRate < 200) {
            this.addHeartRateValue(heartRate);
            console.log(`💓 Heart Rate: ${heartRate} BPM`);
          }
        }
      } else if (line.includes('HRV:')) {
        // HRV data: HRV:150
        const hrvMatch = line.match(/HRV:(\d+)/);
        if (hrvMatch) {
          const hrv = parseInt(hrvMatch[1]);
          if (!isNaN(hrv) && hrv > 0 && hrv < 1000) {
            this.updateHRV(hrv);
            console.log(`📊 HRV: ${hrv} ms`);
          }
        }
      } else {
        // Try to parse as plain heart rate value (backward compatibility)
        const heartRate = parseInt(line);
        if (!isNaN(heartRate) && heartRate > 30 && heartRate < 200) {
          this.addHeartRateValue(heartRate);
          console.log(`💓 Heart Rate: ${heartRate} BPM`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse Arduino data:', line);
    }
  }

  private addHeartRateValue(value: number) {
    // Add new value
    this.heartRateValues.push(value);

    // Keep only the last 8 values
    if (this.heartRateValues.length > this.maxValues) {
      this.heartRateValues = this.heartRateValues.slice(-this.maxValues);
    }

    // Notify subscribers
    const data: HeartRateData = {
      values: [...this.heartRateValues],
      timestamp: Date.now()
    };

    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in Arduino subscriber callback:', error);
      }
    });
  }

  private updateHRV(value: number) {
    this.currentHRV = value;

    // Notify HRV subscribers
    const data: HRVData = {
      value: value,
      timestamp: Date.now()
    };

    this.hrvSubscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in Arduino HRV subscriber callback:', error);
      }
    });
  }

  subscribe(callback: (data: HeartRateData) => void): () => void {
    this.subscribers.push(callback);

    // Send current data immediately if available
    if (this.heartRateValues.length > 0) {
      callback({
        values: [...this.heartRateValues],
        timestamp: Date.now()
      });
    }

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  subscribeHRV(callback: (data: HRVData) => void): () => void {
    this.hrvSubscribers.push(callback);

    // Send current HRV immediately
    callback({
      value: this.currentHRV,
      timestamp: Date.now()
    });

    // Return unsubscribe function
    return () => {
      this.hrvSubscribers = this.hrvSubscribers.filter(cb => cb !== callback);
    };
  }

  getHeartRateValues(): number[] {
    return [...this.heartRateValues];
  }

  getCurrentHeartRate(): number | null {
    return this.heartRateValues.length > 0 ?
      this.heartRateValues[this.heartRateValues.length - 1] : null;
  }

  getCurrentHRV(): number {
    return this.currentHRV;
  }


  isConnectedToArduino(): boolean {
    return this.isConnected;
  }

  private handleDisconnection() {
    this.isConnected = false;
    this.reader = null;
    this.writer = null;
    console.warn('⚠️ Arduino disconnected');
    
    // Try to reconnect after 5 seconds
    setTimeout(() => {
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log('🔄 Attempting to reconnect to Arduino...');
        this.connect();
      }
    }, 5000);
  }

  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.isConnected = false;
      console.log('✅ Arduino disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from Arduino:', error);
    }
  }

  // Mock data for testing when Arduino is not connected - realistic driving patterns
  private startMockData() {
    if (this.isConnected) return; // Don't mock if real connection exists

    console.log('🧪 Starting mock Arduino data with realistic driving patterns');

    // More realistic driving heart rates (slightly elevated from rest)
    const mockValues = [78, 82, 85, 88, 91, 76, 84, 89, 86, 80, 87, 83];
    let index = 0;
    let heartRateBaseline = 80; // Typical driving baseline
    let trafficStressLevel = 0; // 0-3 (normal, light traffic, heavy traffic, road rage)
    let focusLevel = 1; // 0-2 (distracted, normal, focused)
    let fatigueLevel = 0; // 0-3 (alert, slight fatigue, tired, very tired)

    // HRV state management for driving scenarios
    let currentHRVState = 'neutral'; // neutral, stressed, focused, calm, relaxed, anxious
    let stateStartTime = Date.now();
    let stateChangeInterval = 2 + Math.random() * 4; // 2-6 minutes (shorter for driving scenarios)
    let currentBaseHRV = 155; // Start at driving baseline (lower than resting)
    let trendDirection = 'stable'; // stable, improving, declining
    let drivingScenario = 'highway'; // highway, city, traffic, parking

    // Define HRV ranges for each driving state (lower overall due to driving stress)
    const drivingHRVStates = {
      anxious: { base: 45, variation: 10 },     // 35-55 (road rage, emergency situations)
      stressed: { base: 65, variation: 10 },    // 55-75 (heavy traffic, aggressive drivers)
      neutral: { base: 155, variation: 15 },    // 140-170 (normal driving)
      focused: { base: 130, variation: 15 },    // 115-145 (attentive driving, navigation)
      calm: { base: 175, variation: 20 },       // 155-195 (easy highway driving)
      relaxed: { base: 190, variation: 15 }     // 175-205 (cruise control, scenic drive)
    };

    setInterval(() => {
      if (!this.isConnected) { // Only send mock data if not connected
        // Simulate driving scenarios affecting heart rate
        let baseValue = mockValues[index % mockValues.length];

        // Adjust based on driving conditions
        if (drivingScenario === 'traffic') {
          baseValue += 8 + trafficStressLevel * 3; // Traffic increases HR
        } else if (drivingScenario === 'parking') {
          baseValue += 5 + Math.random() * 8; // Parking stress
        } else if (drivingScenario === 'highway') {
          baseValue += 2; // Slight elevation from highway driving
        } else if (drivingScenario === 'city') {
          baseValue += 4 + Math.random() * 6; // City driving variability
        }

        // Add fatigue effect (increases HR but decreases variability)
        baseValue += fatigueLevel * 3;

        // Add some driving-realistic randomness
        const randomValue = baseValue + Math.floor(Math.random() * 8 - 4);
        this.addHeartRateValue(Math.max(65, Math.min(120, randomValue)));
        index++;
      }
    }, 1800); // New value every 1.8 seconds (more frequent for driving)

    // Mock HRV data with realistic state changes
    setInterval(() => {
      if (!this.isConnected) {
        const currentTime = Date.now();
        const timeInState = (currentTime - stateStartTime) / (1000 * 60); // minutes

        // Check if it's time to change state (2-6 minutes for driving scenarios)
        if (timeInState >= stateChangeInterval) {
          const previousState = currentHRVState;
          const previousScenario = drivingScenario;

          // Change driving scenario occasionally
          const scenarioChange = Math.random();
          if (scenarioChange < 0.2) {
            const scenarios = ['highway', 'city', 'traffic', 'parking'];
            drivingScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

            // Update stress factors based on scenario
            if (drivingScenario === 'traffic') {
              trafficStressLevel = 1 + Math.floor(Math.random() * 3);
            } else if (drivingScenario === 'parking') {
              trafficStressLevel = 2;
            } else {
              trafficStressLevel = 0;
            }

            console.log(`🚗 Driving scenario: ${previousScenario} → ${drivingScenario} (stress: ${trafficStressLevel})`);
          }

          // Determine emotional state based on driving conditions
          if (drivingScenario === 'traffic' && trafficStressLevel >= 2) {
            // Heavy traffic tends toward stress/anxiety
            const trafficChoice = Math.random();
            if (trafficChoice < 0.4) {
              currentHRVState = 'stressed';
              trendDirection = 'declining';
            } else if (trafficChoice < 0.7) {
              currentHRVState = 'anxious';
              trendDirection = 'declining';
            } else {
              currentHRVState = 'focused'; // Some drivers stay focused in traffic
              trendDirection = 'stable';
            }
          } else if (drivingScenario === 'highway') {
            // Highway driving tends toward calm/relaxed
            const highwayChoice = Math.random();
            if (highwayChoice < 0.5) {
              currentHRVState = 'calm';
              trendDirection = 'improving';
            } else if (highwayChoice < 0.7) {
              currentHRVState = 'relaxed';
              trendDirection = 'improving';
            } else {
              currentHRVState = 'neutral';
              trendDirection = 'stable';
            }
          } else if (drivingScenario === 'city') {
            // City driving is more variable
            const cityChoice = Math.random();
            if (cityChoice < 0.3) {
              currentHRVState = 'focused';
              trendDirection = 'stable';
            } else if (cityChoice < 0.5) {
              currentHRVState = 'stressed';
              trendDirection = 'declining';
            } else if (cityChoice < 0.8) {
              currentHRVState = 'neutral';
              trendDirection = 'stable';
            } else {
              currentHRVState = 'calm';
              trendDirection = 'improving';
            }
          } else if (drivingScenario === 'parking') {
            // Parking can be stressful
            const parkingChoice = Math.random();
            if (parkingChoice < 0.6) {
              currentHRVState = 'stressed';
              trendDirection = 'declining';
            } else {
              currentHRVState = 'focused';
              trendDirection = 'stable';
            }
          } else {
            // General state transitions based on current state
            if (currentHRVState === 'stressed' || currentHRVState === 'anxious') {
              const improvementChance = Math.random();
              if (improvementChance < 0.6) {
                currentHRVState = 'neutral';
                trendDirection = 'improving';
              } else {
                currentHRVState = 'focused';
                trendDirection = 'improving';
              }
            } else if (currentHRVState === 'neutral') {
              const neutralChoice = Math.random();
              if (neutralChoice < 0.4) {
                currentHRVState = 'focused';
                trendDirection = 'stable';
              } else if (neutralChoice < 0.7) {
                currentHRVState = 'calm';
                trendDirection = 'improving';
              } else {
                currentHRVState = 'stressed';
                trendDirection = 'declining';
              }
            } else {
              // From positive states, mostly return to neutral or stay positive
              const positiveChoice = Math.random();
              if (positiveChoice < 0.7) {
                currentHRVState = 'neutral';
                trendDirection = 'stable';
              } else {
                currentHRVState = 'focused';
                trendDirection = 'stable';
              }
            }
          }

          // Reset timing for next state change
          stateStartTime = currentTime;
          stateChangeInterval = 1.5 + Math.random() * 3; // 1.5-4.5 minutes (more dynamic for driving)

          console.log(`🧠 Driver State: ${previousState} → ${currentHRVState} (${drivingScenario}, trend: ${trendDirection})`);
          console.log(`⏱️ Next state change in ${stateChangeInterval.toFixed(1)} minutes`);
        }

        // Generate HRV value based on current driving state
        const stateConfig = drivingHRVStates[currentHRVState];
        const baseHRV = stateConfig.base;
        const variation = stateConfig.variation;

        // Add driving-specific variations
        let hrvModifier = 0;
        if (drivingScenario === 'traffic') {
          hrvModifier = -10 - (trafficStressLevel * 8); // Traffic reduces HRV
        } else if (drivingScenario === 'highway') {
          hrvModifier = +5; // Highway slightly improves HRV
        } else if (drivingScenario === 'parking') {
          hrvModifier = -15; // Parking stress reduces HRV
        }

        // Add fatigue effect (reduces HRV)
        hrvModifier -= fatigueLevel * 8;

        // Add some variation within the state range
        const randomVariation = Math.floor(Math.random() * (variation * 2 + 1)) - variation;
        const newHRV = Math.max(25, Math.min(250, baseHRV + hrvModifier + randomVariation));

        this.updateHRV(newHRV);

        // Log current state info every 20 seconds
        if (Math.floor(timeInState * 3) % 60 === 0) { // Every 20 seconds
          console.log(`📊 HRV: ${newHRV} | State: ${currentHRVState} | Scenario: ${drivingScenario} | Stress: ${trafficStressLevel} | Time: ${timeInState.toFixed(1)}min`);
        }
      }
    }, 2500); // Check every 2.5 seconds for more dynamic driving updates
  }

  // Start mock data for development/testing
  enableMockData() {
    this.startMockData();
  }
}

// Create singleton instance
export const arduinoService = new ArduinoService();
export type { HeartRateData, HRVData };
