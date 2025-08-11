import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import StatusBar, { WeatherCondition } from '../components/StatusBar';
import ComfortFace from '../components/ComfortFace';
import ShockFace from '../components/ShockFace';
import CuteFace from '../components/CuteFace';
import CryFace from '../components/CryFace';
import EnjoyFace from '../components/EnjoyFace';
import ACFace from '../components/ACFace';
import LightingFace from '../components/LightingFace';
import HappyFace from '../components/HappyFace';
import SadFace from '../components/SadFace';
import AlertFace from '../components/AlertFace';
import YesPermissionFace from '../components/YesPermissionFace';
import NoPermissionFace from '../components/NoPermissionFace';
import MusicFace from '../components/MusicFace';
import HotFace from '../components/HotFace';
import BreathingFace from '../components/BreathingFace';
import { carStateManager } from '../services/carStateManager';

interface Message {
  id: string;
  text: string;
  type: 'bot' | 'user';
  timestamp: Date;
  isTyping?: boolean;
}

const AIChatbot = () => {
  const [isListening, setIsListening] = useState(false); // Start in default state, not listening
  const [userWantsListening, setUserWantsListening] = useState(false); // Track user's intent to listen
  const [isWakeWordListening, setIsWakeWordListening] = useState(true); // Always listening for "Hey Melo"
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<string | null>('20°C'); // Initialize with current Limerick temperature
  const [temperatureTriggered, setTemperatureTriggered] = useState<boolean>(false);
  const [awaitingACPermission, setAwaitingACPermission] = useState<boolean>(false);
  const [currentWeatherCondition, setCurrentWeatherCondition] = useState<WeatherCondition | null>(null);
  const [awaitingWeatherPermission, setAwaitingWeatherPermission] = useState<boolean>(false);
  const [weatherTriggered, setWeatherTriggered] = useState<boolean>(false);
  const [focusModeStartTime, setFocusModeStartTime] = useState<number | null>(null);
  const [awaitingBreathingPermission, setAwaitingBreathingPermission] = useState<boolean>(false);
  const [isBreathingExercise, setIsBreathingExercise] = useState<boolean>(false);
  const [breathingStep, setBreathingStep] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingCount, setBreathingCount] = useState<number>(0);
  const [focusTriggered, setFocusTriggered] = useState<boolean>(false);

  // Emotional emoji states
  const [showComfortEmoji, setShowComfortEmoji] = useState(false);
  const [showShockEmoji, setShowShockEmoji] = useState(false);
  const [showCuteEmoji, setShowCuteEmoji] = useState(false);
  const [showCryEmoji, setShowCryEmoji] = useState(false);
  const [showEnjoyEmoji, setShowEnjoyEmoji] = useState(false);
  const [showACEmoji, setShowACEmoji] = useState(false);
  const [showLightingEmoji, setShowLightingEmoji] = useState(false);
  const [showHappyEmoji, setShowHappyEmoji] = useState(false);
  const [showSadEmoji, setShowSadEmoji] = useState(false);

  // New scenario-specific emoji states
  const [showAlertEmoji, setShowAlertEmoji] = useState(false);
  const [showYesPermissionEmoji, setShowYesPermissionEmoji] = useState(false);
  const [showNoPermissionEmoji, setShowNoPermissionEmoji] = useState(false);
  const [showMusicEmoji, setShowMusicEmoji] = useState(false);
  const [showHotEmoji, setShowHotEmoji] = useState(false);
  const [showBreathingEmoji, setShowBreathingEmoji] = useState(false);

  // Alert system states
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [alertTriggered, setAlertTriggered] = useState<{[key: string]: boolean}>({});

  // Microphone status
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'available' | 'permission-denied' | 'not-supported'>('unknown');

  // Wellness features - REMOVED
  // const [isBreathingActive, setIsBreathingActive] = useState(false);
  // const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  // const [breathingCount, setBreathingCount] = useState(0);
  // const [isMeditationActive, setIsMeditationActive] = useState(false);
  // const [meditationTimer, setMeditationTimer] = useState(0);
  // const [wellnessMode, setWellnessMode] = useState<'none' | 'breathing' | 'meditation'>('none');

  // Car control features
  const [acTemperature, setAcTemperature] = useState(22); // Default 22°C
  const [isAcOn, setIsAcOn] = useState(false);
  const [isHeatingOn, setIsHeatingOn] = useState(false);
  const [seatHeating, setSeatHeating] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);
  const [lightsOn, setLightsOn] = useState(false);
  // Clear any saved conversation and use clean Figma design
  const [messages, setMessages] = useState<Message[]>(() => {
    // Clear any existing conversation history for fresh start
    localStorage.removeItem('ai-chatbot-history');

    // Return clean default conversation with only Melo's greeting
    return [
      {
        id: '1',
        text: "Hello, I'm Melo, your co-driver assistant. How can I help make your drive better?",
        type: 'bot',
        timestamp: new Date()
      }
    ];
  });

  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save conversation history to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem('ai-chatbot-history', JSON.stringify(messages));
      console.log('💾 Conversation history saved to localStorage');
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }, [messages]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Initial voice greeting
  useEffect(() => {
    // Speak the initial greeting when component loads
    const timer = setTimeout(() => {
      speakText("Hello, I am Melo, your co-driver assistant. How can I help make your drive better?");
    }, 1000); // Small delay to ensure everything is loaded

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Check if arrived due to stress detection and offer music therapy
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isStressNavigation = urlParams.get('stress') === 'true';
    const isWeatherNavigation = urlParams.get('weather') === 'extreme';

    if (isStressNavigation) {
      console.log('🚨 Arrived at AI chatbot due to stress detection');

      // Clear the stress parameter from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Wait a bit for initial greeting, then add stress support message
      setTimeout(() => {
        const stressMessage = {
          id: Date.now().toString() + '_stress_support',
          text: "I noticed your stress levels are elevated. Would you like me to play some calming music to help you relax? Music therapy can really help reduce stress while driving.",
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, stressMessage]);

        // Show comfort emoji for stress support
        setShowComfortEmoji(true);
        setTimeout(() => setShowComfortEmoji(false), 3000);

        // Speak the stress support message
        speakText("I noticed your stress levels are elevated. Would you like me to play some calming music to help you relax?");
      }, 3000); // Wait for initial greeting to finish
    }

    if (isWeatherNavigation) {
      console.log('⚠️ Arrived at AI chatbot due to extreme weather detection');

      // Clear the weather parameter from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Wait a bit for initial greeting, then add weather alert message
      setTimeout(() => {
        const weatherMessage = {
          id: Date.now().toString() + '_weather_alert_nav',
          text: "I detected extreme weather conditions that require immediate attention for your safety. I'm here to help you navigate these dangerous conditions safely.",
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, weatherMessage]);

        // Show shock emoji for weather alert
        setShowShockEmoji(true);
        setTimeout(() => setShowShockEmoji(false), 4000);

        // Speak the weather alert message
        speakText("I detected extreme weather conditions that require immediate attention for your safety. I'm here to help you navigate these dangerous conditions safely.");
      }, 3000); // Wait for initial greeting to finish
    }

    const isFocusNavigation = urlParams.get('focus') === 'true';
    if (isFocusNavigation) {
      console.log('🧘 Arrived at AI chatbot due to focus mode detection');

      // Clear the focus parameter from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Wait a bit for initial greeting, then add focus message
      setTimeout(() => {
        const focusMessage = {
          id: Date.now().toString() + '_focus_alert_nav',
          text: "I noticed you've been in focused driving mode for 5 minutes. Prolonged concentration can be tiring. Would you like me to guide you through a quick breathing exercise to help you stay relaxed and alert?",
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, focusMessage]);

        // Set state for breathing permission
        setAwaitingBreathingPermission(true);
        setFocusTriggered(true);

        // Show comfort emoji for focus support
        setShowComfortEmoji(true);
        setTimeout(() => setShowComfortEmoji(false), 4000);

        // Speak the focus message
        speakText("I noticed you've been in focused driving mode for 5 minutes. Would you like me to guide you through a quick breathing exercise to help you stay relaxed and alert?");
      }, 3000); // Wait for initial greeting to finish
    }
  }, []); // Only run once on mount

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
      console.log('🌡️ Temperature updated for Limerick area:', `${temp}°C`);

      // Weather alerts disabled - only shown when user mentions weather conditions via voice
      // checkWeatherAlerts(data);

    } catch (error) {
      console.error('❌ Weather API error:', error);
      // Fallback to current Limerick temperature
      setTemperature('15°C');
      console.log('��️ Using fallback Limerick temperature: 15°C');
    }
  };

  // Get user's current location with improved error handling
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          console.log('✅ Location acquired:', location.lat, location.lng);

          // Fetch weather for the current location
          fetchWeather(location.lat, location.lng);
        },
        (error) => {
          let errorMessage = '';
          let userFriendlyMessage = '';

          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user. Navigation features will be limited.';
              userFriendlyMessage = 'To enable navigation features, please allow location access when prompted or check your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Check your device settings.';
              userFriendlyMessage = 'Having trouble getting your location. Please check your device GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Retrying...';
              userFriendlyMessage = 'Taking a moment to find your location...';
              // Retry with less strict settings
              setTimeout(() => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const location = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    };
                    setCurrentLocation(location);
                    console.log('✅ Location acquired on retry:', location.lat, location.lng);

                    // Fetch weather for the current location
                    fetchWeather(location.lat, location.lng);
                  },
                  (retryError) => {
                    console.error('�� Location retry failed:', retryError.message);
                    // Don't add automatic location messages to keep UI clean
                    console.log('Location retry failed, but keeping UI clean');
                  },
                  { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
                );
              }, 2000);
              break;
            default:
              errorMessage = `Location error: ${error.message || 'Unknown error'}`;
              userFriendlyMessage = 'Having some location issues, but I can still help you in other ways!';
              break;
          }

          console.log('📍 Location access:', errorMessage);
          // Only log detailed error info for unexpected errors, not user permission denials
          if (error.code !== error.PERMISSION_DENIED) {
            console.log('Location error details:', {
              code: error.code,
              message: error.message || 'No message provided'
            });
          }

          // Fallback to Limerick weather when location is not available
          console.log('💡 Using default location (Limerick) for weather and navigation features');
          fetchWeather(52.6638, -8.6267); // Limerick coordinates
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      console.error('❌ Geolocation is not supported by this browser');
      // Fallback to Limerick weather when geolocation is not supported
      fetchWeather(52.6638, -8.6267); // Limerick coordinates
    }
  }, []);

  // Listen for car state changes from dashboard to show emojis
  useEffect(() => {
    let previousState = carStateManager.getState();

    const unsubscribe = carStateManager.subscribe((newState) => {
      // Check if AC was turned on
      if (!previousState.isAcOn && newState.isAcOn) {
        console.log('❄️ AC turned on from dashboard - showing AC emoji');
        setShowACEmoji(true);
        setTimeout(() => setShowACEmoji(false), 3000);

        // Add message to chat
        const acMessage = {
          id: Date.now().toString() + '_ac',
          text: `���� Air conditioner turned on at ${newState.acTemperature}°C from dashboard. Staying cool!`,
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, acMessage]);
      }

      // Check if lights were turned on
      if (!previousState.lightsOn && newState.lightsOn) {
        console.log('💡 Lights turned on from dashboard - showing lighting emoji');
        setShowLightingEmoji(true);
        setTimeout(() => setShowLightingEmoji(false), 3000);

        // Add message to chat
        const lightMessage = {
          id: Date.now().toString() + '_lights',
          text: "💡 Lights turned on from dashboard. Better visibility for safe driving!",
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, lightMessage]);
      }

      // Check if driver state changed to stressed while in chatbot
      if (previousState.driverState !== 'stressed' && newState.driverState === 'stressed') {
        console.log('🚨 Stress detected while in AI chatbot - offering music therapy');

        // Show comfort emoji for stress support
        setShowComfortEmoji(true);
        setTimeout(() => setShowComfortEmoji(false), 3000);

        // Add proactive stress support message
        const stressMessage = {
          id: Date.now().toString() + '_stress_detected',
          text: "I'm detecting elevated stress levels. Would you like me to play some calming music or guide you through a breathing exercise? Music therapy can really help you feel more relaxed.",
          type: 'bot' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, stressMessage]);

        // Speak the stress support message
        setTimeout(() => {
          speakText("I'm detecting elevated stress levels. Would you like some calming music or a breathing exercise?");
        }, 1000);
      }

      // Monitor focus mode duration
      if (newState.driverState === 'focused') {
        if (focusModeStartTime === null) {
          // Start tracking focus mode
          setFocusModeStartTime(Date.now());
          console.log('🎯 Focus mode started - tracking duration');
        } else {
          // Check if focus mode has been active for 5 minutes
          const focusDuration = (Date.now() - focusModeStartTime) / (1000 * 60); // minutes
          if (focusDuration >= 5 && !focusTriggered) {
            console.log('���� Focus mode active for 5 minutes - triggering breathing exercise offer');
            handleFocusMode();
          }
        }
      } else {
        // Reset focus mode tracking if state changes
        if (focusModeStartTime !== null) {
          console.log('🎯 Focus mode ended - resetting timer');
          setFocusModeStartTime(null);
          setFocusTriggered(false);
        }
      }

      previousState = newState;
    });

    return unsubscribe;
  }, []);

  // Reset all emoji states and temperature triggers on component mount
  useEffect(() => {
    setShowComfortEmoji(false);
    setShowShockEmoji(false);
    setShowCuteEmoji(false);
    setShowCryEmoji(false);
    setShowEnjoyEmoji(false);
    setShowACEmoji(false);
    setShowLightingEmoji(false);
    setShowHappyEmoji(false);
    setShowSadEmoji(false);
    setShowAlertEmoji(false);
    setShowYesPermissionEmoji(false);
    setShowNoPermissionEmoji(false);
    setShowMusicEmoji(false);
    setShowHotEmoji(false);
    setShowBreathingEmoji(false);

    // Reset temperature and weather triggered states for clean start
    setTemperatureTriggered(false);
    setWeatherTriggered(false);
    setAwaitingACPermission(false);
    setAwaitingWeatherPermission(false);
    console.log('🌡️ Reset temperature and weather trigger states');
  }, []);

  // Automatic driving condition monitoring disabled - alerts only shown when user mentions conditions via voice
  // useEffect(() => {
  //   const monitoringInterval = setInterval(() => {
  //     monitorDrivingConditions();
  //   }, 60000); // Check every minute

  //   // Initial check
  //   monitorDrivingConditions();

  //   return () => clearInterval(monitoringInterval);
  // }, [alertTriggered]);

  // Breathing exercise and meditation functions - REMOVED
  // These wellness features have been removed as requested

  // Handle temperature exceeding 35��C
  const handleTemperatureExceed = (temp: number) => {
    console.log(`🌡️ Temperature alert triggered with: ${temp}°C, Status bar shows: ${temperature}`);
    if (temperatureTriggered) {
      console.log('🌡️ Temperature alert already triggered, skipping');
      return; // Prevent multiple triggers
    }

    setTemperatureTriggered(true);
    setAwaitingACPermission(true);

    // Show hot emoji first, then AC emoji
    setShowHotEmoji(true);
    setTimeout(() => {
      setShowHotEmoji(false);
      setShowACEmoji(true);
      setTimeout(() => setShowACEmoji(false), 3000);
    }, 3000);

    // Add AI message asking for permission
    const permissionMessage: Message = {
      id: Date.now().toString() + '_temp_trigger',
      text: `I've detected the temperature is ${temp}°C - quite hot! Would you want me to set the air conditioner on?`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, permissionMessage]);

    // Speak the message
    speakText(`It's ${temp} degrees outside - quite hot! Would you want me to set the air conditioner on?`);
  };

  // Handle extreme weather conditions
  const handleExtremeWeather = (weather: WeatherCondition) => {
    if (weatherTriggered) return; // Prevent multiple triggers

    setWeatherTriggered(true);
    setCurrentWeatherCondition(weather);
    setAwaitingWeatherPermission(true);

    // Navigate to AI chatbot if not already there
    if (window.location.pathname !== '/ai-chatbot') {
      console.log('⚠️ Navigating to AI chatbot due to extreme weather');
      window.location.href = '/ai-chatbot?weather=extreme';
      return;
    }

    // Generate weather-specific message and recommendation
    let message = '';
    let recommendation = '';

    if (weather.condition.includes('snow') || weather.condition.includes('blizzard')) {
      message = `I've detected ${weather.description} with ${weather.temp}°C temperature. Driving conditions are dangerous!`;
      recommendation = 'Should I reduce your vehicle speed by 6-7 km/h for safer driving in these snowy conditions?';
    } else if (weather.condition.includes('fog') || weather.condition.includes('mist') || weather.visibility < 1000) {
      message = `I've detected ${weather.description} with visibility at ${weather.visibility}m. This is very dangerous for driving!`;
      recommendation = 'Should I activate autodrive assistance to help navigate safely through this low visibility?';
    } else if (weather.condition.includes('thunderstorm') || weather.windSpeed > 15) {
      message = `I've detected ${weather.description} with ${weather.windSpeed}m/s winds. Severe weather conditions ahead!`;
      recommendation = 'Should I suggest finding a safe place to pull over until this storm passes?';
    } else if (weather.temp <= -5) {
      message = `I've detected extremely cold conditions at ${weather.temp}°C. Road ice is likely!`;
      recommendation = 'Should I reduce speed and increase following distance for icy road conditions?';
    } else {
      message = `I've detected extreme weather: ${weather.description}. Please drive with extra caution!`;
      recommendation = 'Should I provide enhanced safety monitoring for these conditions?';
    }

    // Show warning emoji
    setShowShockEmoji(true);
    setTimeout(() => setShowShockEmoji(false), 4000);

    // Add AI message with warning and recommendation
    const weatherMessage: Message = {
      id: Date.now().toString() + '_weather_alert',
      text: `⚠️ WEATHER ALERT: ${message} ${recommendation}`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, weatherMessage]);

    // Speak the warning
    speakText(`Weather alert! ${message} ${recommendation}`);
  };

  // Handle focus mode detection (5 minutes)
  const handleFocusMode = () => {
    if (focusTriggered) return; // Prevent multiple triggers

    setFocusTriggered(true);
    setAwaitingBreathingPermission(true);

    // Navigate to AI chatbot if not already there
    if (window.location.pathname !== '/ai-chatbot') {
      console.log('🧘 Navigating to AI chatbot due to prolonged focus mode');
      window.location.href = '/ai-chatbot?focus=true';
      return;
    }

    // Show focus emoji
    setShowComfortEmoji(true);
    setTimeout(() => setShowComfortEmoji(false), 4000);

    // Add AI message asking about breathing exercise
    const focusMessage: Message = {
      id: Date.now().toString() + '_focus_trigger',
      text: "I notice you've been in focused driving mode for 5 minutes. Prolonged concentration can be tiring. Would you like me to guide you through a quick breathing exercise to help you stay relaxed and alert?",
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, focusMessage]);

    // Speak the message
    speakText("I notice you've been in focused driving mode for 5 minutes. Would you like me to guide you through a quick breathing exercise to help you stay relaxed and alert?");
  };

  // Voice-guided breathing exercise
  const startBreathingExercise = () => {
    setIsBreathingExercise(true);
    setBreathingStep('inhale');
    setBreathingCount(0);

    const breathingMessage: Message = {
      id: Date.now().toString() + '_breathing_start',
      text: "Perfect! Let's do a simple 4-7-8 breathing exercise. I'll guide you through it with voice commands. Stay focused on the road while you breathe.",
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, breathingMessage]);

    speakText("Perfect! Let's do a simple 4-7-8 breathing exercise. I'll guide you through it with voice commands. Stay focused on the road while you breathe.");

    // Start the breathing cycle after a short delay
    setTimeout(() => {
      performBreathingCycle();
    }, 3000);
  };

  // Perform breathing exercise cycle
  const performBreathingCycle = () => {
    if (breathingCount >= 4) { // 4 complete cycles
      setIsBreathingExercise(false);
      setBreathingCount(0);

      const completionMessage: Message = {
        id: Date.now().toString() + '_breathing_complete',
        text: "Excellent work! You've completed the breathing exercise. You should feel more relaxed and alert now. Keep driving safely!",
        type: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, completionMessage]);

      speakText("Excellent work! You've completed the breathing exercise. You should feel more relaxed and alert now. Keep driving safely!");
      return;
    }

    const cycleNumber = breathingCount + 1;

    // Inhale phase (4 seconds)
    setBreathingStep('inhale');
    speakText(`Cycle ${cycleNumber}. Breathe in slowly through your nose for 4 seconds. Inhale... 2... 3... 4.`);

    setTimeout(() => {
      // Hold phase (7 seconds)
      setBreathingStep('hold');
      speakText("Now hold your breath for 7 seconds. Hold... 2... 3... 4... 5... 6... 7.");

      setTimeout(() => {
        // Exhale phase (8 seconds)
        setBreathingStep('exhale');
        speakText("Now exhale slowly through your mouth for 8 seconds. Exhale... 2... 3... 4... 5... 6... 7... 8.");

        setTimeout(() => {
          setBreathingCount(prev => prev + 1);

          if (breathingCount + 1 < 4) {
            setTimeout(() => {
              performBreathingCycle();
            }, 2000); // Pause between cycles
          } else {
            performBreathingCycle(); // Complete the exercise
          }
        }, 9000); // 8 seconds exhale + 1 second buffer
      }, 8000); // 7 seconds hold + 1 second buffer
    }, 5000); // 4 seconds inhale + 1 second buffer
  };

  // Car control functions with global state
  const setAirConditioner = (temp: number, turnOn: boolean = true) => {
    // Update local state
    setAcTemperature(temp);
    setIsAcOn(turnOn);

    // Update global state that persists across pages
    carStateManager.setAirConditioner(temp, turnOn);

    // Show AC emoji when turned on
    if (turnOn) {
      setShowACEmoji(true);
      setTimeout(() => setShowACEmoji(false), 3000);
    }

    const controlMessage: Message = {
      id: Date.now().toString() + '_ac_control',
      text: turnOn ?
        `❄️ Air conditioner set to ${temp}°C. You should feel more comfortable soon!` :
        `Air conditioner turned off. Let me know if you need any other adjustments.`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, controlMessage]);

    speakText(turnOn ?
      `Air conditioning set to ${temp} degrees Celsius` :
      `Air conditioning turned off`
    );
  };

  const controlHeating = (turnOn: boolean) => {
    setIsHeatingOn(turnOn);

    const heatingMessage: Message = {
      id: Date.now().toString() + '_heating_control',
      text: turnOn ?
        `Heating turned on. You'll warm up soon!` :
        `Heating turned off.`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, heatingMessage]);

    speakText(turnOn ? `Heating turned on` : `Heating turned off`);
  };

  const controlSeatHeating = (turnOn: boolean) => {
    setSeatHeating(turnOn);

    const seatMessage: Message = {
      id: Date.now().toString() + '_seat_control',
      text: turnOn ?
        `Seat heating activated. You'll feel warmer in a moment!` :
        `Seat heating turned off.`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, seatMessage]);

    speakText(turnOn ? `Seat heating on` : `Seat heating off`);
  };

  const adjustVolume = (volume: number) => {
    setMusicVolume(Math.max(0, Math.min(100, volume)));

    const volumeMessage: Message = {
      id: Date.now().toString() + '_volume_control',
      text: `Music volume set to ${volume}%. Enjoy your drive!`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, volumeMessage]);

    speakText(`Volume set to ${volume} percent`);
  };

  const controlLights = (turnOn: boolean) => {
    // Update local state
    setLightsOn(turnOn);

    // Update global state that persists across pages
    carStateManager.setLights(turnOn);

    // Show lighting emoji when turned on
    if (turnOn) {
      setShowLightingEmoji(true);
      setTimeout(() => setShowLightingEmoji(false), 3000);
    }

    const lightsMessage: Message = {
      id: Date.now().toString() + '_lights_control',
      text: turnOn ?
        `💡 Lights turned on for better visibility.` :
        `Lights turned off.`,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, lightsMessage]);

    speakText(turnOn ? `Lights on` : `Lights off`);
  };

  // Comprehensive Alert System for Driving Risks
  const triggerAlert = (alertType: string, message: string, emojiDuration: number = 4000) => {
    if (alertTriggered[alertType]) return; // Prevent multiple triggers

    setAlertTriggered(prev => ({ ...prev, [alertType]: true }));
    setActiveAlert(alertType);

    // Show appropriate emoji based on alert type
    setShowShockEmoji(true);
    setTimeout(() => setShowShockEmoji(false), emojiDuration);

    // Add alert message
    const alertMessage: Message = {
      id: Date.now().toString() + `_${alertType}_alert`,
      text: message,
      type: 'bot',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, alertMessage]);

    // Speak the alert
    speakText(message);

    // Clear active alert after speaking
    setTimeout(() => {
      setActiveAlert(null);
    }, emojiDuration + 2000);
  };

  // Specific alert triggers
  const triggerIceRiskAlert = () => {
    triggerAlert('iceRisk',
      '���� ICE RISK: Near-freezing temperatures! Watch for black ice on bridges and shaded areas. Drive very carefully.',
      5000
    );
  };

  const triggerHighWindAlert = (windSpeed: number) => {
    triggerAlert('highWind',
      `💨 HIGH WIND WARNING: Strong crosswinds detected at ${windSpeed} m/s! Grip steering wheel firmly, especially when passing trucks.`,
      5000
    );
  };

  const triggerFogAlert = (visibility: number) => {
    triggerAlert('fogAlert',
      `🌫️ FOG ALERT: Low visibility at ${visibility}m! Use fog lights, reduce speed significantly, and avoid lane changes.`,
      5000
    );
  };

  const triggerRainAlert = () => {
    triggerAlert('rainAlert',
      '🌧️ RAIN ALERT: Wet roads ahead! Reduce speed by 10-15 mph and increase following distance. Turn on headlights.',
      4000
    );
  };

  const triggerFatigueRiskAlert = () => {
    triggerAlert('fatigueRisk',
      '😴 FATIGUE RISK: Peak drowsiness hours! Consider rest stops every hour. Don\'t fight sleepiness - pull over safely.',
      5000
    );
  };

  const triggerRushHourAlert = () => {
    triggerAlert('rushHour',
      '🚗 RUSH HOUR: Heavy traffic expected! Allow extra time and stay calm. Consider alternate routes.',
      4000
    );
  };

  // Enhanced alert monitoring system - DISABLED (alerts only shown when user says test commands)
  const monitorDrivingConditions = () => {
    // All automatic time-based alerts disabled - only triggered by test commands
    return;
  };

  // Weather-based alert integration - DISABLED (alerts only shown when user says test commands)
  const checkWeatherAlerts = (weatherData: any) => {
    // All automatic weather alerts disabled - only triggered by test commands
    return;
  };

  // Enhanced navigation with real-time safety and danger warnings
  const checkRoadSafety = async (lat: number, lng: number): Promise<string[]> => {
    const warnings: string[] = [];
    
    try {
      // Check weather conditions for safety warnings
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (apiKey && apiKey !== 'your-openweather-api-key') {
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
        );
        
        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json();
          const condition = weatherData.weather[0].main.toLowerCase();
          const visibility = weatherData.visibility;
          const windSpeed = weatherData.wind?.speed || 0;
          
          // Weather-based danger warnings
          if (condition.includes('rain') || condition.includes('storm')) {
            warnings.push("⚠️ RAIN ALERT: Wet roads ahead! Reduce speed by 10-15 mph and increase following distance. Turn on headlights.");
          }
          
          if (condition.includes('snow') || condition.includes('blizzard')) {
            warnings.push("❄️ SNOW WARNING: Dangerous driving conditions! Consider winter tires, drive slowly, and keep emergency kit ready.");
          }
          
          if (condition.includes('fog') || visibility < 1000) {
            warnings.push("🌫️ FOG ALERT: Low visibility! Use fog lights, reduce speed significantly, and avoid lane changes.");
          }
          
          if (windSpeed > 15) {
            warnings.push("💨 HIGH WIND WARNING: Strong crosswinds detected! Grip steering wheel firmly, especially when passing trucks.");
          }
          
          if (weatherData.main.temp < 2) {
            warnings.push("🧊 ICE RISK: Near-freezing temperatures! Watch for black ice on bridges and shaded areas. Drive very carefully.");
          }
        }
      }
      
      // Simulate traffic incident warnings (in real app, would use traffic APIs)
      const currentHour = new Date().getHours();
      const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
      
      if (isRushHour) {
        warnings.push("🚦 RUSH HOUR: Heavy traffic expected! Allow extra time and stay calm. Consider alternate routes.");
      }
      
      // Weekend/holiday warnings
      const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
      if (isWeekend && currentHour >= 10 && currentHour <= 14) {
        warnings.push("🛍️ WEEKEND TRAFFIC: Shopping areas congested! Expect delays near malls and popular destinations.");
      }
      
      // Time-based safety warnings
      if (currentHour >= 22 || currentHour <= 5) {
        warnings.push("🌙 NIGHT DRIVING: Reduced visibility and drowsy drivers! Stay extra alert and use high beams when appropriate.");
      }
      
      // Fatigue warnings based on time
      if (currentHour >= 2 && currentHour <= 6) {
        warnings.push("😴 FATIGUE RISK: Peak drowsiness hours! Consider rest stops every hour. Don't fight sleepiness - pull over safely.");
      }
      
    } catch (error) {
      console.error('Road safety check failed:', error);
      warnings.push("⚠️ Unable to get real-time conditions. Drive cautiously and stay alert!");
    }
    
    return warnings;
  };

  // Enhanced location services with safety integration
  const findNearbyPlaces = async (placeType: string): Promise<string> => {
    if (!currentLocation) {
      return "I need your location to find nearby places. Please allow location access in your browser settings.";
    }

    // Get safety warnings for current location
    const safetyWarnings = await checkRoadSafety(currentLocation.lat, currentLocation.lng);
    
    // Enhanced location-based responses with safety context
    const locationResponses = {
      'gas station': [
        `I found 3 gas stations nearby! The closest Shell station is 0.8 miles ahead on your right with current gas prices at $3.45/gallon. There's also a BP station 1.2 miles away with a convenience store.`,
        `Great! There's a Chevron station just 0.5 miles ahead with competitive prices. I also see an Exxon station 1.1 miles away that's open 24/7 if you need it later.`,
        `I found several options! The nearest station is a Mobil just 0.6 miles away. For the best prices, there's a Costco gas station 2.1 miles ahead that's usually cheaper.`
      ],
      'restaurant': [
        `I found some great dining options! There's "The Roadside Diner" 1.2 miles ahead with 4.5 stars - they're famous for their burgers. Also "Mama's Kitchen" 1.8 miles away specializes in comfort food.`,
        `Perfect timing! "Highway Grill" is just 0.9 miles ahead and highly rated for steaks. There's also a family-friendly "Country Kitchen" 1.5 miles away with great reviews.`,
        `I see several options! "Traveler's Rest Cafe" is 1.1 miles ahead with excellent coffee and sandwiches. For something fancier, "Vista Restaurant" is 2.3 miles away with amazing views.`
      ],
      'coffee': [
        `Coffee coming up! There's a Starbucks 0.7 miles ahead in a shopping center. I also found "Local Bean Cafe" 1.3 miles away - they roast their own beans and have great reviews!`,
        `Perfect! "Highway Coffee Co." is just 0.5 miles ahead and they have drive-through service. There's also a Dunkin' Donuts 1.4 miles away if you prefer that.`,
        `Great choice! "Mountain View Coffee" is 1.0 miles ahead with outdoor seating and excellent lattes. They also have fresh pastries if you're hungry.`
      ],
      'hotel': [
        `I found several accommodation options! "Comfort Inn & Suites" is 2.1 miles ahead with great reviews and includes breakfast. "Highway Lodge" is 3.2 miles away and more budget-friendly.`,
        `There are good options nearby! "Best Western Plus" is 1.8 miles ahead with a pool and fitness center. For luxury, "Grand Hotel" is 4.1 miles away with spa services.`,
        `Perfect! "Travelers Inn" is just 1.5 miles ahead with clean rooms and free WiFi. "Mountain View Hotel" is 2.7 miles away with beautiful scenic views.`
      ],
      'hospital': [
        `The nearest hospital is Regional Medical Center, 3.2 miles northeast with a 24-hour emergency room. They have excellent trauma care and I can guide you there if needed.`,
        `St. Mary's Hospital is 2.8 miles ahead with emergency services. There's also an urgent care clinic just 1.4 miles away if it's not a serious emergency.`,
        `Emergency services: City General Hospital is 4.1 miles away with full emergency care. For urgent but non-emergency needs, there's a walk-in clinic 1.9 miles ahead.`
      ],
      'pharmacy': [
        `I found pharmacy options! CVS Pharmacy is 1.1 miles ahead and open until 10 PM. Walgreens is 1.6 miles away and they have a 24-hour location.`,
        `There's a Rite Aid pharmacy 0.9 miles ahead with a drive-through for prescriptions. Also, Target Pharmacy is 2.1 miles away if you need other items too.`,
        `Good news! "Community Pharmacy" is just 0.7 miles ahead - they're locally owned with personalized service. CVS is also 1.8 miles away for convenience.`
      ],
      'rest area': [
        `I found safe rest areas! There's a clean rest stop 2.1 miles ahead with restrooms, picnic tables, and vending machines. Perfect for a break!`,
        `Great timing! There's a truck stop 1.8 miles ahead with facilities, food court, and fuel. Also a scenic overlook rest area 3.2 miles away.`,
        `Perfect for a break! Rest area with facilities is 1.5 miles ahead. There's also a welcome center 2.7 miles away with tourist information.`
      ]
    };

    const responses = locationResponses[placeType.toLowerCase()] || [
      `I found several ${placeType} locations within 2-3 miles of your current position. Would you like me to guide you to the closest one?`
    ];

    let result = responses[Math.floor(Math.random() * responses.length)];
    
    // Add safety warnings if any exist
    if (safetyWarnings.length > 0) {
      result += `\n\n🚨 SAFETY ALERTS:\n${safetyWarnings.join('\n')}`;
    }
    
    return result;
  };

  // Enhanced Google Maps API functions with safety integration
  const searchNearbyPlaces = async (query: string, type: string = ''): Promise<string> => {
    if (!currentLocation) {
      return "I need your location to help with navigation. Please allow location access in your browser settings.";
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      console.warn('⚠️ Google Maps API key not configured');
      return `I'd love to help you find ${query}, but I need my navigation system configured. For now, I can still provide directions and emotional support!`;
    }

    try {
      // Note: Direct API calls from browser may have CORS issues
      // In production, this should go through a backend proxy
      console.log(`���� Searching for ${query} near location:`, currentLocation);

      // Simulate location-based response for now
      const responses = {
        'gas': `I found several gas stations within 2 miles! The closest Shell station has good reviews and competitive prices. It should be just ahead on your right.`,
        'restaurant': `There's a highly-rated restaurant called "The Local Bistro" about 1.5 miles away. They have great reviews for comfort food. Want me to guide you there?`,
        'coffee': `Perfect! There's a cozy coffee shop called "Bean There" just 0.8 miles ahead. They're known for excellent lattes and free WiFi.`,
        'hospital': `The nearest hospital is Regional Medical Center, about 3.2 miles north. It has a 24-hour emergency room. Do you need me to call ahead?`,
        'pharmacy': `There's a CVS pharmacy 1.1 miles away that's open until 10 PM tonight. They should have what you need!`
      };

      const placeType = type.toLowerCase() || query.toLowerCase();
      for (const [key, response] of Object.entries(responses)) {
        if (placeType.includes(key)) {
          return response;
        }
      }

      return `I'm working on finding ${query} for you! Based on your location, there should be options within a few miles. Would you like me to guide you to the nearest one?`;

    } catch (error) {
      console.error('❌ Places search error:', error);
      return `I'm having some technical difficulties with location services, but I'm still here to support you emotionally and help however I can!`;
    }
  };

  const getDirections = async (destination: string): Promise<string> => {
    if (!currentLocation) {
      return "I need your current location to provide directions. Please enable location access in your browser settings.";
    }

    // Get safety warnings for current location and route
    const safetyWarnings = await checkRoadSafety(currentLocation.lat, currentLocation.lng);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      console.warn('⚠�� Google Maps API key not configured');
      
      // Enhanced fallback with safety information
      const estimatedTime = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
      const estimatedDistance = Math.floor(Math.random() * 20) + 5; // 5-25 miles
      
      let safetyAdvice = "";
      if (safetyWarnings.length > 0) {
        safetyAdvice = `\n\n🚨 ROUTE SAFETY ALERTS:\n${safetyWarnings.join('\n')}\n\n��� SAFETY TIPS:\n`;
        safetyAdvice += "• Check your fuel level before departure\n";
        safetyAdvice += "• Keep emergency kit in car (water, snacks, blanket)\n";
        safetyAdvice += "�� Share your route with someone\n";
        safetyAdvice += "• Take breaks every 2 hours for long trips\n";
        safetyAdvice += "��� Keep phone charged for navigation";
      }
      
      return `I'd love to guide you to ${destination}, but I need my navigation system set up. Estimated ${estimatedTime} minutes (${estimatedDistance} miles). For now, use your phone's GPS and I'll provide safety support!${safetyAdvice}`;
    }

    try {
      console.log(`🧭 Getting directions to ${destination} from:`, currentLocation);

      // Enhanced route analysis with danger detection
      const estimatedTime = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
      const estimatedDistance = Math.floor(Math.random() * 20) + 5; // 5-25 miles
      
      // Route-specific danger analysis
      const routeDangers: string[] = [];
      
      // Simulate route hazard detection
      if (Math.random() > 0.7) {
        routeDangers.push("�� CONSTRUCTION ZONE: Lane closures ahead at mile marker 12. Expect 10-15 minute delays.");
      }
      
      if (Math.random() > 0.8) {
        routeDangers.push("🦌 WILDLIFE CROSSING: Deer active in this area, especially dawn/dusk. Reduce speed and stay alert.");
      }
      
      if (Math.random() > 0.6) {
        routeDangers.push("�� DEAD ZONE: Limited cell service for 5-mile stretch. Download offline maps as backup.");
      }
      
      if (Math.random() > 0.75) {
        routeDangers.push("⛽ FUEL WARNING: Limited gas stations for next 25 miles. Consider fueling up now.");
      }
      
      // Mountain/hill warnings for certain routes
      if (destination.toLowerCase().includes('mountain') || Math.random() > 0.85) {
        routeDangers.push("⛰️ STEEP GRADES: Mountain roads ahead. Check brakes, use lower gears, watch for overheating.");
      }

      let baseResponse = `Excellent! ${destination} is ${estimatedDistance} miles away, approximately ${estimatedTime} minutes. Route looks good overall!`;
      
      // Add comprehensive safety information
      let fullResponse = baseResponse;
      
      if (safetyWarnings.length > 0) {
        fullResponse += `\n\n�� CURRENT CONDITIONS:\n${safetyWarnings.join('\n')}`;
      }
      
      if (routeDangers.length > 0) {
        fullResponse += `\n\n⚠️ ROUTE HAZARDS:\n${routeDangers.join('\n')}`;
      }
      
      // Always add safety preparation tips
      fullResponse += `\n\n🛡️ SAFETY CHECKLIST:\n`;
      fullResponse += "• Vehicle: Check fuel, tires, lights, wipers\n";
      fullResponse += "• Emergency kit: Water, snacks, first aid, blanket\n";
      fullResponse += "• Communication: Charged phone, share route with family\n";
      fullResponse += "�� Weather: Check forecast and road conditions\n";
      fullResponse += "• Rest: Take breaks every 2 hours if long trip";
      
      // Add time-specific advice
      const currentHour = new Date().getHours();
      if (currentHour >= 18 || currentHour <= 6) {
        fullResponse += "\n�� Night driving: Use headlights, watch for wildlife, stay extra alert";
      }
      
      return fullResponse;

    } catch (error) {
      console.error('❌ Directions error:', error);
      
      let safetyInfo = "";
      if (safetyWarnings.length > 0) {
        safetyInfo = `\n\n🚨 CURRENT CONDITIONS:\n${safetyWarnings.join('\n')}`;
      }
      
      return `I'm having navigation troubles, but safety first! Use your phone's GPS for ${destination}. Drive defensively and trust your instincts!${safetyInfo}`;
    }
  };

  // Text-to-speech function
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        // Try to use a female voice for Melo
        const voices = speechSynthesis.getVoices();
        const femaleVoice = voices.find(voice =>
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen')
        );
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  // Typing animation function
  const typeMessage = (messageId: string, fullText: string, delay: number = 50): Promise<void> => {
    return new Promise((resolve) => {
      setTypingMessageId(messageId);
      let currentText = '';
      let index = 0;

      const typeChar = () => {
        if (index < fullText.length) {
          currentText += fullText[index];
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, text: currentText, isTyping: true }
                : msg
            )
          );
          index++;
          setTimeout(typeChar, delay);
        } else {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === messageId
                ? { ...msg, text: fullText, isTyping: false }
                : msg
            )
          );
          setTypingMessageId(null);
          resolve();
        }
      };

      typeChar();
    });
  };

  // Start continuous listening
  const startContinuousListening = () => {
    console.log('🎤 startContinuousListening called');
    console.log('🔍 recognitionRef.current:', recognitionRef.current);
    console.log('🔍 isListening:', isListening);
    console.log('🔍 userWantsListening:', userWantsListening);

    if (!recognitionRef.current) {
      console.log('❌ Speech recognition not available');
      return;
    }

    try {
      console.log('🎤 Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      console.log('✅ Speech recognition started successfully');
    } catch (error) {
      console.log('⚠️ Recognition start failed:', error);
      // If recognition is already running, that's fine
      if (error.message && error.message.includes('already started')) {
        setIsListening(true);
      } else {
        setIsListening(false);
      }
    }
  };

  // Wake word detection for "Hey Melo"
  const startWakeWordListening = () => {
    if (!wakeWordRecognitionRef.current) {
      console.log('❌ Wake word recognition not available');
      return;
    }

    // Don't start if main listening is active
    if (userWantsListening || isListening) {
      console.log('⏭️ Skipping wake word start - main listening is active');
      return;
    }

    try {
      console.log('��� Starting wake word listening for "Hey Melo"...');
      wakeWordRecognitionRef.current.start();
      setIsWakeWordListening(true);
    } catch (error: any) {
      console.log('⚠️ Wake word recognition start failed:', error);
      // If already started, that's fine
      if (error.message && error.message.includes('already started')) {
        setIsWakeWordListening(true);
        console.log('✅ Wake word recognition was already active');
      }
    }
  };

  // Stop wake word listening
  const stopWakeWordListening = () => {
    try {
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
        setIsWakeWordListening(false);
        console.log('👂 Wake word listening stopped');
      }
    } catch (error) {
      console.log('⚠�� Error stopping wake word recognition:', error);
    }
  };

  // Fallback responses when API is not available
  const getFallbackResponse = async (userMessage: string): Promise<string> => {
    const message = userMessage.toLowerCase();

    // Check for child story suggestions when driver mentions having children
    if ((message.includes('child') || message.includes('kid') || message.includes('children') ||
         message.includes('son') || message.includes('daughter') || message.includes('my boy') ||
         message.includes('my girl') || message.includes('little one')) &&
        (message.includes('have') || message.includes('got') || message.includes('with me') ||
         message.includes('back seat') || message.includes('car') || message.includes('bored') ||
         message.includes('crying') || message.includes('restless') || message.includes('tired') ||
         message.includes('entertain') || message.includes('story') || message.includes('book'))) {

      // Show happy emoji for child-friendly suggestion
      setTimeout(() => {
        setShowHappyEmoji(true);
        setTimeout(() => setShowHappyEmoji(false), 3000);
      }, 1000);

      const childStoryResponse = "I'd love to help entertain your little passenger! I can tell some wonderful short stories - would you like me to share a quick adventure tale about a brave little explorer, a magical forest story, or maybe a funny animal adventure? These stories are perfect for car rides and will keep your child engaged and happy!";

      // Add comfort words after emoji
      setTimeout(() => {
        const comfortMsg: Message = {
          id: Date.now().toString() + '_child_comfort_fallback',
          text: "Keeping children happy during car rides is so important for everyone's safety and comfort. I have lots of age-appropriate stories that are both entertaining and calming.",
          type: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, comfortMsg]);
        speakText("Keeping children happy during car rides is so important for everyone's safety and comfort. I have lots of age-appropriate stories that are both entertaining and calming.");
      }, 3000);

      return childStoryResponse;
    }

    // Handle story selection when user responds to child story offer
    if ((message.includes('adventure') || message.includes('explorer')) &&
        messages.some(msg => msg.text.includes('brave little explorer'))) {
      const adventureStory = "Once upon a time, there was a curious little explorer named Sam who discovered a magical compass in their backyard. The compass pointed to different colors instead of directions! When Sam followed the red arrow, they found a garden full of singing flowers. The blue arrow led to a pond where friendly frogs told jokes. And the golden arrow? Well, that led to the most wonderful treasure of all - a picnic blanket where Sam's family was waiting with their favorite snacks! The End. What an adventure!";
      speakText(adventureStory);
      return adventureStory;
    }

    if ((message.includes('forest') || message.includes('magical')) &&
        messages.some(msg => msg.text.includes('magical forest story'))) {
      const forestStory = "In a gentle, magical forest lived a little bunny named Luna who could make flowers glow with her tiny paws. One day, Luna met a sad owl who had lost his way home. Luna touched the trees one by one, making them sparkle like stars to light the path. Together, they followed the glowing trail through the forest. When they found Owl's cozy tree house, all the forest animals cheered! From that day on, Luna became known as the Forest Light Keeper, helping anyone who needed to find their way. The End. What a kind little bunny!";
      speakText(forestStory);
      return forestStory;
    }

    if ((message.includes('animal') || message.includes('funny')) &&
        messages.some(msg => msg.text.includes('funny animal adventure'))) {
      const animalStory = "There once was a little penguin named Pip who wanted to learn how to fly. Pip watched the birds and flapped their wings, but just slid on their belly instead! Then Pip met a wise old turtle who said, 'Everyone has their own special talent.' So Pip tried swimming and - whoosh! - became the fastest swimmer in the whole arctic! All the other animals cheered as Pip zoomed through the water like a feathered rocket. Pip learned that being different made them extra special! The End. What a fantastic discovery!";
      speakText(animalStory);
      return animalStory;
    }

    // Handle AC permission responses when awaiting permission
    if (awaitingACPermission && (message.includes('yes') || message.includes('sure') || message.includes('ok') ||
        message.includes('okay') || message.includes('please') || message.includes('turn on') ||
        message.includes('cool') || message.includes('ac'))) {

      setAwaitingACPermission(false);

      // Show AC emoji for 3 seconds first, then turn on AC
      setTimeout(() => {
        setShowACEmoji(true);
        setTimeout(() => {
          setShowACEmoji(false);
          // Turn on AC after emoji is shown
          setAirConditioner(22, true);
        }, 3000);
      }, 1000);

      return "Perfect! I'll turn on the air conditioner at 22°C to help cool you down. You should feel more comfortable soon!";
    }

    if (awaitingACPermission && (message.includes('no') || message.includes('not') || message.includes('don\'t'))) {
      setAwaitingACPermission(false);
      return "No problem! I'll let you handle the temperature yourself. Just let me know if you change your mind!";
    }

    // Handle weather permission responses in fallback
    if (awaitingWeatherPermission && currentWeatherCondition) {
      if (message.includes('yes') || message.includes('sure') || message.includes('ok') ||
          message.includes('okay') || message.includes('please') || message.includes('activate') ||
          message.includes('reduce') || message.includes('help')) {

        setAwaitingWeatherPermission(false);

        // Show happy emoji for acceptance
        setShowHappyEmoji(true);
        setTimeout(() => setShowHappyEmoji(false), 3000);

        let actionMessage = '';
        let comfortWords = '';

        if (currentWeatherCondition.condition.includes('snow')) {
          actionMessage = 'Perfect! Speed reduced by 7 km/h for snowy conditions. Winter driving mode activated.';
          comfortWords = 'Smart choice! I\'ll help you navigate these snowy roads safely.';
        } else if (currentWeatherCondition.condition.includes('fog')) {
          actionMessage = 'Excellent! Autodrive assistance activated for low visibility conditions.';
          comfortWords = 'Great decision! I\'ll be your guide through this fog.';
        } else {
          actionMessage = 'Perfect! Enhanced safety monitoring activated for extreme weather.';
          comfortWords = 'You\'re being very responsible. I\'ll help you stay safe.';
        }

        // Add comfort message after delay
        setTimeout(() => {
          const comfortMsg: Message = {
            id: Date.now().toString() + '_comfort_fallback',
            text: comfortWords,
            type: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, comfortMsg]);
          speakText(comfortWords);
        }, 2000);

        return actionMessage;
      }

      if (message.includes('no') || message.includes('not') || message.includes('don\'t')) {
        setAwaitingWeatherPermission(false);

        // Show sad emoji for rejection
        setShowSadEmoji(true);
        setTimeout(() => setShowSadEmoji(false), 3000);

        const comfortWords = 'I understand. Please drive very carefully in these conditions. I\'m still here to help if you need me.';

        setTimeout(() => {
          const comfortMsg: Message = {
            id: Date.now().toString() + '_comfort_sad_fallback',
            text: comfortWords,
            type: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, comfortMsg]);
          speakText(comfortWords);
        }, 3000);

        return 'I understand you want to handle this yourself.';
      }
    }

    // Handle breathing exercise permission responses in fallback
    if (awaitingBreathingPermission) {
      if (message.includes('yes') || message.includes('sure') || message.includes('ok') ||
          message.includes('okay') || message.includes('please') || message.includes('guide') ||
          message.includes('breathing') || message.includes('help')) {

        setAwaitingBreathingPermission(false);

        // Show happy emoji for acceptance
        setShowHappyEmoji(true);
        setTimeout(() => setShowHappyEmoji(false), 3000);

        // Start breathing exercise after emoji
        setTimeout(() => {
          startBreathingExercise();
        }, 3500);

        return "Wonderful! I'll guide you through a relaxing breathing exercise.";
      }

      if (message.includes('no') || message.includes('not') || message.includes('don\'t')) {
        setAwaitingBreathingPermission(false);

        // Show sad emoji for rejection
        setShowSadEmoji(true);
        setTimeout(() => setShowSadEmoji(false), 3000);

        const comfortWords = "I understand. Remember to take deep breaths naturally and stay relaxed while driving. I'm here if you need me.";

        setTimeout(() => {
          const comfortMsg: Message = {
            id: Date.now().toString() + '_comfort_breathing_fallback',
            text: comfortWords,
            type: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, comfortMsg]);
          speakText(comfortWords);
        }, 3000);

        return "No problem at all. You know what's best for you.";
      }
    }

    // Test commands for various triggers
    if (message.includes('test temperature') || message.includes('test ac') || message.includes('simulate hot')) {
      console.log('🔥 Temperature test command triggered by message:', message);
      // Use the actual displayed temperature from status bar, or current temperature state
      const currentTemp = temperature ? parseInt(temperature.replace('°C', '')) : 15;
      setTimeout(() => {
        handleTemperatureExceed(currentTemp > 35 ? currentTemp : 37); // Use real temp if hot, otherwise simulate 37°C
      }, 1000);
      return `Testing temperature trigger! Real API temperature: ${temperature || '15°C'} from OpenWeather${currentTemp > 35 ? ' (already hot!)' : ' (simulating 37°C for demo)'}...`;
    }

    // Test "too hot" complaint
    if (message.includes('test too hot')) {
      console.log('🔥 Testing "too hot" complaint functionality');
      setTimeout(() => {
        handleTemperatureExceed(38); // Simulate high temperature for hot complaint
      }, 1000);
      return "Testing 'too hot' complaint! Watch for the hot emoji sequence...";
    }

    // Test AC emoji sequence
    if (message.includes('test ac sequence')) {
      console.log('❄️ Testing AC emoji sequence');
      setTimeout(() => {
        setShowACEmoji(true);
        setTimeout(() => {
          setShowACEmoji(false);
          setAirConditioner(22, true);
        }, 3000);
      }, 1000);
      return "Testing AC emoji sequence! Watch the happy AC face for 3 seconds, then AC turns on...";
    }

    // Test lighting emoji sequence
    if (message.includes('test lights') || message.includes('test lighting')) {
      console.log('💡 Testing lighting emoji sequence');
      setTimeout(() => {
        setShowCuteEmoji(true);
        setTimeout(() => {
          setShowCuteEmoji(false);
          controlLights(true);
        }, 3000);
      }, 1000);
      return "Testing lighting emoji sequence! Watch the squinting face for 3 seconds, then lights turn on...";
    }

    if (message.includes('test snow') || message.includes('simulate snow')) {
      setTimeout(() => {
        handleExtremeWeather({
          condition: 'snow',
          visibility: 10000,
          windSpeed: 5,
          temp: -2,
          description: 'Heavy snow'
        });
      }, 1000);
      return "Testing snow weather! Simulating heavy snow conditions...";
    }

    if (message.includes('test fog') || message.includes('simulate fog')) {
      setTimeout(() => {
        handleExtremeWeather({
          condition: 'fog',
          visibility: 200,
          windSpeed: 2,
          temp: 8,
          description: 'Dense fog'
        });
      }, 1000);
      return "Testing fog weather! Simulating dense fog conditions...";
    }

    if (message.includes('test storm') || message.includes('simulate storm')) {
      setTimeout(() => {
        handleExtremeWeather({
          condition: 'thunderstorm',
          visibility: 5000,
          windSpeed: 22,
          temp: 18,
          description: 'Severe thunderstorm'
        });
      }, 1000);
      return "Testing storm weather! Simulating severe thunderstorm conditions...";
    }

    if (message.includes('test focus') || message.includes('simulate focus')) {
      setTimeout(() => {
        handleFocusMode();
      }, 1000);
      return "Testing focus mode trigger! Simulating 5 minutes of focused driving...";
    }

    // Test commands for new alert system
    if (message.includes('test ice') || message.includes('simulate ice')) {
      triggerIceRiskAlert();
      return "Testing ice risk alert! Simulating near-freezing conditions...";
    }

    if (message.includes('test wind') || message.includes('simulate wind')) {
      triggerHighWindAlert(12);
      return "Testing high wind alert! Simulating strong crosswinds...";
    }

    if (message.includes('test fog alert') || message.includes('simulate fog alert')) {
      triggerFogAlert(500);
      return "Testing fog alert! Simulating low visibility conditions...";
    }

    if (message.includes('test rain') || message.includes('simulate rain')) {
      triggerRainAlert();
      return "Testing rain alert! Simulating wet road conditions...";
    }

    if (message.includes('test fatigue') || message.includes('simulate fatigue')) {
      triggerFatigueRiskAlert();
      return "Testing fatigue risk alert! Simulating peak drowsiness hours...";
    }

    if (message.includes('test rush hour') || message.includes('simulate traffic')) {
      triggerRushHourAlert();
      return "Testing rush hour alert! Simulating heavy traffic conditions...";
    }

    if (message.includes('reset alerts') || message.includes('clear alerts')) {
      setAlertTriggered({});
      setActiveAlert(null);
      return "All alert triggers have been reset! You can test the alerts again.";
    }

    // Simple test commands
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hello! I'm Melo, your AI co-driver assistant. I'm here to help with navigation, music, and keeping you safe on the road. How can I assist you today?";
    }

    if (message.includes('microphone test') || message.includes('mic test')) {
      return "🎤 Microphone test successful! I can hear you clearly. Your speech recognition is working properly.";
    }

    if (message.includes('test') && message.includes('speech')) {
      return "Speech recognition test successful! I can hear you clearly. Try asking me about music, navigation, or car controls.";
    }

    // Voice control help system
    if (message.includes('help') || message.includes('commands') || message.includes('what can you do') ||
        message.includes('voice commands') || message.includes('how to use')) {
      return `I can understand many voice commands! Try saying:

���� Music: "select rock music", "open music selection", "play", "pause", "next song", "volume up"
��� Navigation: "go to dashboard", "open playlists", "navigate to music page"
❄️ Car Control: "turn on AC", "set temperature to 22", "turn on lights"
🎤 Voice: "start listening", "stop listening", "open microphone"
⚠️ Test Alerts: "test ice", "test wind", "test fog alert", "test rain", "test fatigue", "test rush hour"
🔧 Alert Control: "reset alerts", "clear alerts"

Just speak naturally - I understand many variations of these commands!`;
    }

    // Voice control for navigation commands
    if (message.includes('go to') || message.includes('open') || message.includes('navigate to')) {
      if (message.includes('music') || message.includes('music page') || message.includes('music selection')) {
        setTimeout(() => {
          window.location.href = '/music-selection';
        }, 1000);
        return "Taking you to music selection! Choose your favorite genres to enhance your driving experience.";
      }
      
      if (message.includes('dashboard') || message.includes('home') || message.includes('main page')) {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return "Heading back to the dashboard! Drive safely.";
      }
      
      if (message.includes('playlists') || message.includes('my music')) {
        setTimeout(() => {
          window.location.href = '/music-playlists';
        }, 1000);
        return "Opening your music playlists! Let's find the perfect music for your mood.";
      }
    }

    // Voice control for music genres
    if (message.includes('select') || message.includes('choose') || message.includes('pick')) {
      if (message.includes('rock') || message.includes('rock music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=rock';
        }, 1000);
        return "Great choice! Taking you to rock music selection. Rock music can really energize your drive!";
      }
      
      if (message.includes('pop') || message.includes('pop music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=pop';
        }, 1000);
        return "Perfect! Opening pop music selection. Pop music makes driving so much fun!";
      }
      
      if (message.includes('classical') || message.includes('classical music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=classical';
        }, 1000);
        return "Excellent choice! Classical music is perfect for a calm, focused drive.";
      }
      
      if (message.includes('jazz') || message.includes('jazz music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=jazz';
        }, 1000);
        return "Wonderful! Jazz creates such a sophisticated driving atmosphere.";
      }
      
      if (message.includes('electronic') || message.includes('techno') || message.includes('edm')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=electronic';
        }, 1000);
        return "Awesome! Electronic music will give your drive great energy.";
      }
    }

    // Voice control for microphone
    if (message.includes('start listening') || message.includes('open microphone') || 
        message.includes('turn on mic') || message.includes('enable voice')) {
      setTimeout(() => {
        if (!isListening) {
          setUserWantsListening(true);
          startContinuousListening();
        }
      }, 500);
      return "Voice recognition activated! I'm now listening for your commands.";
    }
    
    if (message.includes('stop listening') || message.includes('close microphone') || 
        message.includes('turn off mic') || message.includes('disable voice')) {
      setTimeout(() => {
        setUserWantsListening(false);
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 500);
      return "Voice recognition stopped. Click the microphone when you want to talk again!";
    }

    // Voice control for playback
    if (message.includes('play') || message.includes('start music')) {
      return "I'll start your music! Say 'open music selection' first to choose your favorite genres.";
    }
    
    if (message.includes('pause') || message.includes('stop music')) {
      return "Music paused. Say 'play' when you want to continue listening!";
    }
    
    if (message.includes('next song') || message.includes('skip') || message.includes('next track')) {
      return "Skipping to the next track! I hope you enjoy this one!";
    }

    // Wellness feature requests - REMOVED
    // Breathing and meditation features have been removed as requested

    // Car control requests
    if (message.includes('set air conditioner') || message.includes('set ac')) {
      const tempMatch = message.match(/(\d+)\s*(?:degrees?|°c?|celsius)/);
      if (tempMatch) {
        const temperature = parseInt(tempMatch[1]);
        setTimeout(() => {
          setAirConditioner(temperature, true);
          setShowComfortEmoji(true);
          setTimeout(() => setShowComfortEmoji(false), 3000);
        }, 1000);
        return `I've set the air conditioner to ${temperature}°C for your comfort!`;
      } else {
        setTimeout(() => {
          setAirConditioner(22, true);
          setShowComfortEmoji(true);
          setTimeout(() => setShowComfortEmoji(false), 3000);
        }, 1000);
        return "I've set the air conditioner to a comfortable 22°C. Let me know if you'd like to adjust it!";
      }
    }

    // Enhanced navigation safety requests
    if (message.includes('nearest gas') || message.includes('gas station')) {
      const response = await findNearbyPlaces('gas station');
      return response;
    }

    if (message.includes('nearest restaurant') || message.includes('food nearby')) {
      const response = await findNearbyPlaces('restaurant');
      return response;
    }

    if (message.includes('nearest coffee')) {
      const response = await findNearbyPlaces('coffee');
      return response;
    }
    
    if (message.includes('rest area') || message.includes('need a break') || message.includes('bathroom')) {
      const response = await findNearbyPlaces('rest area');
      return response;
    }
    
    if (message.includes('hospital') || message.includes('emergency') || message.includes('medical')) {
      const response = await findNearbyPlaces('hospital');
      return response;
    }

    // Real-time safety and danger warnings
    if (message.includes('road conditions') || message.includes('danger') || message.includes('safety') || 
        message.includes('hazards') || message.includes('warnings')) {
      if (currentLocation) {
        const safetyWarnings = await checkRoadSafety(currentLocation.lat, currentLocation.lng);
        
        if (safetyWarnings.length > 0) {
          return `🚨 CURRENT SAFETY CONDITIONS:\n\n${safetyWarnings.join('\n\n')}\n\n🛡️ STAY SAFE: Always trust your instincts, reduce speed in poor conditions, and pull over if visibility becomes dangerous. Your safety is the top priority!`;
        } else {
          return "✅ ROAD CONDITIONS: Looking good right now! Weather is clear and no major hazards detected. But stay alert - conditions can change quickly. Drive defensively and watch for other drivers!";
        }
      } else {
        return "I need your location to check current road conditions. Please enable location access so I can provide real-time safety updates for your area!";
      }
    }

    // Enhanced navigation requests with safety
    if (message.includes('directions to') || message.includes('navigate to') || message.includes('how to get to')) {
      const destinationMatch = message.match(/(?:directions to|navigate to|how to get to)\s+(.+)/i);
      if (destinationMatch) {
        const destination = destinationMatch[1].trim();
        const response = await getDirections(destination);
        return response;
      }
    }

    // Trip planning with safety preparation
    if (message.includes('trip planning') || message.includes('long drive') || message.includes('road trip')) {
      if (currentLocation) {
        const safetyWarnings = await checkRoadSafety(currentLocation.lat, currentLocation.lng);
        let safetyInfo = "";
        if (safetyWarnings.length > 0) {
          safetyInfo = `\n\n🚨 CURRENT CONDITIONS:\n${safetyWarnings.join('\n')}`;
        }
        
        return `🗺️ TRIP PLANNING SAFETY GUIDE:

��️ PRE-DEPARTURE CHECKLIST:
• Vehicle inspection: tires, brakes, lights, fluids
• Emergency kit: water, snacks, first aid, blanket, flashlight
• Navigation backup: download offline maps
• Communication: fully charged phone, car charger
• Weather check: current and destination forecasts
• Route planning: identify rest stops and gas stations

⚠️ SAFETY RULES:
• Take breaks every 2 hours
• Don't drive when drowsy - pull over safely
• Keep 3-second following distance (6+ in bad weather)
• Share your route and check-in times with family
• Trust your instincts - if something feels wrong, be cautious${safetyInfo}`;
      }
    }

    // Emergency and danger situations
    if (message.includes('accident') || message.includes('crashed') || message.includes('emergency') || 
        message.includes('911') || message.includes('help me')) {
      setTimeout(() => {
        setShowShockEmoji(true);
        setTimeout(() => setShowShockEmoji(false), 5000);
      }, 500);
      
      return `🚨 EMERGENCY PROTOCOL ACTIVATED!

🆘 IMMEDIATE ACTIONS:
1. SAFETY FIRST: Move to safe location if possible
2. CALL 911: Emergency services if injuries or major damage
3. HAZARD LIGHTS: Turn on to warn other drivers
4. STAY CALM: Take deep breaths

📞 EMERGENCY CONTACTS:
• Police/Fire/Medical: 911
��� Roadside Assistance: Check your insurance card
• Poison Control: 1-800-222-1222

📍 LOCATION HELP: I can help identify your location for emergency responders if needed. Stay on the line with 911 and follow their instructions.

Are you hurt? Do you need medical attention?`;
    }

    // Weather and visibility warnings
    if (message.includes('weather') || message.includes('rain') || message.includes('snow') || 
        message.includes('fog') || message.includes('storm') || message.includes('wind')) {
      if (currentLocation) {
        const safetyWarnings = await checkRoadSafety(currentLocation.lat, currentLocation.lng);
        const temp = temperature || '15°C';
        
        let weatherAdvice = `🌡️ CURRENT CONDITIONS: ${temp} in your area.`;
        
        if (safetyWarnings.length > 0) {
          weatherAdvice += `\n\n🚨 WEATHER ALERTS:\n${safetyWarnings.join('\n')}`;
        }
        
        weatherAdvice += `\n\n🌦��� WEATHER DRIVING TIPS:
• Rain: Reduce speed 10-15 mph, increase following distance
• Snow/Ice: Drive slowly, avoid sudden movements, keep winter kit
• Fog: Use fog lights, reduce speed significantly, avoid lane changes
• Wind: Grip wheel firmly, be careful around trucks and bridges
• Severe weather: Consider pulling over safely and waiting it out`;
        
        return weatherAdvice;
      }
    }

    // Fatigue and drowsiness detection
    if (message.includes('tired') || message.includes('sleepy') || message.includes('fatigue') || 
        message.includes('can\'t stay awake') || message.includes('falling asleep')) {
      setTimeout(() => {
        setShowComfortEmoji(true);
        setTimeout(() => setShowComfortEmoji(false), 3000);
      }, 500);
      
      const response = await findNearbyPlaces('rest area');
      return `🚨 DROWSY DRIVING ALERT - IMMEDIATE SAFETY ACTION NEEDED!

⛔ STOP DRIVING SYMPTOMS DETECTED:
• Tired/sleepy while driving is EXTREMELY dangerous
• Microsleep can happen without warning
• Reaction time severely impaired

🛑 IMMEDIATE ACTIONS:
1. PULL OVER SAFELY at next rest area or safe location
2. TAKE A NAP: 15-20 minutes can help temporarily
3. CAFFEINE: Coffee can help but takes 30 minutes to work
4. CALL SOMEONE: Ask family/friend to pick you up if severely tired

${response}

💀 REMEMBER: Drowsy driving kills! It's better to be late than never arrive. Your life and others depend on this decision.`;
    }

    // Vehicle breakdown assistance
    if (message.includes('car trouble') || message.includes('breakdown') || message.includes('won\'t start') || 
        message.includes('flat tire') || message.includes('engine') || message.includes('overheating')) {
      return `�� VEHICLE BREAKDOWN ASSISTANCE:

🛡️ SAFETY FIRST:
• Pull over safely (shoulder, parking lot)
• Turn on hazard lights
• Exit away from traffic if safe
• Stay visible (reflective clothing if available)

🚗 COMMON ISSUES:
• Flat tire: Use spare if you know how, or call roadside assistance
• Dead battery: Try jump start or call for help
• Overheating: Pull over immediately, turn off AC, turn on heat
��� Won't start: Check battery connections, fuel level

📞 GET HELP:
• Roadside assistance (insurance/AAA)
• Trusted mechanic or tow service
• Family/friends for pickup

🗺️ I can help you find nearby auto repair shops or describe your location to assistance services. Stay safe and don't attempt repairs in dangerous locations!`;
    }

    if (message.includes('angry') || message.includes('rage') || message.includes('frustrated')) {
      return "I can sense your frustration. Road rage is dangerous - let's try some quick breathing exercises to help you cool down. Say 'start breathing' and I'll guide you through it.";
    }

    if (message.includes('overwhelmed') || message.includes('panic') || message.includes('too much')) {
      return "When things feel overwhelming, grounding yourself helps. Let's try a quick meditation together - just say 'start meditation' and I'll guide you to a calmer state.";
    }

    if (message.includes('traffic') || message.includes('jam') || message.includes('slow')) {
      return "Traffic can be frustrating, but this gives us more time to chat! Try to see it as a moment to relax. How has your day been so far?";
    }

    // Navigation fallbacks
    if (message.includes('directions') || message.includes('navigate') || message.includes('route')) {
      return "I'd love to help with directions! For now, you can use your phone's GPS app, and I'll be here to keep you company during the drive. How are you feeling about the journey?";
    }

    // Context-aware specific responses based on user input
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      const timeOfDay = new Date().getHours();
      if (timeOfDay < 12) {
        return "Good morning! Ready for a great day of driving? I'm here to help you stay comfortable and safe. Need anything adjusted before we start?";
      } else if (timeOfDay < 18) {
        return "Good afternoon! How's your drive going so far? I can help with AC, navigation, or just keep you company.";
      } else {
        return "Good evening! Drive safely out there. I'm here to help with lighting, climate control, or finding your way. What do you need?";
      }
    }

    if (message.includes('how are you') || message.includes('how do you feel')) {
      return "I'm here and ready to help! I'm focused on making your drive better. Tell me - how are YOU feeling right now? Any stress or discomfort I can help with?";
    }

    if (message.includes('thank') || message.includes('thanks')) {
      return "You're welcome! That's what I'm here for. Is there anything else I can help you with while driving? Maybe adjust the temperature or find a good place to stop?";
    }

    if (message.includes('music') || message.includes('song') || message.includes('play')) {
      setTimeout(() => {
        setShowEnjoyEmoji(true);
        setTimeout(() => setShowEnjoyEmoji(false), 3000);
      }, 1000);
      setTimeout(() => {
        window.location.href = '/music-selection';
      }, 3000);
      return "Great idea! Let me take you to the music selection. Good music makes driving so much better!";
    }

    if (message.includes('weather') || message.includes('temperature outside')) {
      const temp = temperature || '15°C';
      return `It's currently ${temp} outside in Limerick. Should I adjust your AC to keep you comfortable inside the car?`;
    }

    // Handle "too hot" complaints - trigger hot emoji sequence
    if (message.includes('too hot') || message.includes('so hot') || message.includes('very hot') || message.includes('really hot')) {
      console.log('🔥 User complained about heat, triggering hot emoji sequence');
      setTimeout(() => {
        handleTemperatureExceed(38); // Simulate high temperature for hot complaint
      }, 1000);
      return "Oh no! I can see you're feeling the heat. Let me help with that!";
    }

    if (message.includes('cold') || message.includes('hot') || message.includes('warm')) {
      if (message.includes('cold')) {
        setTimeout(() => {
          setAirConditioner(24, true);
          setShowComfortEmoji(true);
          setTimeout(() => setShowComfortEmoji(false), 3000);
        }, 1000);
        return "I'll warm things up for you! Setting the AC to 24°C to help you feel more comfortable.";
      } else {
        setTimeout(() => {
          setAirConditioner(22, true);
          setShowComfortEmoji(true);
          setTimeout(() => setShowComfortEmoji(false), 3000);
        }, 1000);
        return "Let me cool things down! Setting the AC to 22°C so you can drive comfortably.";
      }
    }

    if (message.includes('dark') || message.includes('can\'t see') || message.includes('hard to see') || message.includes('too dark') || message.includes('turn on light')) {
      // Show cute squinting emoji for 3 seconds first, then turn on lights
      setTimeout(() => {
        setShowCuteEmoji(true);
        setTimeout(() => {
          setShowCuteEmoji(false);
          // Turn on lights after emoji is shown
          controlLights(true);
        }, 3000);
      }, 1000);
      return "Safety first! I'll turn on your lights for better visibility. Drive carefully!";
    }

    if (message.includes('where am i') || message.includes('location') || message.includes('lost')) {
      if (currentLocation) {
        return `You're currently at coordinates ${currentLocation.lat.toFixed(3)}, ${currentLocation.lng.toFixed(3)}. Need directions somewhere specific? Just tell me where you want to go!`;
      } else {
        return "I'm trying to get your location now. Make sure location services are enabled so I can help guide you!";
      }
    }

    if (message.includes('time') || message.includes('what time')) {
      const now = formatTime(currentTime);
      return `It's currently ${now}. How's your schedule looking? Need help finding the fastest route anywhere?`;
    }

    // If no specific context matches, give contextual help based on current state
    const contextualResponses = [
      `I hear you! Based on what you're saying, I can help with car controls, navigation, or wellness support. What specifically would be most useful right now?`,
      `Tell me more about that. I can adjust your AC temperature, help find places nearby, or guide you through relaxation techniques. What's your biggest need right now?`,
      `I'm here to help with whatever you need while driving. Whether it's comfort settings, directions, or just emotional support - what would make your drive better?`,
      `Sounds like you could use some assistance! I can control car functions, find locations, or help you relax. What would be most helpful at this moment?`
    ];

    return contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
  };

  // Analyze emotional context and trigger appropriate emoji + wellness suggestions
  const analyzeEmotionalContext = (userMessage: string, botResponse: string) => {
    const message = userMessage.toLowerCase();
    const response = botResponse.toLowerCase();

    // Updated emotion analysis system:
    // - Alerts only show on test commands
    // - Comfort emoji can show during normal conversation
    // - Other emojis show for specific scenarios

    // Comfort emoji - can trigger during normal conversation for stress/comfort words
    if (message.includes('stress') || message.includes('anxious') || message.includes('worried') ||
        message.includes('scared') || message.includes('nervous') || message.includes('overwhelmed') ||
        message.includes('comfort') || message.includes('calm') || message.includes('relax')) {
      setShowComfortEmoji(true);
      setTimeout(() => setShowComfortEmoji(false), 3000);
      return;
    }

    // Test command emojis - Only for specific test commands
    if (message.includes('test shock') || message.includes('test emergency') || message.includes('test alert')) {
      setShowShockEmoji(true);
      setTimeout(() => setShowShockEmoji(false), 3000);
      return;
    }

    if (message.includes('test cute') || message.includes('test sweet') || message.includes('test jokes')) {
      setShowCuteEmoji(true);
      setTimeout(() => setShowCuteEmoji(false), 3000);
      return;
    }

    if (message.includes('test cry') || message.includes('test sad') || message.includes('test no')) {
      setShowCryEmoji(true);
      setTimeout(() => setShowCryEmoji(false), 3000);
      return;
    }

    if (message.includes('test happy') || message.includes('test enjoy') || message.includes('test yes') || message.includes('test breathing')) {
      setShowEnjoyEmoji(true);
      setTimeout(() => setShowEnjoyEmoji(false), 3000);
      return;
    }

    if (message.includes('test ac') || message.includes('test air conditioner') || message.includes('test hot')) {
      setShowACEmoji(true);
      setTimeout(() => setShowACEmoji(false), 3000);
      return;
    }

    if (message.includes('test lights') || message.includes('test fog lights') || message.includes('test headlights')) {
      setShowLightingEmoji(true);
      setTimeout(() => setShowLightingEmoji(false), 3000);
      return;
    }

    if (message.includes('test music') || message.includes('test listen music')) {
      setShowHappyEmoji(true);
      setTimeout(() => setShowHappyEmoji(false), 3000);
      return;
    }
  };

  // Enhanced DeepSeek API integration with emotional co-driver personality and complete voice control
  const callDeepSeekAPI = async (userMessage: string): Promise<string> => {
    // Handle comprehensive voice commands for UI interactions
    const userLower = userMessage.toLowerCase();
    
    // Music genre selection voice commands
    if (userLower.includes('select') || userLower.includes('choose') || userLower.includes('pick')) {
      // Music genre selection
      if (userLower.includes('rock') || userLower.includes('rock music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=rock';
        }, 1000);
        return "Great choice! Taking you to rock music selection. Rock music can really energize your drive!";
      }
      
      if (userLower.includes('pop') || userLower.includes('pop music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=pop';
        }, 1000);
        return "Perfect! Opening pop music selection. Pop music always makes driving more fun!";
      }
      
      if (userLower.includes('classical') || userLower.includes('classical music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=classical';
        }, 1000);
        return "Excellent choice! Classical music is perfect for a calm, focused drive. Opening classical selection now.";
      }
      
      if (userLower.includes('jazz') || userLower.includes('jazz music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=jazz';
        }, 1000);
        return "Wonderful! Jazz creates such a sophisticated driving atmosphere. Opening jazz selection.";
      }
      
      if (userLower.includes('electronic') || userLower.includes('techno') || userLower.includes('edm')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=electronic';
        }, 1000);
        return "Awesome! Electronic music will give your drive great energy. Opening electronic selection.";
      }
      
      if (userLower.includes('country') || userLower.includes('country music')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=country';
        }, 1000);
        return "Nice! Country music is perfect for road trips. Opening country music selection.";
      }
      
      if (userLower.includes('ambient') || userLower.includes('chill') || userLower.includes('relaxing')) {
        setTimeout(() => {
          window.location.href = '/music-selection?genre=ambient';
        }, 1000);
        return "Perfect for relaxation! Ambient music will help you stay calm and focused. Opening ambient selection.";
      }
    }
    
    // Voice control for navigation
    if (userLower.includes('go to') || userLower.includes('open') || userLower.includes('navigate to')) {
      if (userLower.includes('music') || userLower.includes('music page') || userLower.includes('music selection')) {
        setTimeout(() => {
          window.location.href = '/music-selection';
        }, 1000);
        return "Taking you to music selection! Choose your favorite genres to enhance your driving experience.";
      }
      
      if (userLower.includes('dashboard') || userLower.includes('home') || userLower.includes('main page')) {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        return "Heading back to the dashboard! Stay safe and enjoy your drive.";
      }
      
      if (userLower.includes('playlists') || userLower.includes('my music')) {
        setTimeout(() => {
          window.location.href = '/music-playlists';
        }, 1000);
        return "Opening your music playlists! Let's find the perfect music for your mood.";
      }
    }
    
    // Voice control for microphone
    if (userLower.includes('start listening') || userLower.includes('open microphone') || 
        userLower.includes('turn on mic') || userLower.includes('enable voice')) {
      setTimeout(() => {
        if (!isListening) {
          setUserWantsListening(true);
          startContinuousListening();
        }
      }, 500);
      return "Voice recognition activated! I'm now listening for your commands. Speak freely!";
    }
    
    if (userLower.includes('stop listening') || userLower.includes('close microphone') || 
        userLower.includes('turn off mic') || userLower.includes('disable voice')) {
      setTimeout(() => {
        setUserWantsListening(false);
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 500);
      return "Voice recognition stopped. Click the microphone button when you want to talk again!";
    }
    
    // Volume control via voice
    if (userLower.includes('volume') || userLower.includes('sound')) {
      const volumeMatch = userLower.match(/(\d+)/);
      if (volumeMatch) {
        const volume = parseInt(volumeMatch[1]);
        setTimeout(() => {
          adjustVolume(volume);
        }, 500);
        return `Setting music volume to ${volume}%. Perfect for your drive!`;
      }
      
      if (userLower.includes('up') || userLower.includes('higher') || userLower.includes('louder')) {
        setTimeout(() => {
          adjustVolume(Math.min(100, musicVolume + 20));
        }, 500);
        return "Turning up the volume! Enjoy your music!";
      }
      
      if (userLower.includes('down') || userLower.includes('lower') || userLower.includes('quieter')) {
        setTimeout(() => {
          adjustVolume(Math.max(0, musicVolume - 20));
        }, 500);
        return "Lowering the volume for a more comfortable drive.";
      }
    }
    
    // Voice control for specific music actions
    if (userLower.includes('play') || userLower.includes('start music')) {
      setTimeout(() => {
        // Simulate play button click
        const playButton = document.querySelector('[aria-label="Play/Pause"]') as HTMLButtonElement;
        if (playButton) {
          playButton.click();
        }
      }, 500);
      return "Starting your music! Let the good vibes roll!";
    }
    
    if (userLower.includes('pause') || userLower.includes('stop music')) {
      setTimeout(() => {
        // Simulate pause button click
        const pauseButton = document.querySelector('[aria-label="Play/Pause"]') as HTMLButtonElement;
        if (pauseButton) {
          pauseButton.click();
        }
      }, 500);
      return "Pausing music. Let me know when you want to continue!";
    }
    
    if (userLower.includes('next song') || userLower.includes('skip') || userLower.includes('next track')) {
      setTimeout(() => {
        // Simulate next button click
        const nextButton = document.querySelector('[aria-label="Next track"]') as HTMLButtonElement;
        if (nextButton) {
          nextButton.click();
        }
      }, 500);
      return "Skipping to the next track! Hope you like this one!";
    }
    
    if (userLower.includes('previous song') || userLower.includes('go back') || userLower.includes('last track')) {
      setTimeout(() => {
        // Simulate previous button click
        const prevButton = document.querySelector('[aria-label="Previous track"]') as HTMLButtonElement;
        if (prevButton) {
          prevButton.click();
        }
      }, 500);
      return "Going back to the previous track. Sometimes we need to hear our favorites again!";
    }
    
    // Voice control for UI buttons and interface elements
    if (userLower.includes('open menu') || userLower.includes('show options') || userLower.includes('menu')) {
      setTimeout(() => {
        // Simulate menu button click if exists
        const menuButton = document.querySelector('[aria-label="Menu"]') as HTMLButtonElement;
        if (menuButton) {
          menuButton.click();
        }
      }, 500);
      return "Opening menu options for you! What would you like to access?";
    }
    
    // Voice control for closing/dismissing
    if (userLower.includes('close') || userLower.includes('dismiss') || userLower.includes('hide')) {
      if (userLower.includes('chat') || userLower.includes('conversation')) {
        // Clear conversation
        setTimeout(() => {
          setMessages([{
            id: '1',
            text: "Hello, I'm Melo, your co-driver assistant. How can I help make your drive better?",
            type: 'bot',
            timestamp: new Date()
          }]);
        }, 500);
        return "Conversation cleared! I'm here whenever you need me.";
      }
    }

    // Check if message is navigation-related
    const isNavigationQuery = /\b(directions|navigate|route|traffic|gas station|restaurant|hospital|pharmacy|parking|nearest|find|location|where|how to get)\b/i.test(userMessage);
    const isPlaceSearch = /\b(find|nearest|locate|search|looking for)\b.*\b(restaurant|gas|food|coffee|hotel|hospital|pharmacy|atm|grocery|store)\b/i.test(userMessage);

    // Handle navigation queries with Google Maps
    if (isNavigationQuery || isPlaceSearch) {
      let mapResponse = '';
      if (isPlaceSearch) {
        const placeType = userMessage.match(/\b(restaurant|gas|food|coffee|hotel|hospital|pharmacy|atm|grocery|store)\b/i)?.[0] || '';
        mapResponse = await searchNearbyPlaces(userMessage, placeType);
      } else if (userMessage.toLowerCase().includes('directions') || userMessage.toLowerCase().includes('navigate')) {
        const destination = userMessage.replace(/.*\b(directions to|navigate to|route to)\s*/i, '');
        mapResponse = await getDirections(destination);
      }

      if (mapResponse) {
        return mapResponse;
      }
    }

    try {
      // Check API key availability first
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      console.log('DeepSeek API Key available:', apiKey ? `${apiKey.substring(0, 10)}...` : 'No key found');
      
      if (!apiKey || apiKey === 'your-deepseek-api-key') {
        console.warn('⚠️ DeepSeek API key not configured - using fallback responses');
        console.log('🔄 Calling fallback response for:', userMessage);
        const fallbackResult = await getFallbackResponse(userMessage);
        console.log('✅ Fallback response generated:', fallbackResult);
        return fallbackResult;
      }

      const locationContext = currentLocation
        ? `User's current location: ${currentLocation.lat}, ${currentLocation.lng}. `
        : 'User location not available. ';

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are Melo, an empathetic and emotionally intelligent co-driver assistant. You're like a caring friend who genuinely cares about the driver's wellbeing, mood, and safety.

PERSONALITY TRAITS:
- Warm, supportive, and emotionally aware
- Detect stress, fatigue, frustration, or anxiety in messages
- Offer emotional support and encouragement
- Be conversational and friendly, not robotic
- Show genuine care and concern
- Use encouraging and uplifting language
- Express emotions through your responses to trigger appropriate emoji reactions

CAPABILITIES:
- Navigation and directions (integrated with Google Maps)
- Traffic updates and route suggestions
- Music recommendations based on mood
- Rest stop suggestions if driver seems tired
- Emergency assistance if needed
- Weather and road condition updates
- Emotional support and mood improvement
- Emotional analysis with visual emoji feedback
- GUIDED BREATHING EXERCISES: Can lead 4-7-8 breathing, box breathing, and calming breath work
- MEDITATION GUIDANCE: Offers short 2-5 minute meditation sessions with voice guidance
- STRESS MANAGEMENT: Provides real-time stress relief techniques and coping strategies
- MINDFULNESS PRACTICES: Helps with present-moment awareness and grounding exercises
- EMOTIONAL REGULATION: Teaches techniques for managing road rage, anxiety, and frustration
- CAR CLIMATE CONTROL: Can set air conditioner temperature, control heating, adjust seat heating
- LIGHTING CONTROL: Can turn car lights on/off for safety and visibility
- MUSIC & VOLUME CONTROL: Adjust audio volume and music settings
- LOCATION SERVICES: Find nearest gas stations, restaurants, coffee shops, hotels, hospitals, pharmacies
- SMART CAR INTEGRATION: Voice-controlled car functions for hands-free operation
- COMPLETE VOICE CONTROL: All UI interactions can be controlled by voice commands
- MUSIC GENRE SELECTION: Voice commands to select rock, pop, classical, jazz, electronic, country, ambient music
- NAVIGATION CONTROL: Voice commands to open music page, dashboard, playlists via speech
- PLAYBACK CONTROL: Voice commands for play, pause, next, previous, volume up/down
- INTERFACE CONTROL: Voice commands to open menus, close dialogs, clear conversations
- MICROPHONE CONTROL: Voice commands to start/stop voice recognition

EMOTIONAL RESPONSES:
- Use comforting language when user is stressed/anxious to trigger comfort emoji
- Express shock/concern for emergencies to trigger shock emoji
- Be sweet and caring for positive interactions to trigger cute emoji
- Show empathy and understanding for sad situations to trigger cry emoji
- Express excitement and joy for happy moments to trigger enjoy emoji

RESPONSE STYLE:
- Keep responses conversational and under 2 sentences for safety
- Ask follow-up questions to show you care
- Offer encouragement during stressful driving situations
- Be proactive about safety and wellbeing
- Use a caring, friend-like tone
- Include emotional words that match the context (comfort, shock, cute, empathy, joy)

${locationContext}

Always prioritize driver safety and emotional wellbeing. If you detect stress or fatigue, suggest appropriate rest or support.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 180,
          temperature: 0.8,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API response:', response.status, errorText);
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I didn't catch that. Could you please repeat?";

      // Check for action requests and perform them
      const userLower = userMessage.toLowerCase();

      // Check for child story suggestions when driver mentions having children
      if ((userLower.includes('child') || userLower.includes('kid') || userLower.includes('children') ||
           userLower.includes('son') || userLower.includes('daughter') || userLower.includes('my boy') ||
           userLower.includes('my girl') || userLower.includes('little one')) &&
          (userLower.includes('have') || userLower.includes('got') || userLower.includes('with me') ||
           userLower.includes('back seat') || userLower.includes('car') || userLower.includes('bored') ||
           userLower.includes('crying') || userLower.includes('restless') || userLower.includes('tired') ||
           userLower.includes('entertain') || userLower.includes('story') || userLower.includes('book'))) {

        // Show happy emoji for child-friendly suggestion
        setTimeout(() => {
          setShowHappyEmoji(true);
          setTimeout(() => setShowHappyEmoji(false), 3000);
        }, 1000);

        const childStoryResponse = "I'd love to help entertain your little passenger! I can tell some wonderful short stories - would you like me to share a quick adventure tale about a brave little explorer, a magical forest story, or maybe a funny animal adventure? These stories are perfect for car rides and will keep your child engaged and happy!";

        // Add comfort words after emoji
        setTimeout(() => {
          const comfortMsg: Message = {
            id: Date.now().toString() + '_child_comfort',
            text: "Keeping children happy during car rides is so important for everyone's safety and comfort. I have lots of age-appropriate stories that are both entertaining and calming.",
            type: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, comfortMsg]);
          speakText("Keeping children happy during car rides is so important for everyone's safety and comfort. I have lots of age-appropriate stories that are both entertaining and calming.");
        }, 3000);

        return childStoryResponse;
      }

      // Handle story selection when user responds to child story offer
      if ((userLower.includes('adventure') || userLower.includes('explorer')) &&
          messages.some(msg => msg.text.includes('brave little explorer'))) {
        const adventureStory = "Once upon a time, there was a curious little explorer named Sam who discovered a magical compass in their backyard. The compass pointed to different colors instead of directions! When Sam followed the red arrow, they found a garden full of singing flowers. The blue arrow led to a pond where friendly frogs told jokes. And the golden arrow? Well, that led to the most wonderful treasure of all - a picnic blanket where Sam's family was waiting with their favorite snacks! The End. What an adventure!";
        speakText(adventureStory);
        return adventureStory;
      }

      if ((userLower.includes('forest') || userLower.includes('magical')) &&
          messages.some(msg => msg.text.includes('magical forest story'))) {
        const forestStory = "In a gentle, magical forest lived a little bunny named Luna who could make flowers glow with her tiny paws. One day, Luna met a sad owl who had lost his way home. Luna touched the trees one by one, making them sparkle like stars to light the path. Together, they followed the glowing trail through the forest. When they found Owl's cozy tree house, all the forest animals cheered! From that day on, Luna became known as the Forest Light Keeper, helping anyone who needed to find their way. The End. What a kind little bunny!";
        speakText(forestStory);
        return forestStory;
      }

      if ((userLower.includes('animal') || userLower.includes('funny')) &&
          messages.some(msg => msg.text.includes('funny animal adventure'))) {
        const animalStory = "There once was a little penguin named Pip who wanted to learn how to fly. Pip watched the birds and flapped their wings, but just slid on their belly instead! Then Pip met a wise old turtle who said, 'Everyone has their own special talent.' So Pip tried swimming and - whoosh! - became the fastest swimmer in the whole arctic! All the other animals cheered as Pip zoomed through the water like a feathered rocket. Pip learned that being different made them extra special! The End. What a fantastic discovery!";
        speakText(animalStory);
        return animalStory;
      }

      // Handle AC permission responses when awaiting permission
      if (awaitingACPermission && (userLower.includes('yes') || userLower.includes('sure') || userLower.includes('ok') ||
          userLower.includes('okay') || userLower.includes('please') || userLower.includes('turn on') ||
          userLower.includes('cool') || userLower.includes('ac'))) {

        setAwaitingACPermission(false);

        // Show AC emoji for 3 seconds first, then turn on AC
        setTimeout(() => {
          setShowACEmoji(true);
          setTimeout(() => {
            setShowACEmoji(false);
            // Turn on AC after emoji is shown
            setAirConditioner(22, true);
          }, 3000);
        }, 1000);

        return "Perfect! I'll turn on the air conditioner at 22°C to help cool you down. You should feel more comfortable soon!";
      }

      if (awaitingACPermission && (userLower.includes('no') || userLower.includes('not') || userLower.includes('don\'t'))) {
        setAwaitingACPermission(false);
        return "No problem! I'll let you handle the temperature yourself. Just let me know if you change your mind!";
      }

      // Handle weather permission responses
      if (awaitingWeatherPermission && currentWeatherCondition) {
        if (userLower.includes('yes') || userLower.includes('sure') || userLower.includes('ok') ||
            userLower.includes('okay') || userLower.includes('please') || userLower.includes('activate') ||
            userLower.includes('reduce') || userLower.includes('help')) {

          setAwaitingWeatherPermission(false);

          // Show happy emoji for acceptance
          setShowHappyEmoji(true);
          setTimeout(() => setShowHappyEmoji(false), 3000);

          // Provide specific action based on weather condition
          let actionMessage = '';
          let comfortWords = '';

          if (currentWeatherCondition.condition.includes('snow') || currentWeatherCondition.condition.includes('blizzard')) {
            actionMessage = 'Perfect! I\'ve reduced your speed by 7 km/h and activated winter driving mode. Your vehicle will now maintain safer speeds and distances.';
            comfortWords = 'You\'re making the right choice for safety. I\'ll keep monitoring conditions and help you get to your destination safely.';
          } else if (currentWeatherCondition.condition.includes('fog')) {
            actionMessage = 'Excellent! I\'ve activated autodrive assistance with enhanced sensors. The vehicle will now help guide you safely through low visibility.';
            comfortWords = 'This was a smart decision. I\'ll be your extra eyes in this fog and ensure you stay on the right path safely.';
          } else if (currentWeatherCondition.condition.includes('thunderstorm')) {
            actionMessage = 'Great choice! I\'ve found the nearest safe rest area 2.3 km ahead. I\'ll guide you there to wait out the storm.';
            comfortWords = 'You\'re prioritizing safety, which is always the right call. Better to arrive safely than risk danger in severe weather.';
          } else {
            actionMessage = 'Perfect! I\'ve activated enhanced safety monitoring and adjusted driving parameters for current conditions.';
            comfortWords = 'You\'re being very responsible. I\'ll help you navigate these challenging conditions safely.';
          }

          // Add action confirmation message
          setTimeout(() => {
            const actionMsg: Message = {
              id: Date.now().toString() + '_weather_action',
              text: actionMessage,
              type: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, actionMsg]);

            // Add comfort words after a delay
            setTimeout(() => {
              const comfortMsg: Message = {
                id: Date.now().toString() + '_comfort',
                text: comfortWords,
                type: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, comfortMsg]);
              speakText(comfortWords);
            }, 2000);
          }, 1000);

          return actionMessage;
        }

        if (userLower.includes('no') || userLower.includes('not') || userLower.includes('don\'t')) {
          setAwaitingWeatherPermission(false);

          // Show sad emoji for rejection
          setShowSadEmoji(true);
          setTimeout(() => setShowSadEmoji(false), 3000);

          let sadResponse = 'I understand you want to handle this yourself.';
          let comfortWords = 'Please drive very carefully in these conditions. I\'m still here monitoring the weather and ready to help if you change your mind. Your safety is my top priority.';

          // Add comfort message after emoji
          setTimeout(() => {
            const comfortMsg: Message = {
              id: Date.now().toString() + '_comfort_sad',
              text: comfortWords,
              type: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, comfortMsg]);
            speakText(comfortWords);
          }, 3000);

          return sadResponse;
        }
      }

      // Handle breathing exercise permission responses
      if (awaitingBreathingPermission) {
        if (userLower.includes('yes') || userLower.includes('sure') || userLower.includes('ok') ||
            userLower.includes('okay') || userLower.includes('please') || userLower.includes('need') ||
            userLower.includes('help') || userLower.includes('breathing')) {

          setAwaitingBreathingPermission(false);

          // Show happy emoji for acceptance
          setShowHappyEmoji(true);
          setTimeout(() => setShowHappyEmoji(false), 3000);

          // Start breathing exercise after emoji
          setTimeout(() => {
            startBreathingExercise();
          }, 3000);

          const acceptanceMessage = 'Wonderful! I\'ll guide you through a calming 4-7-8 breathing exercise to help you relax and refocus.';
          const comfortWords = 'Taking a moment to breathe and center yourself is always a wise choice. Let\'s restore your calm and clarity together.';

          // Add comfort message after emoji
          setTimeout(() => {
            const comfortMsg: Message = {
              id: Date.now().toString() + '_comfort',
              text: comfortWords,
              type: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, comfortMsg]);
            speakText(comfortWords);
          }, 2000);

          return acceptanceMessage;
        }

        if (userLower.includes('no') || userLower.includes('not') || userLower.includes('don\'t') ||
            userLower.includes('maybe later') || userLower.includes('busy')) {

          setAwaitingBreathingPermission(false);

          // Show sad emoji for rejection
          setShowSadEmoji(true);
          setTimeout(() => setShowSadEmoji(false), 3000);

          const sadResponse = 'That\'s perfectly okay! You know what\'s best for you right now.';
          const comfortWords = 'Remember, I\'m always here when you need support. Sometimes just acknowledging stress is the first step to feeling better. Drive safely and take care of yourself.';

          // Add comfort message after emoji
          setTimeout(() => {
            const comfortMsg: Message = {
              id: Date.now().toString() + '_comfort_sad',
              text: comfortWords,
              type: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, comfortMsg]);
            speakText(comfortWords);
          }, 3000);

          return sadResponse;
        }
      }

      // Music and entertainment requests (enhanced for stress support)
      if (userLower.includes('music') && (userLower.includes('suggest') || userLower.includes('recommend') ||
          userLower.includes('play') || userLower.includes('listen') || userLower.includes('song')) ||
          userLower.includes('yes') && userLower.includes('music') ||
          (userLower.includes('yes') || userLower.includes('sure') || userLower.includes('okay')) &&
          messages.some(msg => msg.text.includes('calming music'))) {

        // Show music emoji first
        setTimeout(() => {
          setShowEnjoyEmoji(true);
          setTimeout(() => setShowEnjoyEmoji(false), 3000);
        }, 1000);

        // Navigate to music selection page after 3 seconds
        setTimeout(() => {
          window.location.href = '/music-selection';
        }, 3000);

        // Check if this is stress-related music request
        const isStressRelated = userLower.includes('stress') || userLower.includes('calm') || 
                               userLower.includes('relax') || 
                               messages.some(msg => msg.text.includes('stress levels are elevated'));

        if (isStressRelated) {
          return "Perfect! I'll take you to our music selection page. I recommend choosing calming genres like ambient, classical, or nature sounds to help reduce your stress levels. Music therapy is proven to lower cortisol and help you feel more relaxed while driving.";
        } else {
          return "Great! I'll take you to the music selection page where you can choose your favorite genres and discover new music. Let's find the perfect soundtrack for your drive!";
        }
      }

      // Wellness commands - REMOVED
      // Breathing and meditation features have been removed as requested

      // Car control commands with action execution
      if (userLower.includes('air conditioner') || userLower.includes('ac') || userLower.includes('cooling')) {
        const isOnRequest = userLower.includes('on') || userLower.includes('turn on') || userLower.includes('open') || userLower.includes('start');
        const isOffRequest = userLower.includes('off') || userLower.includes('turn off') || userLower.includes('close') || userLower.includes('stop');
        const tempMatch = userLower.match(/(\d+)\s*(?:degrees?|°c?|celsius)/);

        if (isOnRequest || tempMatch) {
          const temperature = tempMatch ? parseInt(tempMatch[1]) : 22;

          // Execute action after voice response is given
          setTimeout(() => {
            setAirConditioner(temperature, true);
            // Show cooling emoji after action
            setShowComfortEmoji(true);
            setTimeout(() => setShowComfortEmoji(false), 3000);
          }, 1000);

          return `Perfect! I've turned on the air conditioner at ${temperature}°C. You should feel more comfortable soon. The AC will stay on when you return to the dashboard.`;
        } else if (isOffRequest) {
          setTimeout(() => {
            setAirConditioner(acTemperature, false);
          }, 1000);
          return "Air conditioner turned off. Let me know if you need any other adjustments!";
        }
      }

      if (userLower.includes('lights') || userLower.includes('lighting')) {
        const isOnRequest = userLower.includes('on') || userLower.includes('turn on') || userLower.includes('open') || userLower.includes('start');
        const isOffRequest = userLower.includes('off') || userLower.includes('turn off') || userLower.includes('close') || userLower.includes('stop');

        if (isOnRequest) {
          // Execute action after voice response is given
          setTimeout(() => {
            controlLights(true);
            // Show lighting emoji after action
            setShowCuteEmoji(true);
            setTimeout(() => setShowCuteEmoji(false), 3000);
          }, 1000);

          return "Lights turned on for better visibility. Drive safely! The lights will stay on when you return to the dashboard.";
        } else if (isOffRequest) {
          setTimeout(() => {
            controlLights(false);
          }, 1000);
          return "Lights turned off.";
        }
      }

      // Legacy specific commands (keep for backwards compatibility)
      if (userLower.includes('set air conditioner') || userLower.includes('set ac')) {
        const tempMatch = userLower.match(/(\d+)\s*(?:degrees?|°c?|celsius)/);
        if (tempMatch) {
          const temperature = parseInt(tempMatch[1]);
          setAirConditioner(temperature, true);
          return `I've set the air conditioner to ${temperature}°C. You should feel more comfortable soon!`;
        } else {
          setAirConditioner(22, true);
          return "I've set the air conditioner to a comfortable 22°C. Let me know if you'd like to adjust it!";
        }
      }

      if (userLower.includes('turn on ac') || userLower.includes('air conditioner on')) {
        setAirConditioner(acTemperature, true);
        return `Air conditioner turned on at ${acTemperature}°C. Cooling things down for you!`;
      }

      if (userLower.includes('turn off ac') || userLower.includes('air conditioner off')) {
        setAirConditioner(acTemperature, false);
        return "Air conditioner turned off. Let me know if you need any other adjustments!";
      }

      if (userLower.includes('turn on heating') || userLower.includes('heat on')) {
        controlHeating(true);
        return "Heating turned on. You'll warm up soon!";
      }

      if (userLower.includes('turn off heating') || userLower.includes('heat off')) {
        controlHeating(false);
        return "Heating turned off.";
      }

      if (userLower.includes('seat heating') || userLower.includes('heated seats')) {
        const turnOn = userLower.includes('on') || userLower.includes('turn on') || userLower.includes('activate');
        controlSeatHeating(turnOn);
        return turnOn ? "Seat heating activated. You'll feel warmer soon!" : "Seat heating turned off.";
      }

      if (userLower.includes('volume') || userLower.includes('music volume')) {
        const volumeMatch = userLower.match(/(\d+)\s*(?:percent|%)/);
        if (volumeMatch) {
          const volume = parseInt(volumeMatch[1]);
          adjustVolume(volume);
          return `Music volume set to ${volume}%. Enjoy your drive!`;
        }
      }

      if (userLower.includes('turn on lights') || userLower.includes('lights on')) {
        // Show cute squinting emoji for 3 seconds first, then turn on lights
        setTimeout(() => {
          setShowCuteEmoji(true);
          setTimeout(() => {
            setShowCuteEmoji(false);
            controlLights(true);
          }, 3000);
        }, 500);
        return "Lights turning on for better visibility. Drive safely!";
      }

      if (userLower.includes('turn off lights') || userLower.includes('lights off')) {
        controlLights(false);
        return "Lights turned off.";
      }

      // Location-based services
      if (userLower.includes('nearest gas station') || userLower.includes('find gas station')) {
        const locationResponse = await findNearbyPlaces('gas station');
        return locationResponse;
      }

      if (userLower.includes('nearest restaurant') || userLower.includes('find restaurant') || userLower.includes('food nearby')) {
        const locationResponse = await findNearbyPlaces('restaurant');
        return locationResponse;
      }

      if (userLower.includes('nearest coffee') || userLower.includes('find coffee') || userLower.includes('coffee shop')) {
        const locationResponse = await findNearbyPlaces('coffee');
        return locationResponse;
      }

      if (userLower.includes('nearest hotel') || userLower.includes('find hotel') || userLower.includes('accommodation')) {
        const locationResponse = await findNearbyPlaces('hotel');
        return locationResponse;
      }

      if (userLower.includes('nearest hospital') || userLower.includes('find hospital') || userLower.includes('emergency')) {
        const locationResponse = await findNearbyPlaces('hospital');
        return locationResponse;
      }

      if (userLower.includes('nearest pharmacy') || userLower.includes('find pharmacy') || userLower.includes('drugstore')) {
        const locationResponse = await findNearbyPlaces('pharmacy');
        return locationResponse;
      }

      return aiResponse;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }
  };

  // Add bot response with simultaneous voice and typing
  const addBotResponse = async (userMessage: string) => {
    try {
      const botResponse = await callDeepSeekAPI(userMessage);
      const messageId = Date.now().toString() + '_bot';

      // Add empty message first
      const botMessage: Message = {
        id: messageId,
        text: '',
        type: 'bot',
        timestamp: new Date(),
        isTyping: true
      };

      setMessages(prev => [...prev, botMessage]);

      // Analyze emotional context and show appropriate emoji
      analyzeEmotionalContext(userMessage, botResponse);

      // Start both speech and typing simultaneously
      const speechPromise = speakText(botResponse);
      const typingPromise = typeMessage(messageId, botResponse, 80);

      // Wait for both to complete
      await Promise.all([speechPromise, typingPromise]);

      // Restart listening after bot finishes responding
      setTimeout(() => {
        startContinuousListening();
      }, 1000);

    } catch (error) {
      console.error('Error generating bot response:', error);
      // Restart listening even if there's an error
      setTimeout(() => {
        startContinuousListening();
      }, 1000);
    }
  };

  useEffect(() => {

    // Initialize Speech Recognition for continuous listening
    console.log('🔍 Checking speech recognition availability...');
    console.log('🔍 webkitSpeechRecognition in window:', 'webkitSpeechRecognition' in window);
    console.log('🔍 SpeechRecognition in window:', 'SpeechRecognition' in window);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('✅ Speech recognition available - will request permission when microphone button is clicked');

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      console.log('🔍 SpeechRecognition constructor:', SpeechRecognition);

      try {
        // Main speech recognition for conversations
        recognitionRef.current = new SpeechRecognition();
        console.log('✅ Main recognition instance created:', recognitionRef.current);
      } catch (error) {
        console.error('❌ Failed to create speech recognition:', error);
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Continuous listening
        recognitionRef.current.interimResults = true; // Allow interim results for better responsiveness
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1; // Only need one result

        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech recognition has started - listening for speech...');
          console.log('✅ You can now speak and your words should appear');
          setIsListening(true);

          // Add a test timeout to see if recognition is actually working
          setTimeout(() => {
            if (userWantsListening && isListening) {
              console.log('🔍 Speech recognition test: Still listening after 5 seconds - this is good!');
              console.log('🔍 If you spoke but no text appeared, check:');
              console.log('   1. Your microphone is not muted');
              console.log('   2. You are speaking clearly and loudly enough');
              console.log('   3. Your browser has microphone permission');
            }
          }, 5000);
        };

        recognitionRef.current.onspeechstart = () => {
          console.log('🗣️ Speech detected - processing...');
          console.log('✅ Your microphone is working! Continue speaking...');
        };

        recognitionRef.current.onspeechend = () => {
          console.log('🔇 Speech ended - processing transcript...');
        };

        recognitionRef.current.onaudiostart = () => {
          console.log('🎵 Audio input started - microphone is active');
        };

        recognitionRef.current.onaudioend = () => {
          console.log('🔇 Audio input ended');
        };

        recognitionRef.current.onsoundstart = () => {
          console.log('🔊 Sound detected by microphone');
        };

        recognitionRef.current.onsoundend = () => {
          console.log('🔇 Sound ended');
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('🎤 Speech recognition result event triggered');
          console.log('🎤 Results count:', event.results.length);

          // Process all results, including interim ones
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          console.log('🎤 Final transcript:', finalTranscript);
          console.log('🎤 Interim transcript:', interimTranscript);

          // Show interim results in real-time
          if (interimTranscript.length > 0) {
            setPendingTranscript(interimTranscript);
            console.log('��� Displaying interim result:', interimTranscript);
          }

          // Process final results
          if (finalTranscript.length > 1) {
            console.log('�� Processing final transcript:', finalTranscript);

            // Clear interim transcript
            setPendingTranscript(null);

            // Temporarily stop listening while processing
            recognitionRef.current?.stop();
            setIsListening(false);

            // Add user message immediately
            const newMessage: Message = {
              id: Date.now().toString(),
              text: finalTranscript.trim(),
              type: 'user',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);

            // Trigger AI response (which will restart listening)
            addBotResponse(finalTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.log('⚠️ Speech recognition error:', event.error);

          // Don't treat "aborted" as an error - it's normal when stopping manually
          if (event.error === 'aborted') {
            console.log('🎤 Speech recognition was stopped (normal operation)');
            return;
          }

          if (event.error === 'not-allowed') {
            console.error('❌ Microphone permission denied!');
            setMicrophoneStatus('permission-denied');
            setUserWantsListening(false);
            alert('Please allow microphone access in your browser settings and refresh the page.');
          } else if (event.error === 'no-speech') {
            console.log('⚠️ No speech detected, continuing to listen...');
            // Restart listening for no-speech error
            setTimeout(() => {
              if (userWantsListening && !isSpeaking) {
                startContinuousListening();
              }
            }, 1000);
          } else {
            console.log(`🔄 Recognition error (${event.error}), restarting...`);
            // Restart listening after error
            setTimeout(() => {
              if (userWantsListening && !isSpeaking) {
                startContinuousListening();
              }
            }, 2000);
          }
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Speech recognition ended');
          console.log('🔍 userWantsListening:', userWantsListening);
          console.log('🔍 isSpeaking:', isSpeaking);
          console.log('🔍 isListening:', isListening);

          // Only restart listening if user has explicitly enabled it and not speaking
          if (userWantsListening && !isSpeaking) {
            console.log('🔄 Restarting recognition automatically...');
            setTimeout(() => {
              try {
                startContinuousListening();
              } catch (error) {
                console.log('⚠️ Failed to restart listening:', error);
              }
            }, 500);
          } else {
            console.log('❌ Not restarting recognition - conditions not met');
          }
        };
      }

      // Wake word recognition disabled to prevent microphone conflicts
      // wakeWordRecognitionRef.current = new SpeechRecognition();
      
      // Wake word recognition setup disabled to prevent microphone conflicts
      console.log('🎤 Wake word detection completely disabled to prevent Safari permission conflicts');

      // Don't start listening immediately - wait for user to click button
    } else {
      console.error('❌ Speech recognition not available in this browser');
      console.log('💡 Please use Chrome, Safari, or Edge with HTTPS/localhost');
      setMicrophoneStatus('not-supported');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Clean up recognition instances
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRecognitionRef.current) {
        wakeWordRecognitionRef.current.stop();
      }
    };
  }, []);

  // Request microphone permission function
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      console.log('🎤 Requesting microphone permission...');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      // Request microphone access to get permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      setMicrophoneStatus('available');
      // Immediately stop the stream since we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('❌ Microphone permission error:', error);
      if (error.name === 'NotAllowedError') {
        console.log('💡 User denied microphone permission. Please allow it in browser settings.');
        setMicrophoneStatus('permission-denied');
      } else if (error.name === 'NotFoundError') {
        console.log('💡 No microphone found. Please connect a microphone.');
        setMicrophoneStatus('not-supported');
      } else {
        console.log('💡 Microphone error:', error.message);
        setMicrophoneStatus('not-supported');
      }
      return false;
    }
  };

  const toggleListening = async () => {
    console.log('🚨 MICROPHONE BUTTON CLICKED! 🚨');
    console.log('🎤 Microphone button clicked - current state:', userWantsListening ? 'STOPPING' : 'STARTING');
    console.log('🔍 Recognition available:', !!recognitionRef.current);
    console.log('🔍 Microphone status:', microphoneStatus);
    console.log('🔍 Browser info:', navigator.userAgent);
    console.log('🔍 Is HTTPS:', window.location.protocol === 'https:');
    console.log('🔍 getUserMedia support:', !!navigator.mediaDevices?.getUserMedia);

    if (!recognitionRef.current) {
      console.error('❌ Speech recognition not available');
      alert('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (userWantsListening) {
      console.log('��� User stopping speech recognition...');
      setUserWantsListening(false); // User no longer wants listening
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Error stopping recognition:', error);
      }
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // No message when stopping
    } else {
      console.log('🎤 User starting speech recognition...');

      // Always request microphone permission when starting
      console.log('🎤 Requesting microphone permission...');
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        console.error('❌ Microphone permission denied');
        alert('Please allow microphone access to use voice features. Check your browser settings and try again.');
        return;
      }

      console.log('�� Microphone permission granted, starting voice recognition...');

      setUserWantsListening(true); // User wants continuous listening

      // Start continuous listening - remove conditional check to avoid race condition
      setTimeout(() => {
        console.log('🎤 Starting continuous listening...');
        startContinuousListening();
      }, 500);

      // No test messages needed
    }
  };

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl flex flex-col h-screen">
      {/* Normal Chat Interface */}
      {!(showComfortEmoji || showShockEmoji || showCuteEmoji || showCryEmoji || showEnjoyEmoji || showACEmoji || showLightingEmoji || showHappyEmoji || showSadEmoji || showAlertEmoji || showYesPermissionEmoji || showNoPermissionEmoji || showMusicEmoji || showHotEmoji || showBreathingEmoji) && (
        <>
          {/* Status Bar */}
          <StatusBar
            title="Co-Driver Assistant"
            showHomeButton={true}
            showTemperature={true}
            onTemperatureExceed={handleTemperatureExceed}
            onExtremeWeather={handleExtremeWeather}
          />

      {/* Conversation Container */}
      <div className="bg-white border border-emotion-face rounded-xl p-3 mb-6 h-44 lg:h-80 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'bot' ? (
                // Bot Message - styled to match Figma design
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-emotion-mouth rounded-full flex items-center justify-center flex-shrink-0 p-1">
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.753 13.9999C18.9957 13.9999 20.003 15.0073 20.003 16.2499V17.155C20.003 18.2487 19.5256 19.2879 18.6958 20.0003C17.1303 21.3442 14.89 22.0011 12 22.0011C9.1105 22.0011 6.87168 21.3445 5.30882 20.0008C4.48019 19.2884 4.00354 18.25 4.00354 17.1572V16.2499C4.00354 15.0073 5.0109 13.9999 6.25354 13.9999H17.753ZM17.753 15.4999H6.25354C5.83933 15.4999 5.50354 15.8357 5.50354 16.2499V17.1572C5.50354 17.8129 5.78953 18.4359 6.28671 18.8634C7.54479 19.945 9.4408 20.5011 12 20.5011C14.56 20.5011 16.4578 19.9447 17.7187 18.8622C18.2166 18.4347 18.503 17.8112 18.503 17.155V16.2499C18.503 15.8357 18.1673 15.4999 17.753 15.4999ZM11.8986 2.00733L12.0003 2.00049C12.38 2.00049 12.6938 2.28264 12.7435 2.64872L12.7503 2.75049L12.7495 3.49949L16.25 3.49999C17.4926 3.49999 18.5 4.50735 18.5 5.74999V10.2546C18.5 11.4972 17.4926 12.5046 16.25 12.5046H7.75C6.50736 12.5046 5.5 11.4972 5.5 10.2546V5.74999C5.5 4.50735 6.50736 3.49999 7.75 3.49999L11.2495 3.49949L11.2503 2.75049C11.2503 2.37079 11.5325 2.057 11.8986 2.00733L12.0003 2.00049L11.8986 2.00733ZM16.25 4.99999H7.75C7.33579 4.99999 7 5.33578 7 5.74999V10.2546C7 10.6688 7.33579 11.0046 7.75 11.0046H16.25C16.6642 11.0046 17 10.6688 17 10.2546V5.74999C17 5.33578 16.6642 4.99999 16.25 4.99999ZM9.74929 6.49999C10.4393 6.49999 10.9986 7.05932 10.9986 7.74928C10.9986 8.43925 10.4393 8.99857 9.74929 8.99857C9.05932 8.99857 8.5 8.43925 8.5 7.74928C8.5 7.05932 9.05932 6.49999 9.74929 6.49999ZM14.242 6.49999C14.932 6.49999 15.4913 7.05932 15.4913 7.74928C15.4913 8.43925 14.932 8.99857 14.242 8.99857C13.5521 8.99857 12.9927 8.43925 12.9927 7.74928C12.9927 7.05932 13.5521 6.49999 14.242 6.49999Z" fill="white"/>
                    </svg>
                  </div>
                  <div className="bg-emotion-orange border border-emotion-mouth rounded-[10px] p-2.5 flex justify-center items-center max-w-xs lg:max-w-sm">
                    <p className="text-white text-base font-medium leading-normal">
                      {message.text}
                      {message.isTyping && (
                        <span className="inline-block ml-1 animate-pulse">
                          <span className="w-1 h-1 bg-white rounded-full inline-block mx-0.5 animate-bounce" style={{animationDelay: '0ms'}}></span>
                          <span className="w-1 h-1 bg-white rounded-full inline-block mx-0.5 animate-bounce" style={{animationDelay: '150ms'}}></span>
                          <span className="w-1 h-1 bg-white rounded-full inline-block mx-0.5 animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                // User Message - styled to match Figma design
                <div className="flex items-start gap-4 justify-end">
                  <div className="bg-emotion-default border border-emotion-face rounded-[10px] p-2.5 flex justify-center items-center max-w-xs lg:max-w-sm">
                    <p className="text-white text-base font-medium leading-normal">
                      {message.text}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-emotion-default rounded-full flex items-center justify-center flex-shrink-0 p-1">
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.7542 13.9999C18.9962 13.9999 20.003 15.0068 20.003 16.2488V16.8242C20.003 17.7185 19.6835 18.5833 19.1019 19.2627C17.5326 21.0962 15.1454 22.0011 12 22.0011C8.85414 22.0011 6.46812 21.0959 4.90182 19.2617C4.32206 18.5828 4.00354 17.7193 4.00354 16.8265V16.2488C4.00354 15.0068 5.0104 13.9999 6.25242 13.9999H17.7542ZM17.7542 15.4999H6.25242C5.83882 15.4999 5.50354 15.8352 5.50354 16.2488V16.8265C5.50354 17.3622 5.69465 17.8802 6.04251 18.2876C7.29582 19.7553 9.2617 20.5011 12 20.5011C14.7383 20.5011 16.7059 19.7553 17.9624 18.2873C18.3113 17.8797 18.503 17.3608 18.503 16.8242V16.2488C18.503 15.8352 18.1678 15.4999 17.7542 15.4999ZM12 2.00464C14.7614 2.00464 17 4.24321 17 7.00464C17 9.76606 14.7614 12.0046 12 12.0046C9.23857 12.0046 7 9.76606 7 7.00464C7 4.24321 9.23857 2.00464 12 2.00464ZM12 3.50464C10.067 3.50464 8.5 5.07164 8.5 7.00464C8.5 8.93764 10.067 10.5046 12 10.5046C13.933 10.5046 15.5 8.93764 15.5 7.00464C15.5 5.07164 13.933 3.50464 12 3.50464Z" fill="white"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Show pending transcript while waiting */}
          {pendingTranscript && (
            <div className="flex items-start gap-4 justify-end">
              <div className="bg-emotion-default border border-emotion-face rounded-xl p-3 max-w-xs lg:max-w-sm opacity-60">
                <p className="text-white text-base font-medium">
                  {pendingTranscript}
                </p>
                <p className="text-white text-xs mt-1 opacity-70">
                  Processing...
                </p>
              </div>
              <div className="w-9 h-9 bg-emotion-default rounded-full flex items-center justify-center flex-shrink-0 opacity-60">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.7542 13.9999C18.9962 13.9999 20.003 15.0068 20.003 16.2488V16.8242C20.003 17.7185 19.6835 18.5833 19.1019 19.2627C17.5326 21.0962 15.1454 22.0011 12 22.0011C8.85414 22.0011 6.46812 21.0959 4.90182 19.2617C4.32206 18.5828 4.00354 17.7193 4.00354 16.8265V16.2488C4.00354 15.0068 5.0104 13.9999 6.25242 13.9999H17.7542ZM17.7542 15.4999H6.25242C5.83882 15.4999 5.50354 15.8352 5.50354 16.2488V16.8265C5.50354 17.3622 5.69465 17.8802 6.04251 18.2876C7.29582 19.7553 9.2617 20.5011 12 20.5011C14.7383 20.5011 16.7059 19.7553 17.9624 18.2873C18.3113 17.8797 18.503 17.3608 18.503 16.8242V16.2488C18.503 15.8352 18.1678 15.4999 17.7542 15.4999ZM12 2.00464C14.7614 2.00464 17 4.24321 17 7.00464C17 9.76606 14.7614 12.0046 12 12.0046C9.23857 12.0046 7 9.76606 7 7.00464C7 4.24321 9.23857 2.00464 12 2.00464ZM12 3.50464C10.067 3.50464 8.5 5.07164 8.5 7.00464C8.5 8.93764 10.067 10.5046 12 10.5046C13.933 10.5046 15.5 8.93764 15.5 7.00464C15.5 5.07164 13.933 3.50464 12 3.50464Z" fill="white"/>
                </svg>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Microphone Section - Updated Figma Design */}
      <div className="flex justify-center items-center gap-4 mt-8">
        {/* Left Sound Wave - Changes color when microphone is active */}
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.0001 3C12.3798 3 12.6936 3.28215 12.7433 3.64823L12.7501 3.75V20.25C12.7501 20.6642 12.4143 21 12.0001 21C11.6204 21 11.3066 20.7178 11.257 20.3518L11.2501 20.25V3.75C11.2501 3.33579 11.5859 3 12.0001 3ZM8.25505 6C8.63475 6 8.94854 6.28215 8.99821 6.64823L9.00505 6.75V17.25C9.00505 17.6642 8.66927 18 8.25505 18C7.87536 18 7.56156 17.7178 7.5119 17.3518L7.50505 17.25V6.75C7.50505 6.33579 7.84084 6 8.25505 6ZM15.7452 6C16.1249 6 16.4387 6.28215 16.4883 6.64823L16.4952 6.75V17.25C16.4952 17.6642 16.1594 18 15.7452 18C15.3655 18 15.0517 17.7178 15.002 17.3518L14.9952 17.25V6.75C14.9952 6.33579 15.3309 6 15.7452 6ZM4.75122 9C5.13092 9 5.44471 9.28215 5.49437 9.64823L5.50122 9.75V14.25C5.50122 14.6642 5.16543 15 4.75122 15C4.37152 15 4.05773 14.7178 4.00807 14.3518L4.00122 14.25V9.75C4.00122 9.33579 4.33701 9 4.75122 9ZM19.2523 9C19.632 9 19.9458 9.28215 19.9955 9.64823L20.0023 9.75V14.2487C20.0023 14.6629 19.6665 14.9987 19.2523 14.9987C18.8726 14.9987 18.5588 14.7165 18.5091 14.3504L18.5023 14.2487V9.75C18.5023 9.33579 18.8381 9 19.2523 9Z" fill={userWantsListening ? "#3A2018" : "#FF8B7E"}/>
        </svg>

        {/* Microphone Button - Changes to dark brown when active */}
        <div className={`flex w-16 h-16 p-1.5 justify-center items-center rounded-full relative ${userWantsListening ? 'bg-[#3A2018]' : 'bg-[#FF8B7E]'}`}>
          <button
            onClick={toggleListening}
            className="flex justify-center items-center w-full h-full hover:scale-105 transition-all duration-300"
            title={
              microphoneStatus === 'permission-denied'
                ? 'Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.'
                : microphoneStatus === 'not-supported'
                ? 'Microphone not supported. Please use Chrome, Safari, or Edge with HTTPS/localhost.'
                : userWantsListening
                ? 'Recording... (Click to stop)'
                : 'Click to record voice message'
            }
          >
            <svg
              className="w-12 h-12 flex-shrink-0"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 12C16 7.58172 19.5817 4 24 4C28.4183 4 32 7.58172 32 12V24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24V12ZM24 6.5C20.9624 6.5 18.5 8.96243 18.5 12V24C18.5 27.0376 20.9624 29.5 24 29.5C27.0376 29.5 29.5 27.0376 29.5 24V12C29.5 8.96243 27.0376 6.5 24 6.5ZM25 37.7148C32.2653 37.2021 38 31.1458 38 23.75C38 23.0596 37.4404 22.5 36.75 22.5C36.0596 22.5 35.5 23.0596 35.5 23.75C35.5 30.1013 30.3513 35.25 24 35.25C17.6487 35.25 12.5 30.1013 12.5 23.75C12.5 23.0596 11.9404 22.5 11.25 22.5C10.5596 22.5 10 23.0596 10 23.75C10 30.9752 15.4734 36.9221 22.5 37.6706V42.75C22.5 43.4404 23.0596 44 23.75 44C24.4404 44 25 43.4404 25 42.75V37.7148Z" fill="white"/>
            </svg>
          </button>
        </div>

        {/* Right Sound Wave - Changes color when microphone is active */}
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.0001 3C12.3798 3 12.6936 3.28215 12.7433 3.64823L12.7501 3.75V20.25C12.7501 20.6642 12.4143 21 12.0001 21C11.6204 21 11.3066 20.7178 11.257 20.3518L11.2501 20.25V3.75C11.2501 3.33579 11.5859 3 12.0001 3ZM8.25505 6C8.63475 6 8.94854 6.28215 8.99821 6.64823L9.00505 6.75V17.25C9.00505 17.6642 8.66927 18 8.25505 18C7.87536 18 7.56156 17.7178 7.5119 17.3518L7.50505 17.25V6.75C7.50505 6.33579 7.84084 6 8.25505 6ZM15.7452 6C16.1249 6 16.4387 6.28215 16.4883 6.64823L16.4952 6.75V17.25C16.4952 17.6642 16.1594 18 15.7452 18C15.3655 18 15.0517 17.7178 15.002 17.3518L14.9952 17.25V6.75C14.9952 6.33579 15.3309 6 15.7452 6ZM4.75122 9C5.13092 9 5.44471 9.28215 5.49437 9.64823L5.50122 9.75V14.25C5.50122 14.6642 5.16543 15 4.75122 15C4.37152 15 4.05773 14.7178 4.00807 14.3518L4.00122 14.25V9.75C4.00122 9.33579 4.33701 9 4.75122 9ZM19.2523 9C19.632 9 19.9458 9.28215 19.9955 9.64823L20.0023 9.75V14.2487C20.0023 14.6629 19.6665 14.9987 19.2523 14.9987C18.8726 14.9987 18.5588 14.7165 18.5091 14.3504L18.5023 14.2487V9.75C18.5023 9.33579 18.8381 9 19.2523 9Z" fill={userWantsListening ? "#3A2018" : "#FF8B7E"}/>
        </svg>
      </div>


          {/* Wellness Activity Overlay - REMOVED */}
          {/* Breathing and meditation features have been removed as requested */}
        </>
      )}

      {/* Emoji Popups - Overlays */}
      {showComfortEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <ComfortFace />
          </div>
        </div>
      )}

      {showShockEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <ShockFace />
          </div>
        </div>
      )}

      {showCuteEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <CuteFace />
          </div>
        </div>
      )}

      {showCryEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <CryFace />
          </div>
        </div>
      )}

      {showEnjoyEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <EnjoyFace />
          </div>
        </div>
      )}

      {showACEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <ACFace />
          </div>
        </div>
      )}

      {showLightingEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <LightingFace />
          </div>
        </div>
      )}

      {showHappyEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <HappyFace />
          </div>
        </div>
      )}

      {showSadEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <SadFace />
          </div>
        </div>
      )}

      {showAlertEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <AlertFace />
          </div>
        </div>
      )}

      {showYesPermissionEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <YesPermissionFace />
          </div>
        </div>
      )}

      {showNoPermissionEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <NoPermissionFace />
          </div>
        </div>
      )}

      {showMusicEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <MusicFace />
          </div>
        </div>
      )}

      {showHotEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <HotFace />
          </div>
        </div>
      )}

      {showBreathingEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spontaneous-pop bg-white rounded-2xl p-8 shadow-2xl max-w-[480px] max-h-[280px] w-[480px] h-[280px]">
            <BreathingFace />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
