import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';

const MinimalDashboard = () => {
  const navigate = useNavigate();

  const handleAIChatbot = () => {
    console.log('AI Chatbot clicked');
    navigate('/ai-chatbot');
  };

  const handleMusicSelection = () => {
    console.log('Music Selection clicked');
    navigate('/music-selection');
  };

  const handleCooling = () => {
    console.log('Cooling clicked');
  };

  const handleLighting = () => {
    console.log('Lighting clicked');
  };

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar 
        title="Emo Copilot" 
        showHomeButton={false}
        showTemperature={true}
      />
      
      <div className="space-y-6 mt-6">
        <h1 className="text-2xl font-bold text-center">Minimal Dashboard Test</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleAIChatbot}
            className="bg-emotion-mouth text-white py-4 px-6 rounded-lg text-center font-medium hover:scale-105 transition-transform"
          >
            AI Chatbot
          </button>
          
          <button
            onClick={handleMusicSelection}
            className="bg-emotion-orange text-white py-4 px-6 rounded-lg text-center font-medium hover:scale-105 transition-transform"
          >
            Select Music
          </button>
          
          <button
            onClick={handleCooling}
            className="bg-emotion-blue text-white py-4 px-6 rounded-lg text-center font-medium hover:scale-105 transition-transform"
          >
            Cooling AC
          </button>
          
          <button
            onClick={handleLighting}
            className="bg-flowkit-green text-white py-4 px-6 rounded-lg text-center font-medium hover:scale-105 transition-transform"
          >
            Lighting
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinimalDashboard;
