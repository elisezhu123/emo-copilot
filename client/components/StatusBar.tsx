import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface StatusBarProps {
  title: string;
  showHomeButton?: boolean;
  isDraggable?: boolean;
  showTemperature?: boolean;
  onTemperatureExceed?: (temp: number) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  title,
  showHomeButton = false,
  isDraggable = false,
  showTemperature = true,
  onTemperatureExceed
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<string | null>('15°C'); // Initialize with current Limerick temperature
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Fetch weather data for Limerick, Ireland
  const fetchWeather = async (lat: number, lng: number) => {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey || apiKey === 'your-openweather-api-key') {
        console.warn('⚠️ OpenWeather API key not configured - using Limerick temperature');
        setTemperature('15°C');
        return;
      }

      // Use Limerick coordinates if not provided or fetch for current location
      const limerickLat = 52.6638;
      const limerickLng = -8.6267;
      const weatherLat = lat || limerickLat;
      const weatherLng = lng || limerickLng;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLat}&lon=${weatherLng}&appid=${apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();
      const temp = Math.round(data.main.temp);
      setTemperature(`${temp}°C`);
      console.log('🌡️ StatusBar temperature updated for Limerick area:', `${temp}°C`);

      // Check if temperature exceeds 35°C and trigger callback
      if (temp >= 35 && onTemperatureExceed) {
        console.log('🔥 Temperature exceeds 35°C, triggering AC permission dialog');
        onTemperatureExceed(temp);
      }
      
    } catch (error) {
      console.error('❌ StatusBar weather API error:', error);
      // Fallback to current Limerick temperature
      setTemperature('15°C');
      console.log('🌡️ StatusBar using fallback Limerick temperature: 15°C');
    }
  };

  // Get user's location and weather
  useEffect(() => {
    if (navigator.geolocation && showTemperature) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          fetchWeather(location.lat, location.lng);
        },
        (error) => {
          // Handle geolocation errors gracefully - this is normal behavior
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log('🌡️ StatusBar: Location access denied, using Limerick weather');
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('🌡️ StatusBar: Location unavailable, using Limerick weather');
              break;
            case error.TIMEOUT:
              console.log('🌡️ StatusBar: Location request timed out, using Limerick weather');
              break;
            default:
              console.log('🌡️ StatusBar: Location service unavailable, using Limerick weather');
              break;
          }

          // Fallback to Limerick weather when location is not available
          fetchWeather(52.6638, -8.6267); // Limerick coordinates
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else if (showTemperature) {
      // Fallback to Limerick weather when geolocation is not supported
      console.log('🌡️ StatusBar: Geolocation not supported, using Limerick weather');
      fetchWeather(52.6638, -8.6267); // Limerick coordinates
    }
  }, [showTemperature]);

  const statusBarClasses = `flex justify-between items-center mb-2 text-xs text-black lg:text-sm ${isDraggable ? 'cursor-move' : ''} px-1`;
  
  const dragHandlers = isDraggable ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', '');
      (e.currentTarget as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.opacity = '1';
    }
  } : {};

  return (
    <div className={statusBarClasses} {...dragHandlers}>
      {/* Left Side - Status */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-flowkit-green rounded-full lg:w-3 lg:h-3"></div>
        <span className="font-medium">{title}</span>
      </div>

      {/* Center - Temperature */}
      {showTemperature && temperature && (
        <div className="flex items-center justify-center">
          <span className="font-medium text-emotion-default">Temperature: {temperature}</span>
        </div>
      )}

      {/* Right Side - Time, Icons, Home Button */}
      <div className="flex items-center gap-3">

        
        {/* Real-time Clock */}
        <span className="font-medium">{formatTime(currentTime)}</span>
        
        {/* Signal Icon */}
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
          <path d="M10 4C6.13401 4 3 7.13401 3 11C3 12.9322 3.7822 14.6808 5.04843 15.9479C5.24362 16.1433 5.24351 16.4598 5.04817 16.655C4.85284 16.8502 4.53626 16.8501 4.34106 16.6548C2.89512 15.2078 2 13.2079 2 11C2 6.58172 5.58172 3 10 3C14.4183 3 18 6.58172 18 11C18 13.2079 17.1049 15.2078 15.6589 16.6548C15.4637 16.8501 15.1472 16.8502 14.9518 16.655C14.7565 16.4598 14.7564 16.1433 14.9516 15.9479C16.2178 14.6808 17 12.9322 17 11C17 7.13401 13.866 4 10 4ZM10 7C7.79086 7 6 8.79086 6 11C6 12.1029 6.44574 13.1008 7.1681 13.825C7.36313 14.0205 7.36274 14.337 7.16724 14.5321C6.97174 14.7271 6.65516 14.7267 6.46013 14.5312C5.5584 13.6273 5 12.3784 5 11C5 8.23858 7.23858 6 10 6C12.7614 6 15 8.23858 15 11C15 12.3795 14.4407 13.6293 13.5377 14.5334C13.3426 14.7287 13.026 14.7289 12.8306 14.5338C12.6352 14.3387 12.635 14.0221 12.8302 13.8267C13.5535 13.1024 14 12.1038 14 11C14 8.79086 12.2091 7 10 7ZM10 9C8.89543 9 8 9.89543 8 11C8 12.1046 8.89543 13 10 13C11.1046 13 12 12.1046 12 11C12 9.89543 11.1046 9 10 9ZM9 11C9 10.4477 9.44772 10 10 10C10.5523 10 11 10.4477 11 11C11 11.5523 10.5523 12 10 12C9.44772 12 9 11.5523 9 11Z" fill="#242424"/>
        </svg>
        
        {/* Battery Icon */}
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
          <path d="M17 6C18.6569 6 20 7.34315 20 9V10H21.0003C21.1824 10 21.3532 10.0487 21.5003 10.1338C21.7992 10.3067 22.0003 10.6299 22.0003 11V13C22.0003 13.3701 21.7992 13.6933 21.5003 13.8662C21.3532 13.9513 21.1824 14 21.0003 14H20V15C20 16.6569 18.6569 18 17 18H4.99969C3.34284 18 1.99969 16.6569 1.99969 15V9C1.99969 7.34315 3.34284 6 4.99969 6H17ZM16.9982 7.5H4.99969C4.22 7.5 3.57925 8.09489 3.50656 8.85554L3.49969 9V15C3.49969 15.7797 4.09458 16.4204 4.85523 16.4931L4.99969 16.5H16.9982C17.7778 16.5 18.4186 15.9051 18.4913 15.1445L18.4982 15V9C18.4982 8.2203 17.9033 7.57955 17.1426 7.50687L16.9982 7.5ZM5.99969 9H14C14.5129 9 14.9355 9.38604 14.9933 9.88338L15 10V14C15 14.5128 14.614 14.9355 14.1166 14.9933L14 15H5.99969C5.48685 15 5.06419 14.614 5.00642 14.1166L4.99969 14V10C4.99969 9.48717 5.38574 9.06449 5.88307 9.00673L5.99969 9H14H5.99969Z" fill="#242424"/>
        </svg>
        
        {/* Home Button */}
        {showHomeButton && (
          <Link
            to="/dashboard"
            className="hover:scale-110 transition-transform duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5495 2.53189C11.3874 1.82531 12.6126 1.82531 13.4505 2.5319L20.2005 8.224C20.7074 8.65152 21 9.2809 21 9.94406L21 19.2539C21 20.2204 20.2165 21.0039 19.25 21.0039H15.75C14.7835 21.0039 14 20.2204 14 19.2539L14 14.2468C14 14.1088 13.8881 13.9968 13.75 13.9968H10.25C10.1119 13.9968 9.99999 14.1088 9.99999 14.2468L9.99999 19.2539C9.99999 20.2204 9.2165 21.0039 8.25 21.0039H4.75C3.7835 21.0039 3 20.2204 3 19.2539V9.94406C3 9.2809 3.29255 8.65152 3.79952 8.224L10.5495 2.53189ZM12.4835 3.6786C12.2042 3.44307 11.7958 3.44307 11.5165 3.6786L4.76651 9.37071C4.59752 9.51321 4.5 9.72301 4.5 9.94406L4.5 19.2539C4.5 19.392 4.61193 19.5039 4.75 19.5039H8.25C8.38807 19.5039 8.49999 19.392 8.49999 19.2539L8.49999 14.2468C8.49999 13.2803 9.2835 12.4968 10.25 12.4968H13.75C14.7165 12.4968 15.5 13.2803 15.5 14.2468L15.5 19.2539C15.5 19.392 15.6119 19.5039 15.75 19.5039H19.25C19.3881 19.5039 19.5 19.392 19.5 19.2539L19.5 9.94406C19.5 9.72301 19.4025 9.51321 19.2335 9.37071L12.4835 3.6786Z" fill="#242424"/>
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
