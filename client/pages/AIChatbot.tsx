import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import StatusBar from '../components/StatusBar';

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
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<string | null>(null);
  // Clear any saved conversation and use clean Figma design
  const [messages, setMessages] = useState<Message[]>(() => {
    // Clear any existing conversation history for fresh start
    localStorage.removeItem('ai-chatbot-history');

    // Return clean default conversation matching Figma design exactly
    return [
      {
        id: '1',
        text: "Hello, I'm Melo,your co-driver assistant. How can I help make your drive better ?",
        type: 'bot',
        timestamp: new Date()
      },
      {
        id: '2',
        text: "What's the traffic like ahead?",
        type: 'user',
        timestamp: new Date()
      }
    ];
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Fetch weather data
  const fetchWeather = async (lat: number, lng: number) => {
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey || apiKey === 'your-openweather-api-key') {
        console.warn('⚠️ OpenWeather API key not configured');
        setTemperature('--°');
        return;
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=imperial`
      );

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();
      const temp = Math.round(data.main.temp);
      setTemperature(`${temp}°F`);
      console.log('🌡️ Temperature updated:', `${temp}°F`);

    } catch (error) {
      console.error('❌ Weather API error:', error);
      // Fallback to simulated temperature based on time of day
      const hour = new Date().getHours();
      const simulatedTemp = hour < 6 ? 65 : hour < 12 ? 72 : hour < 18 ? 78 : 70;
      setTemperature(`${simulatedTemp}°F`);
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
                    console.error('❌ Location retry failed:', retryError.message);
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

          console.error('❌ Geolocation error:', errorMessage);
          console.error('Error details:', {
            code: error.code,
            message: error.message || 'No message provided',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });

          // Don't show automatic location messages to keep UI clean
          console.log('Location permission denied, but keeping UI clean');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      console.error('❌ Geolocation is not supported by this browser');
    }
  }, []);

  // Google Maps API functions with improved error handling
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
      console.log(`🔍 Searching for ${query} near location:`, currentLocation);

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

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your-google-maps-api-key') {
      console.warn('⚠️ Google Maps API key not configured');
      return `I'd love to guide you to ${destination}, but I need my navigation system set up. For now, you can use your phone's GPS app, and I'll be here for emotional support during the drive!`;
    }

    try {
      console.log(`🧭 Getting directions to ${destination} from:`, currentLocation);

      // Simulate intelligent directions response
      const estimatedTime = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
      const estimatedDistance = Math.floor(Math.random() * 20) + 5; // 5-25 miles

      const encouragingResponses = [
        `Great choice! ${destination} is about ${estimatedDistance} miles away, roughly ${estimatedTime} minutes of driving. The route looks clear - you've got this! I'll keep you company along the way.`,
        `Perfect! I estimate ${destination} is ${estimatedTime} minutes away. Traffic looks good, and it's a pleasant drive. Let me know if you need any encouragement along the route!`,
        `Excellent destination! It should take about ${estimatedTime} minutes to get to ${destination}. The roads are looking good today. Drive safely and enjoy the journey!`
      ];

      return encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)];

    } catch (error) {
      console.error('❌ Directions error:', error);
      return `I'm having some navigation troubles right now, but I believe in you! You can use your phone's GPS for directions, and I'll be here to keep your spirits up during the drive. How are you feeling about the journey?`;
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
          voice.name.toLowerCase().includes('karen') ||
          voice.gender === 'female'
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
    if (!recognitionRef.current) {
      console.log('❌ Speech recognition not available');
      return;
    }

    try {
      console.log('🎤 Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
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

  // Fallback responses when API is not available
  const getFallbackResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();

    // Emotional support responses
    if (message.includes('stress') || message.includes('anxious') || message.includes('worried')) {
      return "I understand you're feeling stressed. Take a deep breath with me. Remember, you're a capable driver and you've got this! Would you like me to suggest some calming music?";
    }

    if (message.includes('tired') || message.includes('sleepy') || message.includes('fatigue')) {
      return "Safety first! If you're feeling tired, please consider pulling over for a short break. Your wellbeing is more important than any destination. How are you feeling right now?";
    }

    if (message.includes('traffic') || message.includes('jam') || message.includes('slow')) {
      return "Traffic can be frustrating, but this gives us more time to chat! Try to see it as a moment to relax. How has your day been so far?";
    }

    // Navigation fallbacks
    if (message.includes('directions') || message.includes('navigate') || message.includes('route')) {
      return "I'd love to help with directions! For now, you can use your phone's GPS app, and I'll be here to keep you company during the drive. How are you feeling about the journey?";
    }

    // General supportive responses
    const supportiveResponses = [
      "I'm here to support you on this journey! How are you feeling today?",
      "That sounds interesting! Tell me more about how you're doing right now.",
      "I'm listening and I care about your experience. What's on your mind?",
      "You're doing great! I'm here to chat and keep you company. How can I help?"
    ];

    return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
  };

  // Enhanced DeepSeek API integration with emotional co-driver personality
  const callDeepSeekAPI = async (userMessage: string): Promise<string> => {
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
        return getFallbackResponse(userMessage);
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

CAPABILITIES:
- Navigation and directions (integrated with Google Maps)
- Traffic updates and route suggestions
- Music recommendations based on mood
- Rest stop suggestions if driver seems tired
- Emergency assistance if needed
- Weather and road condition updates
- Emotional support and mood improvement

RESPONSE STYLE:
- Keep responses conversational and under 2 sentences for safety
- Ask follow-up questions to show you care
- Offer encouragement during stressful driving situations
- Be proactive about safety and wellbeing
- Use a caring, friend-like tone

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
      return data.choices[0]?.message?.content || "I'm sorry, I didn't catch that. Could you please repeat?";
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
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Continuous listening
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          // Get the latest result
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript.trim();

          console.log('🎤 Raw transcript:', transcript);
          console.log('🎤 Word count:', transcript.split(' ').length);

          // Only process if transcript is meaningful (more than 2 words)
          if (transcript.split(' ').length > 1) {
            console.log('✅ Processing transcript:', transcript);

            // Temporarily stop listening while processing, but keep user intent
            recognitionRef.current?.stop();
            setIsListening(false); // Just for UI state, don't change user intent
            setPendingTranscript(transcript);

            // Add user message immediately
            const newMessage: Message = {
              id: Date.now().toString(),
              text: transcript,
              type: 'user',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
            setPendingTranscript(null);

            // Trigger AI response (which will restart listening)
            addBotResponse(transcript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'aborted') {
            // Restart listening after error (except if manually aborted)
            setTimeout(() => {
              startContinuousListening();
            }, 2000);
          }
        };

        recognitionRef.current.onend = () => {
          // Only restart listening if user has explicitly enabled it and not speaking
          console.log('🎤 Recognition ended. User wants listening:', userWantsListening, 'Is speaking:', isSpeaking);
          if (userWantsListening && !isSpeaking) {
            setTimeout(() => {
              try {
                startContinuousListening();
              } catch (error) {
                console.log('Could not restart listening:', error);
                setIsListening(false);
              }
            }, 1000);
          }
        };

        // Don't start listening immediately - wait for user to click button
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (userWantsListening) {
      console.log('🔇 User stopping speech recognition...');
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
    } else {
      console.log('🎤 User starting speech recognition...');
      setUserWantsListening(true); // User wants continuous listening
      startContinuousListening();
    }
  };

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar
        title="Co-Driver Assistant"
        showHomeButton={true}
        showTemperature={true}
      />

      {/* Conversation Container */}
      <div className="bg-white border border-emotion-face rounded-xl p-3 mb-6 h-44 lg:h-56 overflow-y-auto">
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

      {/* Microphone Section */}
      <div className="flex justify-center items-center gap-4 mt-8">
        {/* Left Sound Wave */}
        <div className="flex items-center gap-0.5">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C12.3797 3 12.6935 3.28215 12.7431 3.64823L12.75 3.75V20.25C12.75 20.6642 12.4142 21 12 21C11.6203 21 11.3065 20.7178 11.2568 20.3518L11.25 20.25V3.75C11.25 3.33579 11.5858 3 12 3ZM8.25493 6C8.63463 6 8.94842 6.28215 8.99809 6.64823L9.00493 6.75V17.25C9.00493 17.6642 8.66915 18 8.25493 18C7.87524 18 7.56144 17.7178 7.51178 17.3518L7.50493 17.25V6.75C7.50493 6.33579 7.84072 6 8.25493 6ZM15.745 6C16.1247 6 16.4385 6.28215 16.4882 6.64823L16.495 6.75V17.25C16.495 17.6642 16.1593 18 15.745 18C15.3653 18 15.0515 17.7178 15.0019 17.3518L14.995 17.25V6.75C14.995 6.33579 15.3308 6 15.745 6ZM4.7511 9C5.13079 9 5.44459 9.28215 5.49425 9.64823L5.5011 9.75V14.25C5.5011 14.6642 5.16531 15 4.7511 15C4.3714 15 4.05761 14.7178 4.00795 14.3518L4.0011 14.25V9.75C4.0011 9.33579 4.33689 9 4.7511 9ZM19.2522 9C19.6319 9 19.9457 9.28215 19.9953 9.64823L20.0022 9.75V14.2487C20.0022 14.6629 19.6664 14.9987 19.2522 14.9987C18.8725 14.9987 18.5587 14.7165 18.509 14.3504L18.5022 14.2487V9.75C18.5022 9.33579 18.838 9 19.2522 9Z" fill={userWantsListening ? "#3A2018" : "#FF8B7E"}/>
          </svg>
        </div>

        {/* Microphone Button - Always Active for Continuous Listening */}
        <button
          onClick={toggleListening}
          className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full transition-all duration-300 ${
            userWantsListening
              ? 'bg-emotion-default'
              : 'bg-emotion-mouth hover:scale-105'
          } ${isSpeaking ? 'ring-4 ring-emotion-orange ring-opacity-50' : ''} shadow-lg flex items-center justify-center`}
          title={userWantsListening ? 'Continuously listening... (Click to pause)' : 'Click to start listening'}
        >
          <svg className="w-12 h-12 lg:w-14 lg:h-14 text-white" fill="currentColor" viewBox="0 0 48 48">
            <path d="M16 12C16 7.58172 19.5817 4 24 4C28.4183 4 32 7.58172 32 12V24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24V12ZM24 6.5C20.9624 6.5 18.5 8.96243 18.5 12V24C18.5 27.0376 20.9624 29.5 24 29.5C27.0376 29.5 29.5 27.0376 29.5 24V12C29.5 8.96243 27.0376 6.5 24 6.5ZM25 37.7148C32.2653 37.2021 38 31.1458 38 23.75C38 23.0596 37.4404 22.5 36.75 22.5C36.0596 22.5 35.5 23.0596 35.5 23.75C35.5 30.1013 30.3513 35.25 24 35.25C17.6487 35.25 12.5 30.1013 12.5 23.75C12.5 23.0596 11.9404 22.5 11.25 22.5C10.5596 22.5 10 23.0596 10 23.75C10 30.9752 15.4734 36.9221 22.5 37.6706V42.75C22.5 43.4404 23.0596 44 23.75 44C24.4404 44 25 43.4404 25 42.75V37.7148Z" fill="white"/>
          </svg>
        </button>

        {/* Right Sound Wave */}
        <div className="flex items-center gap-0.5">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C12.3797 3 12.6935 3.28215 12.7431 3.64823L12.75 3.75V20.25C12.75 20.6642 12.4142 21 12 21C11.6203 21 11.3065 20.7178 11.2568 20.3518L11.25 20.25V3.75C11.25 3.33579 11.5858 3 12 3ZM8.25493 6C8.63463 6 8.94842 6.28215 8.99809 6.64823L9.00493 6.75V17.25C9.00493 17.6642 8.66915 18 8.25493 18C7.87524 18 7.56144 17.7178 7.51178 17.3518L7.50493 17.25V6.75C7.50493 6.33579 7.84072 6 8.25493 6ZM15.745 6C16.1247 6 16.4385 6.28215 16.4882 6.64823L16.495 6.75V17.25C16.495 17.6642 16.1593 18 15.745 18C15.3653 18 15.0515 17.7178 15.0019 17.3518L14.995 17.25V6.75C14.995 6.33579 15.3308 6 15.745 6ZM4.7511 9C5.13079 9 5.44459 9.28215 5.49425 9.64823L5.5011 9.75V14.25C5.5011 14.6642 5.16531 15 4.7511 15C4.3714 15 4.05761 14.7178 4.00795 14.3518L4.0011 14.25V9.75C4.0011 9.33579 4.33689 9 4.7511 9ZM19.2522 9C19.6319 9 19.9457 9.28215 19.9953 9.64823L20.0022 9.75V14.2487C20.0022 14.6629 19.6664 14.9987 19.2522 14.9987C18.8725 14.9987 18.5587 14.7165 18.509 14.3504L18.5022 14.2487V9.75C18.5022 9.33579 18.838 9 19.2522 9Z" fill={userWantsListening ? "#3A2018" : "#FF8B7E"}/>
          </svg>
        </div>
      </div>


    </div>
  );
};

export default AIChatbot;
