import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { carStateManager, type DriverStateType } from '../services/carStateManager';
import { arduinoService } from '../services/arduinoService';

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
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<string | null>('20°C'); // Initialize with current Limerick temperature
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [driverState, setDriverState] = useState<DriverStateType>('neutral');
  const [isArduinoConnected, setIsArduinoConnected] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('unknown');
  const [isUsingUserLocation, setIsUsingUserLocation] = useState(false);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Driver state subscription
  useEffect(() => {
    if (showDriverState) {
      console.log('🧠 StatusBar - Setting up driver state subscription');

      // Get current state without modifying it
      const currentState = carStateManager.getState();
      console.log('🧠 StatusBar - Current car state:', currentState);
      setDriverState(currentState.driverState);

      const unsubscribe = carStateManager.subscribe((newState) => {
        console.log('🧠 StatusBar - Received state update:', newState.driverState);
        setDriverState(newState.driverState);
      });

      return unsubscribe;
    }
  }, [showDriverState]);

  // Arduino connection monitoring
  useEffect(() => {
    // Check initial connection status
    setIsArduinoConnected(arduinoService.isConnectedToArduino());

    // Monitor connection status every few seconds
    const connectionCheck = setInterval(() => {
      setIsArduinoConnected(arduinoService.isConnectedToArduino());
    }, 3000);

    return () => clearInterval(connectionCheck);
  }, []);

  // Function to connect to Arduino
  const connectArduino = async () => {
    try {
      const success = await arduinoService.connect();
      setIsArduinoConnected(success);
      if (success) {
        console.log('✅ Arduino connected successfully from StatusBar');
      } else {
        console.log('ℹ️ Arduino connection failed - using mock data');
      }
    } catch (error) {
      console.error('❌ Arduino connection error:', error);
      setIsArduinoConnected(false);
    }
  };

  // Helper function to get driver state display info with emotion colors matching dashboard
  const getDriverStateInfo = (state: DriverStateType) => {
    switch (state) {
      case 'anxious':
        return { text: 'Driver State: Anxious', color: '#FC5555' }; // flowkit-red
      case 'stressed':
        return { text: 'Driver State: Stressed', color: '#FF8B7E' }; // emotion-mouth
      case 'neutral':
        return { text: 'Driver State: Neutral', color: '#3A2018' }; // emotion-default
      case 'focused':
        return { text: 'Driver State: Focused', color: '#FFA680' }; // emotion-orange
      case 'calm':
        return { text: 'Driver State: Calm', color: '#A6DBFF' }; // emotion-blue
      case 'relaxed':
        return { text: 'Driver State: Relaxed', color: '#29CC6A' }; // flowkit-green
      default:
        return { text: 'Driver State: Neutral', color: '#3A2018' }; // emotion-default
    }
  };

  // Manual sync function to force refresh
  const forceDriverStateSync = () => {
    // Clear localStorage cache
    console.log('🧹 Clearing localStorage cache');
    localStorage.removeItem('carState');

    // Force reset to neutral and then let dashboard component set the correct state
    console.log('🔄 Resetting to neutral and forcing fresh sync');
    setDriverState('neutral');

    // Small delay to let dashboard component update if needed
    setTimeout(() => {
      const freshState = carStateManager.getState();
      console.log('🔄 Post-reset driver state:', freshState.driverState);
      setDriverState(freshState.driverState);
    }, 100);
  };

  // Expose function globally for direct updates from dashboard
  useEffect(() => {
    if (showDriverState) {
      (window as any).updateStatusBarDriverState = (newState: DriverStateType) => {
        console.log('🌐 Direct StatusBar driver state update:', newState);
        setDriverState(newState);
      };

      return () => {
        delete (window as any).updateStatusBarDriverState;
      };
    }
  }, [showDriverState]);

  // Smart back navigation based on current location
  const handleBackNavigation = () => {
    const currentPath = location.pathname;

    // Stop any ongoing speech synthesis when navigating away
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('🔇 Stopped Melo speech synthesis on navigation');
    }

    if (currentPath === '/music-playlists') {
      // Music playlists should go back to music selection
      navigate('/music-selection');
    } else if (currentPath === '/music-selection') {
      // Music selection should go back to dashboard
      navigate('/dashboard');
    } else if (currentPath === '/ai-chatbot') {
      // AI chatbot should go back to dashboard
      navigate('/dashboard');
    } else {
      // Default behavior - use browser history
      navigate(-1);
    }

    console.log(`🔙 Back navigation: ${currentPath} → navigating back`);
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Request location permission and get coordinates
  const requestLocationAccess = async (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('🌍 Geolocation not supported by this browser');
        setLocationStatus('unavailable');
        resolve(null);
        return;
      }

      setLocationStatus('requesting');
      console.log('🌍 Requesting location access...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Location access granted:', location.lat, location.lng);
          setLocationStatus('granted');
          setCurrentLocation(location);
          setIsUsingUserLocation(true);
          resolve(location);
        },
        (error) => {
          console.log('❌ Location access error:', error.message);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              setLocationStatus('denied');
              console.log('🌍 User denied location access');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationStatus('unavailable');
              console.log('🌍 Location information unavailable');
              break;
            case error.TIMEOUT:
              setLocationStatus('unavailable');
              console.log('🌍 Location request timed out');
              break;
            default:
              setLocationStatus('unavailable');
              console.log('🌍 Unknown location error');
              break;
          }
          setIsUsingUserLocation(false);
          resolve(null);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 300000 
        }
      );
    });
  };

  // Fetch weather data
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
      console.log('🌡️ StatusBar temperature updated:', `${temp}°C`);

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
      const fallbackTemp = 20; // Default Limerick temperature
      setTemperature(`${fallbackTemp}°C`);
      console.log(`🌡️ StatusBar using fallback temperature: ${fallbackTemp}°C`);
    }
  };

  // Get user's location and weather
  useEffect(() => {
    if (showTemperature) {
      const initializeWeather = async () => {
        console.log('🌍 Initializing weather with location check...');
        
        // Try to get user location
        const location = await requestLocationAccess();
        
        if (location) {
          // Use user's location
          fetchWeather(location.lat, location.lng);
        } else {
          // Fallback to Limerick weather
          console.log('🌍 Using Limerick coordinates for weather');
          setIsUsingUserLocation(false);
          fetchWeather(52.6638, -8.6267); // Limerick coordinates
        }
      };

      initializeWeather();
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

  // Show back button design for AI chatbot and music selection
  if (showBackButton) {
    const driverStateInfo = getDriverStateInfo(driverState);

    return (
      <div className={`flex justify-between items-center w-full h-5 px-5 py-5 ${isDraggable ? 'cursor-move' : ''}`} {...dragHandlers}>
        {/* Left Side - Back Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackNavigation}
            className="hover:scale-110 transition-transform duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.2676 15.793C11.9677 16.0787 11.493 16.0672 11.2073 15.7672L6.20597 10.5168C5.93004 10.2271 5.93004 9.77187 6.20597 9.4822L11.2073 4.23173C11.493 3.93181 11.9677 3.92028 12.2676 4.20597C12.5676 4.49166 12.5791 4.96639 12.2934 5.26631L7.78483 9.99949L12.2934 14.7327C12.5791 15.0326 12.5676 15.5073 12.2676 15.793Z" fill="#242424"/>
            </svg>
          </button>
        </div>

        {/* Center - Temperature and Driver State */}
        <div className="flex items-center gap-20">
          {/* Temperature */}
          {showTemperature && temperature && (
            <div className="flex justify-center items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="4" fill="#A6DBFF"/>
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
                title={`Click to refresh temperature ${isUsingUserLocation ? '(using your location)' : '(using Limerick, Ireland)'}`}
              >
                Temperature: {temperature}
              </span>
            </div>
          )}

          {/* Driver State */}
          {showDriverState && (
            <div className="flex justify-center items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="4" cy="4" r="4" fill={driverStateInfo.color}/>
              </svg>
              <span
                className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal cursor-pointer hover:text-blue-600"
                onClick={forceDriverStateSync}
                title="Click to refresh driver state"
              >
                {driverStateInfo.text}
              </span>
            </div>
          )}
        </div>

        {/* Right Side - Time + Battery + Home */}
        <div className="flex justify-end items-center gap-2">
          <span className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal">
            {formatTime(currentTime)}
          </span>

          {/* WiFi Icon */}
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.8323 7.38331C17.2417 7.7927 17.6285 8.2608 17.9653 8.74874C18.1222 8.97601 18.0651 9.28741 17.8378 9.44426C17.6105 9.60112 17.2991 9.54403 17.1423 9.31676C16.8391 8.87752 16.4908 8.45604 16.1252 8.09041C12.7621 4.72735 7.30951 4.72735 3.94644 8.09041C3.5982 8.43865 3.25362 8.86 2.93943 9.31289C2.78203 9.53978 2.4705 9.59611 2.24361 9.43871C2.01672 9.28131 1.96039 8.96978 2.11779 8.74289C2.46426 8.24347 2.84617 7.77647 3.23934 7.38331C6.99293 3.62972 13.0787 3.62972 16.8323 7.38331ZM14.5966 9.35675C15.0689 9.82908 15.4784 10.4028 15.7904 11.0128C15.9162 11.2587 15.8188 11.5599 15.5729 11.6856C15.3271 11.8114 15.0259 11.714 14.9001 11.4682C14.6343 10.9485 14.2857 10.46 13.8895 10.0639C11.7612 7.93552 8.31045 7.93552 6.18212 10.0639C5.76874 10.4772 5.43278 10.9422 5.17417 11.4535C5.04953 11.6999 4.74874 11.7986 4.50232 11.674C4.25591 11.5494 4.15719 11.2486 4.28183 11.0022C4.58807 10.3967 4.98645 9.84531 5.47501 9.35675C7.99387 6.83788 12.0778 6.83788 14.5966 9.35675ZM12.8876 11.8539C13.2419 12.2082 13.5338 12.644 13.737 13.1076C13.8478 13.3605 13.7326 13.6554 13.4797 13.7662C13.2268 13.8771 12.9319 13.7619 12.8211 13.509C12.6667 13.1567 12.4445 12.825 12.1805 12.561C10.996 11.3765 9.07559 11.3765 7.89109 12.561C7.62839 12.8237 7.41558 13.1429 7.26003 13.4984C7.14933 13.7514 6.85451 13.8668 6.60153 13.7561C6.34854 13.6454 6.23319 13.3506 6.34389 13.0976C6.54802 12.6311 6.83035 12.2075 7.18398 11.8539C8.759 10.2789 11.3126 10.2789 12.8876 11.8539ZM10.963 14.8284C11.1216 14.9871 11.1216 15.2394 10.963 15.398C10.8043 15.5566 10.552 15.5566 10.3934 15.398C10.2348 15.2394 10.2348 14.9871 10.3934 14.8284C10.552 14.6698 10.8043 14.6698 10.963 14.8284Z" fill="#242424"/>
          </svg>

          {/* Battery Icon */}
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 5C14.8807 5 16 6.11929 16 7.5V8.33333L17.1667 8.3356C17.3184 8.3356 17.4608 8.37619 17.5833 8.4471C17.8324 8.59119 18 8.86052 18 9.16894V10.8356C18 11.144 17.8324 11.4134 17.5833 11.5574C17.4608 11.6284 17.3184 11.6689 17.1667 11.6689L16 11.6667V12.5C16 13.8807 14.8807 15 13.5 15H4.5C3.11929 15 2 13.8807 2 12.5V7.5C2 6.11929 3.11929 5 4.5 5H13.5ZM13.75 5.94604H4.5C3.85025 5.94604 3.09484 6.44178 3.00822 7.07566L3 7.19604V12.6913C3 13.3385 3.49187 13.8709 4.12219 13.9349L4.25 13.9413H13.75C14.3972 13.9413 14.9295 13.4494 14.9935 12.8191L15 12.6913V7.19604C15 6.54883 14.5081 6.01651 13.8778 5.9525L13.75 5.94604ZM4.83436 6.94867H11.1646C11.5905 6.94867 11.9419 7.26736 11.9935 7.67926L12 7.78405V12.1107C12 12.5366 11.6813 12.888 11.2694 12.9395L11.1646 12.946H4.83436C4.40848 12.946 4.05704 12.6274 4.00549 12.2155L3.99898 12.1107V7.78405C3.99898 7.35818 4.31767 7.00673 4.72957 6.95518L4.83436 6.94867H11.1646H4.83436Z" fill="#242424"/>
          </svg>

          {/* Home Button */}
          <button
            onClick={() => {
              // Stop any ongoing speech synthesis when going home
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                console.log('🔇 Stopped Melo speech synthesis on home navigation');
              }
              navigate('/dashboard');
            }}
            className="hover:scale-110 transition-transform duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.31299 1.26164C7.69849 0.897163 8.30151 0.897163 8.68701 1.26164L13.5305 5.84098C13.8302 6.12431 14 6.51853 14 6.93094V12.5002C14 13.3286 13.3284 14.0002 12.5 14.0002H10.5C9.67157 14.0002 9 13.3286 9 12.5002V10.0002C9 9.72407 8.77614 9.50021 8.5 9.50021H7.5C7.22386 9.50021 7 9.72407 7 10.0002V12.5002C7 13.3286 6.32843 14.0002 5.5 14.0002H3.5C2.67157 14.0002 2 13.3286 2 12.5002V6.93094C2 6.51853 2.1698 6.12431 2.46948 5.84098L7.31299 1.26164ZM8 1.98828L3.15649 6.56762C3.0566 6.66207 3 6.79347 3 6.93094V12.5002C3 12.7763 3.22386 13.0002 3.5 13.0002H5.5C5.77614 13.0002 6 12.7763 6 12.5002V10.0002C6 9.17179 6.67157 8.50022 7.5 8.50022H8.5C9.32843 8.50022 10 9.17179 10 10.0002V12.5002C10 12.7763 10.2239 13.0002 10.5 13.0002H12.5C12.7761 13.0002 13 12.7763 13 12.5002V6.93094C13 6.79347 12.9434 6.66207 12.8435 6.56762L8 1.98828Z" fill="#3A2018"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Default design for dashboard
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

      {/* Center - Temperature and Driver State */}
      <div className="flex items-center gap-6">
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
              title={`Click to refresh temperature ${isUsingUserLocation ? '(using your location)' : '(using Limerick, Ireland)'}`}
            >
              Temperature: {temperature}
            </span>
          </div>
        )}

        {showDriverState && (
          <div className="flex justify-center items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="4" cy="4" r="4" fill={getDriverStateInfo(driverState).color}/>
            </svg>
            <span
              className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal cursor-pointer hover:text-blue-600"
              onClick={forceDriverStateSync}
              title="Click to refresh driver state"
            >
              {getDriverStateInfo(driverState).text}
            </span>
          </div>
        )}
      </div>

      {/* Right Side - Time + Battery */}
      <div className="flex justify-end items-center gap-2">
        <span className="text-[#3A2018] text-center font-inter text-sm font-semibold leading-normal">
          {formatTime(currentTime)}
        </span>

        {/* WiFi Icon */}
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.8323 7.38331C17.2417 7.7927 17.6285 8.2608 17.9653 8.74874C18.1222 8.97601 18.0651 9.28741 17.8378 9.44426C17.6105 9.60112 17.2991 9.54403 17.1423 9.31676C16.8391 8.87752 16.4908 8.45604 16.1252 8.09041C12.7621 4.72735 7.30951 4.72735 3.94644 8.09041C3.5982 8.43865 3.25362 8.86 2.93943 9.31289C2.78203 9.53978 2.4705 9.59611 2.24361 9.43871C2.01672 9.28131 1.96039 8.96978 2.11779 8.74289C2.46426 8.24347 2.84617 7.77647 3.23934 7.38331C6.99293 3.62972 13.0787 3.62972 16.8323 7.38331ZM14.5966 9.35675C15.0689 9.82908 15.4784 10.4028 15.7904 11.0128C15.9162 11.2587 15.8188 11.5599 15.5729 11.6856C15.3271 11.8114 15.0259 11.714 14.9001 11.4682C14.6343 10.9485 14.2857 10.46 13.8895 10.0639C11.7612 7.93552 8.31045 7.93552 6.18212 10.0639C5.76874 10.4772 5.43278 10.9422 5.17417 11.4535C5.04953 11.6999 4.74874 11.7986 4.50232 11.674C4.25591 11.5494 4.15719 11.2486 4.28183 11.0022C4.58807 10.3967 4.98645 9.84531 5.47501 9.35675C7.99387 6.83788 12.0778 6.83788 14.5966 9.35675ZM12.8876 11.8539C13.2419 12.2082 13.5338 12.644 13.737 13.1076C13.8478 13.3605 13.7326 13.6554 13.4797 13.7662C13.2268 13.8771 12.9319 13.7619 12.8211 13.509C12.6667 13.1567 12.4445 12.825 12.1805 12.561C10.996 11.3765 9.07559 11.3765 7.89109 12.561C7.62839 12.8237 7.41558 13.1429 7.26003 13.4984C7.14933 13.7514 6.85451 13.8668 6.60153 13.7561C6.34854 13.6454 6.23319 13.3506 6.34389 13.0976C6.54802 12.6311 6.83035 12.2075 7.18398 11.8539C8.759 10.2789 11.3126 10.2789 12.8876 11.8539ZM10.963 14.8284C11.1216 14.9871 11.1216 15.2394 10.963 15.398C10.8043 15.5566 10.552 15.5566 10.3934 15.398C10.2348 15.2394 10.2348 14.9871 10.3934 14.8284C10.552 14.6698 10.8043 14.6698 10.963 14.8284Z" fill="#242424"/>
        </svg>

        {/* Battery Icon */}
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.5 5C14.8807 5 16 6.11929 16 7.5V8.33333L17.1667 8.3356C17.3184 8.3356 17.4608 8.37619 17.5833 8.4471C17.8324 8.59119 18 8.86052 18 9.16894V10.8356C18 11.144 17.8324 11.4134 17.5833 11.5574C17.4608 11.6284 17.3184 11.6689 17.1667 11.6689L16 11.6667V12.5C16 13.8807 14.8807 15 13.5 15H4.5C3.11929 15 2 13.8807 2 12.5V7.5C2 6.11929 3.11929 5 4.5 5H13.5ZM13.75 5.94604H4.5C3.85025 5.94604 3.09484 6.44178 3.00822 7.07566L3 7.19604V12.6913C3 13.3385 3.49187 13.8709 4.12219 13.9349L4.25 13.9413H13.75C14.3972 13.9413 14.9295 13.4494 14.9935 12.8191L15 12.6913V7.19604C15 6.54883 14.5081 6.01651 13.8778 5.9525L13.75 5.94604ZM4.83436 6.94867H11.1646C11.5905 6.94867 11.9419 7.26736 11.9935 7.67926L12 7.78405V12.1107C12 12.5366 11.6813 12.888 11.2694 12.9395L11.1646 12.946H4.83436C4.40848 12.946 4.05704 12.6274 4.00549 12.2155L3.99898 12.1107V7.78405C3.99898 7.35818 4.31767 7.00673 4.72957 6.95518L4.83436 6.94867H11.1646H4.83436Z" fill="#242424"/>
        </svg>

        {/* Home Button */}
        {showHomeButton && (
          <button
            onClick={() => {
              // Stop any ongoing speech synthesis when going home
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                console.log('🔇 Stopped Melo speech synthesis on dashboard home navigation');
              }
              navigate('/dashboard');
            }}
            className="hover:scale-110 transition-transform duration-200 ml-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.5495 2.53189C11.3874 1.82531 12.6126 1.82531 13.4505 2.5319L20.2005 8.224C20.7074 8.65152 21 9.2809 21 9.94406L21 19.2539C21 20.2204 20.2165 21.0039 19.25 21.0039H15.75C14.7835 21.0039 14 20.2204 14 19.2539L14 14.2468C14 14.1088 13.8881 13.9968 13.75 13.9968H10.25C10.1119 13.9968 9.99999 14.1088 9.99999 14.2468L9.99999 19.2539C9.99999 20.2204 9.2165 21.0039 8.25 21.0039H4.75C3.7835 21.0039 3 20.2204 3 19.2539V9.94406C3 9.2809 3.29255 8.65152 3.79952 8.224L10.5495 2.53189ZM12.4835 3.6786C12.2042 3.44307 11.7958 3.44307 11.5165 3.6786L4.76651 9.37071C4.59752 9.51321 4.5 9.72301 4.5 9.94406L4.5 19.2539C4.5 19.392 4.61193 19.5039 4.75 19.5039H8.25C8.38807 19.5039 8.49999 19.392 8.49999 19.2539L8.49999 14.2468C8.49999 13.2803 9.2835 12.4968 10.25 12.4968H13.75C14.7165 12.4968 15.5 13.2803 15.5 14.2468L15.5 19.2539C15.5 19.392 15.6119 19.5039 15.75 19.5039H19.25C19.3881 19.5039 19.5 19.392 19.5 19.2539L19.5 9.94406C19.5 9.72301 19.4025 9.51321 19.2335 9.37071L12.4835 3.6786Z" fill="#242424"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
export type { WeatherCondition };
