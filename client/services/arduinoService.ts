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
        throw new Error('Web Serial API not supported');
      }

      // Request a port
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
    } catch (error) {
      this.connectionAttempts++;
      console.error('❌ Failed to connect to Arduino:', error);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Retrying connection (${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
        // Retry after 2 seconds
        setTimeout(() => this.connect(), 2000);
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

  // Mock data for testing when Arduino is not connected - realistic HRV patterns
  private startMockData() {
    if (this.isConnected) return; // Don't mock if real connection exists

    console.log('🧪 Starting mock Arduino data with realistic HRV patterns');

    const mockValues = [72, 78, 75, 95, 85, 70, 82, 76];
    let index = 0;

    // HRV state management
    let currentHRVState = 'neutral'; // neutral, stressed, focused, calm, relaxed, anxious
    let stateStartTime = Date.now();
    let stateChangeInterval = 5 + Math.random() * 5; // 5-10 minutes in minutes
    let currentBaseHRV = 173; // Start at neutral 173
    let trendDirection = 'stable'; // stable, improving, declining

    // Define HRV ranges for each state
    const hrvStates = {
      anxious: { base: 75, variation: 15 },    // 60-90
      stressed: { base: 85, variation: 5 },     // 80-90
      neutral: { base: 173, variation: 7 },     // 166-180
      focused: { base: 140, variation: 20 },    // 120-160
      calm: { base: 200, variation: 20 },       // 180-220
      relaxed: { base: 235, variation: 15 }     // 220-250
    };

    setInterval(() => {
      if (!this.isConnected) { // Only send mock data if not connected
        // Add some randomness to mock values
        const baseValue = mockValues[index % mockValues.length];
        const randomValue = baseValue + Math.floor(Math.random() * 10 - 5);
        this.addHeartRateValue(Math.max(60, Math.min(100, randomValue)));
        index++;
      }
    }, 2000); // New value every 2 seconds

    // Mock HRV data with realistic state changes
    setInterval(() => {
      if (!this.isConnected) {
        const currentTime = Date.now();
        const timeInState = (currentTime - stateStartTime) / (1000 * 60); // minutes

        // Check if it's time to change state (5-10 minutes)
        if (timeInState >= stateChangeInterval) {
          const previousState = currentHRVState;

          // Determine trend based on current state
          if (currentHRVState === 'stressed' || currentHRVState === 'anxious') {
            // From stress/anxiety, trend toward improvement
            const improvementChance = Math.random();
            if (improvementChance < 0.4) {
              currentHRVState = 'neutral';
              trendDirection = 'improving';
            } else if (improvementChance < 0.7) {
              currentHRVState = 'calm';
              trendDirection = 'improving';
            } else {
              currentHRVState = 'relaxed';
              trendDirection = 'improving';
            }
          } else if (currentHRVState === 'neutral') {
            // From neutral, can go anywhere
            const stateOptions = ['stressed', 'focused', 'calm', 'anxious'];
            const randomChoice = Math.random();

            if (randomChoice < 0.3) {
              currentHRVState = 'stressed';
              trendDirection = 'declining';
            } else if (randomChoice < 0.5) {
              currentHRVState = 'focused';
              trendDirection = 'stable';
            } else if (randomChoice < 0.7) {
              currentHRVState = 'calm';
              trendDirection = 'improving';
            } else if (randomChoice < 0.85) {
              currentHRVState = 'anxious';
              trendDirection = 'declining';
            } else {
              currentHRVState = 'relaxed';
              trendDirection = 'improving';
            }
          } else if (currentHRVState === 'focused') {
            // From focused, usually return to neutral or improve
            const focusedChoice = Math.random();
            if (focusedChoice < 0.5) {
              currentHRVState = 'neutral';
              trendDirection = 'stable';
            } else if (focusedChoice < 0.8) {
              currentHRVState = 'calm';
              trendDirection = 'improving';
            } else {
              currentHRVState = 'stressed'; // Focus can lead to stress
              trendDirection = 'declining';
            }
          } else if (currentHRVState === 'calm' || currentHRVState === 'relaxed') {
            // From calm/relaxed, usually return to neutral or stay positive
            const calmChoice = Math.random();
            if (calmChoice < 0.6) {
              currentHRVState = 'neutral';
              trendDirection = 'stable';
            } else if (calmChoice < 0.8) {
              currentHRVState = 'focused';
              trendDirection = 'stable';
            } else {
              // Small chance of stress even from calm state
              currentHRVState = 'stressed';
              trendDirection = 'declining';
            }
          }

          // Reset timing for next state change
          stateStartTime = currentTime;
          stateChangeInterval = 5 + Math.random() * 5; // 5-10 minutes

          console.log(`🧠 HRV State Change: ${previousState} → ${currentHRVState} (trend: ${trendDirection})`);
          console.log(`⏱️ Next state change in ${stateChangeInterval.toFixed(1)} minutes`);
        }

        // Generate HRV value based on current state
        const stateConfig = hrvStates[currentHRVState];
        const baseHRV = stateConfig.base;
        const variation = stateConfig.variation;

        // Add some variation within the state range
        const randomVariation = Math.floor(Math.random() * (variation * 2 + 1)) - variation;
        const newHRV = Math.max(30, Math.min(300, baseHRV + randomVariation));

        this.updateHRV(newHRV);

        // Log current state info every 30 seconds
        if (Math.floor(timeInState * 2) % 60 === 0) { // Every 30 seconds
          console.log(`📊 HRV: ${newHRV} | State: ${currentHRVState} | Time in state: ${timeInState.toFixed(1)}min | Trend: ${trendDirection}`);
        }
      }
    }, 3000); // Check every 3 seconds for more realistic updates
  }

  // Start mock data for development/testing
  enableMockData() {
    this.startMockData();
  }
}

// Create singleton instance
export const arduinoService = new ArduinoService();
export type { HeartRateData, HRVData };
