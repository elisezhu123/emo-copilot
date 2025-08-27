// Arduino Connection Test Utility
import { arduinoService } from '../services/arduinoService';

export class ArduinoConnectionTest {
  static async testConnection(): Promise<{
    isSupported: boolean;
    isConnected: boolean;
    canConnect: boolean;
    status: string;
    instructions: string[];
  }> {
    const result = {
      isSupported: false,
      isConnected: false,
      canConnect: false,
      status: 'Unknown',
      instructions: [] as string[]
    };

    // Check Web Serial API support
    if ('serial' in navigator) {
      result.isSupported = true;
      result.status = 'Web Serial API supported';
    } else {
      result.status = 'Web Serial API not supported';
      result.instructions = [
        'Use Chrome, Edge, or Safari',
        'Ensure HTTPS or localhost',
        'Update to latest browser version'
      ];
      return result;
    }

    // Check if already connected
    result.isConnected = arduinoService.isConnectedToArduino();
    
    if (result.isConnected) {
      result.status = 'Arduino already connected';
      result.canConnect = true;
    } else {
      result.status = 'Ready to connect Arduino';
      result.canConnect = true;
      result.instructions = [
        '1. Connect Arduino via USB',
        '2. Upload heart rate code to Arduino',
        '3. Click "Connect Arduino" button',
        '4. Select your Arduino port'
      ];
    }

    return result;
  }

  static async attemptConnection(): Promise<{
    success: boolean;
    message: string;
    currentHeartRate: number | null;
    currentHRV: number;
  }> {
    try {
      console.log('🔌 Testing Arduino connection...');
      
      const success = await arduinoService.connect();
      
      if (success) {
        // Wait a moment for data
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          message: 'Arduino connected successfully! Real sensor data is now being used.',
          currentHeartRate: arduinoService.getCurrentHeartRate(),
          currentHRV: arduinoService.getCurrentHRV()
        };
      } else {
        return {
          success: false,
          message: 'Connection failed. Using mock data instead.',
          currentHeartRate: null,
          currentHRV: 173
        };
      }
    } catch (error) {
      console.error('Arduino connection error:', error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        currentHeartRate: null,
        currentHRV: 173
      };
    }
  }

  static logCurrentStatus(): void {
    console.log('🔍 Arduino Status Check:');
    console.log('📡 Web Serial supported:', 'serial' in navigator);
    console.log('🔌 Connected:', arduinoService.isConnectedToArduino());
    console.log('💓 Current HR:', arduinoService.getCurrentHeartRate());
    console.log('📊 Current HRV:', arduinoService.getCurrentHRV());
    console.log('📈 HR History:', arduinoService.getHeartRateValues());
  }

  static getExampleArduinoCode(): string {
    return `
// Example Arduino Code for Emo-Copilot Integration
// Upload this to your Arduino

void setup() {
  Serial.begin(115200); // Must match baudRate in service
  Serial.println("Arduino Heart Rate Monitor Ready");
}

void loop() {
  // Simulate heart rate sensor reading
  int heartRate = 70 + random(-10, 20); // 60-90 BPM range
  int hrv = 150 + random(-30, 30);      // 120-180 ms range
  
  // Format 1: Comma-separated (recommended)
  Serial.print("120,125,118,1,");
  Serial.print(heartRate);
  Serial.print(",");
  Serial.println(hrv);
  
  // OR Format 2: Labeled data
  // Serial.print("HR:");
  // Serial.println(heartRate);
  // Serial.print("HRV:");
  // Serial.println(hrv);
  
  // OR Format 3: Simple heart rate only
  // Serial.println(heartRate);
  
  delay(2000); // Send data every 2 seconds
}

// For real sensors, replace random() with actual sensor readings
// Popular libraries: PulseSensor, CheezPPG, MAX30105, etc.
`;
  }
}

// Global functions for easy console testing
(window as any).testArduino = ArduinoConnectionTest.attemptConnection;
(window as any).checkArduino = ArduinoConnectionTest.logCurrentStatus;
(window as any).arduinoTest = ArduinoConnectionTest.testConnection;
(window as any).getArduinoCode = ArduinoConnectionTest.getExampleArduinoCode;
