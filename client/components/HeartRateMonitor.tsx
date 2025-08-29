import React, { useState, useEffect } from 'react';
import { arduinoService, HeartRateData } from '../services/arduinoService';
import { useNavigate } from 'react-router-dom';

interface HeartRateMonitorProps {
  className?: string;
}

const HeartRateMonitor: React.FC<HeartRateMonitorProps> = ({ className = '' }) => {
  const [heartRateData, setHeartRateData] = useState<HeartRateData>({
    values: [72, 78, 75, 95, 85, 70, 82, 76, 92, 80, 86, 90], // Default values
    timestamp: Date.now()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [currentBpm, setCurrentBpm] = useState(77); // Average of default values: (72+78+75+95+85+70+82+76)/8 = 77

  useEffect(() => {
    // Subscribe to Arduino heart rate data
    const unsubscribe = arduinoService.subscribe((data: HeartRateData) => {
      setHeartRateData(data);
      // Calculate average BPM from all values
      if (data.values.length > 0) {
        const average = Math.round(data.values.reduce((sum, val) => sum + val, 0) / data.values.length);
        setCurrentBpm(average);
      }
    });

    // Check connection status
    setIsConnected(arduinoService.isConnectedToArduino());

    // Start with mock data for heart rate monitoring (Arduino connection requires user interaction)
    const initializeConnection = () => {
      if (!arduinoService.isConnectedToArduino()) {
        console.log('💡 Starting heart rate monitoring with simulated data');
        arduinoService.enableMockData();
        setIsConnected(false); // Show that we're using mock data
      } else {
        setIsConnected(true); // Arduino is already connected
      }
    };

    initializeConnection();

    return unsubscribe;
  }, []);

  // Function to get bar color based on value and position in array
  const getBarColor = (value: number, index: number, values: number[]): string => {
    if (values.length === 0) return 'bg-emotion-orange';

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Highest value gets red (emotion-mouth)
    if (value === maxValue) {
      return 'bg-emotion-mouth';
    }
    // Lowest value gets blue (emotion-blue)
    else if (value === minValue) {
      return 'bg-emotion-blue';
    }
    // All other values get orange
    else {
      return 'bg-emotion-orange';
    }
  };

  // Function to get bar height based on value (scale to fit UI)
  const getBarHeight = (value: number, values: number[]): string => {
    if (values.length === 0) return 'h-6';

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;
    
    // If all values are the same, use medium height
    if (range === 0) return 'h-7';

    // Scale height between h-4 (16px) and h-10 (40px)
    const normalizedValue = (value - minValue) / range;
    const heightScale = 4 + (normalizedValue * 6); // 4 to 10
    
    const heightClasses = [
      'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9', 'h-10'
    ];
    
    const heightIndex = Math.min(Math.floor(heightScale) - 4, heightClasses.length - 1);
    return heightClasses[Math.max(0, heightIndex)];
  };

  // Get responsive height classes
  const getResponsiveBarHeight = (value: number, values: number[]): string => {
    const baseHeight = getBarHeight(value, values);
    
    // Map to responsive classes
    const heightMap: { [key: string]: string } = {
      'h-4': 'h-4 lg:h-6',
      'h-5': 'h-5 lg:h-8',
      'h-6': 'h-6 lg:h-10',
      'h-7': 'h-7 lg:h-11',
      'h-8': 'h-8 lg:h-12',
      'h-9': 'h-9 lg:h-14',
      'h-10': 'h-10 lg:h-16'
    };
    
    return heightMap[baseHeight] || 'h-6 lg:h-10';
  };

  const connectToArduino = async () => {
    const success = await arduinoService.connect();
    setIsConnected(success);
  };

  // Ensure we always have 8 values for display
  const displayValues = heartRateData.values.length >= 8 
    ? heartRateData.values.slice(-8)
    : [...heartRateData.values, ...Array(8 - heartRateData.values.length).fill(0).map((_, i) => 70 + i * 2)];

  return (
    <div className={`flex flex-col items-center gap-2 w-28 lg:w-40 ${className}`}>
      {/* Heart Rate Display */}
      <div className="flex items-center gap-2 lg:gap-3">
        <svg className="w-12 h-12 lg:w-16 lg:h-16" viewBox="0 0 49 48" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M18.4235 38.7414C12.5389 33.9428 4.5 26.0158 4.5 18.5209C4.5 6.699 15.5003 1.32527 24.5 10.9975C33.4996 1.32527 44.5 6.69862 44.5 18.5208C44.5 26.016 36.4612 33.9428 30.5766 38.7414C27.9126 40.9138 26.5806 42 24.5 42C22.4194 42 21.0874 40.9138 18.4235 38.7414ZM20.6864 21.4926C20.8654 21.2368 21.0142 21.0244 21.1466 20.8426C21.2586 21.0376 21.3836 21.2648 21.534 21.5384L24.9546 27.7574C25.2866 28.3616 25.6124 28.9542 25.9394 29.3842C26.2894 29.8442 26.9046 30.4748 27.8908 30.4932C28.8768 30.5118 29.5154 29.9048 29.8824 29.4582C30.2254 29.0408 30.573 28.461 30.9276 27.8698L31.0384 27.685C31.48 26.949 31.758 26.4888 32.004 26.1564C32.2308 25.8502 32.3618 25.7502 32.4596 25.695C32.5572 25.6396 32.7104 25.5788 33.0896 25.5418C33.5012 25.5018 34.0388 25.5002 34.8972 25.5002H36.5C37.3284 25.5002 38 24.8286 38 24.0002C38 23.1718 37.3284 22.5002 36.5 22.5002H34.8324C34.0582 22.5002 33.3734 22.5002 32.7994 22.556C32.177 22.6164 31.5714 22.7502 30.9814 23.0844C30.3914 23.4184 29.965 23.8688 29.593 24.3714C29.2498 24.8348 28.8976 25.422 28.4992 26.086L28.4042 26.2444C28.2308 26.5336 28.086 26.7744 27.9568 26.9812C27.8352 26.7698 27.6998 26.5236 27.5372 26.2282L24.1184 20.012C23.8102 19.4512 23.503 18.8925 23.1916 18.4829C22.8512 18.0355 22.2678 17.4439 21.3328 17.3934C20.3977 17.3429 19.754 17.8683 19.3675 18.2765C19.0137 18.6501 18.6482 19.1725 18.2814 19.6968L17.6626 20.5808C17.2083 21.2298 16.9235 21.6342 16.677 21.9258C16.45 22.1942 16.3239 22.2822 16.2308 22.3306C16.1376 22.3792 15.9933 22.432 15.6432 22.464C15.2629 22.4988 14.7683 22.5002 13.9761 22.5002H12.5C11.6716 22.5002 11 23.1718 11 24.0002C11 24.8286 11.6716 25.5002 12.5 25.5002H14.0362C14.7502 25.5002 15.3831 25.5002 15.916 25.4516C16.4941 25.3988 17.0581 25.2822 17.6162 24.9916C18.1743 24.701 18.5932 24.306 18.968 23.8626C19.3135 23.4538 19.6764 22.9354 20.0858 22.3504L20.6864 21.4926Z" fill="#FF8B7E"/>
        </svg>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-medium text-black lg:text-5xl">
            {currentBpm}
          </span>
          <span className="text-xs text-black leading-none mb-1 lg:text-sm lg:mb-2">BPM</span>
        </div>
      </div>

      {/* Heart Rate Chart */}
      <div className="flex items-end gap-1 h-10 lg:h-16 lg:gap-2">
        {displayValues.map((value, index) => {
          const barColor = getBarColor(value, index, displayValues.filter(v => v > 0));
          const barHeight = getResponsiveBarHeight(value, displayValues.filter(v => v > 0));
          
          return (
            <div
              key={index}
              className={`w-2.5 ${barHeight} ${barColor} rounded-t-sm flex items-end justify-center p-0.5 lg:w-4 transition-all duration-300`}
            >
              <span className="text-white text-[3px] font-medium lg:text-[5px]">
                {value > 0 ? value : ''}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default HeartRateMonitor;
