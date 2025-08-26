import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { carStateManager, type DriverStateType } from '../services/carStateManager';

interface WeatherCondition {
  condition: string;
  visibility?: number;
  windSpeed?: number;
  temp: number;
  description: string;
}

interface StatusBarProps {
  title: string;
  showHomeButton?: boolean;
  isDraggable?: boolean;
  showTemperature?: boolean;
  showBackButton?: boolean;
  showDriverState?: boolean;
  onTemperatureExceed?: (temp: number) => void;
  onExtremeWeather?: (weather: WeatherCondition) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  title,
  showHomeButton = false,
  isDraggable = false,
  showTemperature = true,
  showBackButton = false,
  showDriverState = false,
  onTemperatureExceed,
  onExtremeWeather
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<string | null>('20°C'); // Initialize with current Limerick temperature
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [driverState, setDriverState] = useState<DriverStateType>('neutral');

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
        console.warn('⚠️ OpenWeather API key not configured - using default temperature');
        setTemperature('20°C');
        return;
      }

      console.log('🌐 Using real OpenWeather API with provided key');

      // Use Limerick coordinates if not provided or fetch for current location
      const limerickLat = 52.6638;
      const limerickLng = -8.6267;
      const weatherLat = lat || limerickLat;
      const weatherLng = lng || limerickLng;

      console.log(`🌐 Fetching weather for: ${weatherLat}, ${weatherLng}`);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLat}&lon=${weatherLng}&appid=${apiKey}&units=metric`
      );

      if (!response.ok) {
        console.error(`❌ API response not ok: ${response.status} ${response.statusText}`);
        throw new Error(`Weather API request failed: ${response.status}`);
      }

      const data = await response.json();
      const temp = Math.round(data.main.temp);
      setTemperature(`${temp}°C`);
      console.log('🌡️ StatusBar temperature updated for Limerick area:', `${temp}°C`);

      // Check for extreme weather conditions
      const weatherCondition = data.weather[0].main.toLowerCase();
      const visibility = data.visibility || 10000;
      const windSpeed = data.wind?.speed || 0;
      const description = data.weather[0].description;

      // Check if temperature exceeds 35°C and trigger callback
      if (temp >= 35 && onTemperatureExceed) {
        console.log('🔥 Temperature exceeds 35°C, triggering AC permission dialog');
        onTemperatureExceed(temp);
      }
      console.log('🌡️ Real OpenWeather API temperature:', temp, '°C for location:', weatherLat, weatherLng);

      // Check for extreme weather conditions
      const extremeConditions = [
        'snow', 'blizzard', 'thunderstorm', 'fog', 'mist',
        'haze', 'dust', 'sand', 'ash', 'squall', 'tornado'
      ];

      const isExtremeWeather = extremeConditions.some(condition =>
        weatherCondition.includes(condition)
      ) || visibility < 1000 || windSpeed > 15 || temp <= -5;

      if (isExtremeWeather && onExtremeWeather) {
        console.log('⚠️ Extreme weather detected:', weatherCondition, 'Visibility:', visibility, 'Wind:', windSpeed);
        onExtremeWeather({
          condition: weatherCondition,
          visibility,
          windSpeed,
          temp,
          description
        });
      }
      
    } catch (error) {
      console.error('❌ StatusBar weather API error:', error);
      console.log('🌡️ Real OpenWeather API failed, using fallback temperature');

      // Only use fallback if real API fails
      const randomValue = Math.random();
      let fallbackTemp = 20; // Default Limerick temperature
      let simulatedWeather = null;

      if (randomValue < 0.15) { // 15% chance of extreme weather
        const extremeWeatherTypes = [
          { condition: 'snow', temp: -2, description: 'Heavy snow' },
          { condition: 'fog', temp: 8, description: 'Dense fog', visibility: 200 },
          { condition: 'thunderstorm', temp: 18, description: 'Severe thunderstorm', windSpeed: 20 },
          { condition: 'blizzard', temp: -8, description: 'Blizzard conditions', windSpeed: 25 }
        ];

        simulatedWeather = extremeWeatherTypes[Math.floor(Math.random() * extremeWeatherTypes.length)];
        fallbackTemp = simulatedWeather.temp;

        console.log(`⚠️ Simulated extreme weather: ${simulatedWeather.condition}`);

        if (onExtremeWeather) {
          onExtremeWeather({
            condition: simulatedWeather.condition,
            visibility: simulatedWeather.visibility || 10000,
            windSpeed: simulatedWeather.windSpeed || 0,
            temp: fallbackTemp,
            description: simulatedWeather.description
          });
        }
      } else if (randomValue < 0.25) { // 10% chance of high temp - DISABLED for user experience
        fallbackTemp = 18 + Math.floor(Math.random() * 5); // Use realistic temperature 18-23°C around Limerick current
        // if (onTemperatureExceed) {
        //   onTemperatureExceed(fallbackTemp);
        // }
      }

      setTemperature(`${fallbackTemp}°C`);
      console.log(`🌡️ StatusBar using simulated temperature: ${fallbackTemp}°C (Limerick realistic range)`);
    }
  };

  // Get user's location and weather
  useEffect(() => {
    if (navigator.geolocation && showTemperature) {
      console.log('🌍 Attempting to get user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Location obtained:', location.lat, location.lng);
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
          // For testing: occasionally simulate weather conditions
          const randomValue = Math.random();
          if (randomValue < 0.2) { // 20% chance of simulation
            if (randomValue < 0.1) {
              // Simulate extreme weather
              const extremeWeatherTypes = [
                { condition: 'snow', temp: -2, description: 'Heavy snow' },
                { condition: 'fog', temp: 8, description: 'Dense fog', visibility: 200 }
              ];

              const simulatedWeather = extremeWeatherTypes[Math.floor(Math.random() * extremeWeatherTypes.length)];
              setTemperature(`${simulatedWeather.temp}°C`);
              console.log(`⚠️ Simulated extreme weather: ${simulatedWeather.condition}`);

              if (onExtremeWeather) {
                onExtremeWeather({
                  condition: simulatedWeather.condition,
                  visibility: simulatedWeather.visibility || 10000,
                  windSpeed: simulatedWeather.windSpeed || 0,
                  temp: simulatedWeather.temp,
                  description: simulatedWeather.description
                });
              }
            } else {
              // Simulate realistic temperature - DISABLED high temp simulation
              const simulatedTemp = 18 + Math.floor(Math.random() * 5); // 18-23°C Limerick realistic range
              setTemperature(`${simulatedTemp}°C`);
              // if (onTemperatureExceed) {
              //   onTemperatureExceed(simulatedTemp);
              // }
            }
          } else {
            console.log('🌍 Using Limerick coordinates for weather');
            fetchWeather(52.6638, -8.6267); // Limerick coordinates
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else if (showTemperature) {
      // Fallback to Limerick weather when geolocation is not supported
      console.log('🌡️ StatusBar: Geolocation not supported, using Limerick weather');
      // For testing: occasionally simulate weather conditions
      const randomValue = Math.random();
      if (randomValue < 0.2) { // 20% chance of simulation
        if (randomValue < 0.1) {
          // Simulate extreme weather
          const extremeWeatherTypes = [
            { condition: 'snow', temp: -2, description: 'Heavy snow' },
            { condition: 'fog', temp: 8, description: 'Dense fog', visibility: 200 }
          ];

          const simulatedWeather = extremeWeatherTypes[Math.floor(Math.random() * extremeWeatherTypes.length)];
          setTemperature(`${simulatedWeather.temp}°C`);
          console.log(`⚠️ Simulated extreme weather: ${simulatedWeather.condition}`);

          if (onExtremeWeather) {
            onExtremeWeather({
              condition: simulatedWeather.condition,
              visibility: simulatedWeather.visibility || 10000,
              windSpeed: simulatedWeather.windSpeed || 0,
              temp: simulatedWeather.temp,
              description: simulatedWeather.description
            });
          }
        } else {
          // Simulate realistic temperature - DISABLED high temp simulation
          const simulatedTemp = 18 + Math.floor(Math.random() * 5); // 18-23°C Limerick realistic range
          setTemperature(`${simulatedTemp}°C`);
          // if (onTemperatureExceed) {
          //   onTemperatureExceed(simulatedTemp);
          // }
        }
      } else {
        fetchWeather(52.6638, -8.6267); // Limerick coordinates
      }
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
    <div className={`flex justify-between items-center w-full h-5 px-5 py-5 ${isDraggable ? 'cursor-move' : ''}`} {...dragHandlers}>
      {/* Left Side - Active State */}
      <div className="flex justify-center items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="4" r="4" fill="#29CC6A"/>
        </svg>
        <span className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal">
          Emo-Copilot Active
        </span>
      </div>

      {/* Center - Temperature */}
      {showTemperature && temperature && (
        <div className="flex justify-center items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 9 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4.5" cy="4" r="4" fill="#A6DBFF"/>
          </svg>
          <span
            className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal cursor-pointer hover:text-blue-600"
            onClick={() => {
              console.log('🔄 Manual temperature refresh requested');
              if (currentLocation) {
                fetchWeather(currentLocation.lat, currentLocation.lng);
              } else {
                fetchWeather(52.6638, -8.6267); // Limerick coordinates
              }
            }}
            title="Click to refresh temperature"
          >
            Temperature: {temperature}
          </span>
        </div>
      )}

      {/* Right Side - Time + Battery */}
      <div className="flex w-[130px] justify-end items-center gap-2 flex-shrink-0">
        <span className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal">
          {formatTime(currentTime)}
        </span>

        {/* WiFi Icon */}
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.8323 7.38331C17.2417 7.7927 17.6285 8.2608 17.9653 8.74874C18.1222 8.97601 18.0651 9.28741 17.8378 9.44426C17.6105 9.60112 17.2991 9.54403 17.1423 9.31676C16.8391 8.87752 16.4908 8.45604 16.1252 8.09041C12.7621 4.72735 7.30951 4.72735 3.94644 8.09041C3.5982 8.43865 3.25362 8.86 2.93943 9.31289C2.78203 9.53978 2.4705 9.59611 2.24361 9.43871C2.01672 9.28131 1.96039 8.96978 2.11779 8.74289C2.46426 8.24347 2.84617 7.77647 3.23934 7.38331C6.99293 3.62972 13.0787 3.62972 16.8323 7.38331ZM14.5966 9.35675C15.0689 9.82908 15.4784 10.4028 15.7904 11.0128C15.9162 11.2587 15.8188 11.5599 15.5729 11.6856C15.3271 11.8114 15.0259 11.714 14.9001 11.4682C14.6343 10.9485 14.2857 10.46 13.8895 10.0639C11.7612 7.93552 8.31045 7.93552 6.18212 10.0639C5.76874 10.4772 5.43278 10.9422 5.17417 11.4535C5.04953 11.6999 4.74874 11.7986 4.50232 11.674C4.25591 11.5494 4.15719 11.2486 4.28183 11.0022C4.58807 10.3967 4.98645 9.84531 5.47501 9.35675C7.99387 6.83788 12.0778 6.83788 14.5966 9.35675ZM12.8876 11.8539C13.2419 12.2082 13.5338 12.644 13.737 13.1076C13.8478 13.3605 13.7326 13.6554 13.4797 13.7662C13.2268 13.8771 12.9319 13.7619 12.8211 13.509C12.6667 13.1567 12.4445 12.825 12.1805 12.561C10.996 11.3765 9.07559 11.3765 7.89109 12.561C7.62839 12.8237 7.41558 13.1429 7.26003 13.4984C7.14933 13.7514 6.85451 13.8668 6.60153 13.7561C6.34854 13.6454 6.23319 13.3506 6.34389 13.0976C6.54802 12.6311 6.83035 12.2075 7.18398 11.8539C8.759 10.2789 11.3126 10.2789 12.8876 11.8539ZM10.963 13.7865C11.47 14.2936 11.47 15.1157 10.963 15.6228C10.4559 16.1298 9.63379 16.1298 9.12673 15.6228C8.61966 15.1157 8.61966 14.2936 9.12673 13.7865C9.63379 13.2795 10.4559 13.2795 10.963 13.7865Z" fill="#242424"/>
        </svg>

        {/* Battery Icon */}
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 5C14.8807 5 16 6.11929 16 7.5V8.33333L17.1667 8.3356C17.3184 8.3356 17.4608 8.37619 17.5833 8.4471C17.8324 8.59119 18 8.86052 18 9.16894V10.8356C18 11.144 17.8324 11.4134 17.5833 11.5574C17.4608 11.6284 17.3184 11.6689 17.1667 11.6689L16 11.6667V12.5C16 13.8807 14.8807 15 13.5 15H4.5C3.11929 15 2 13.8807 2 12.5V7.5C2 6.11929 3.11929 5 4.5 5H13.5ZM13.75 5.94604H4.5C3.85025 5.94604 3.09484 6.44178 3.00822 7.07566L3 7.19604V12.6913C3 13.3385 3.49187 13.8709 4.12219 13.9349L4.25 13.9413H13.75C14.3972 13.9413 14.9295 13.4494 14.9935 12.8191L15 12.6913V7.19604C15 6.54883 14.5081 6.01651 13.8778 5.9525L13.75 5.94604ZM4.83436 6.94867H11.1646C11.5905 6.94867 11.9419 7.26736 11.9935 7.67926L12 7.78405V12.1107C12 12.5366 11.6813 12.888 11.2694 12.9395L11.1646 12.946H4.83436C4.40848 12.946 4.05704 12.6274 4.00549 12.2155L3.99898 12.1107V7.78405C3.99898 7.35818 4.31767 7.00673 4.72957 6.95518L4.83436 6.94867H11.1646H4.83436Z" fill="#242424"/>
        </svg>

        {/* Home Button */}
        {showHomeButton && (
          <Link
            to="/dashboard"
            className="hover:scale-110 transition-transform duration-200 ml-1"
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
export type { WeatherCondition };
