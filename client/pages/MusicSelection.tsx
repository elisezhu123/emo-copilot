import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import { musicService } from '../services/musicService';
import { simpleMusicService } from '../services/simpleMusicService';

const MusicSelection = () => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Load saved genres on component mount
  useEffect(() => {
    const savedGenres = musicService.loadSelectedGenres();
    console.log('🎵 Loaded saved genres:', savedGenres);
    setSelectedGenres(savedGenres || []);
  }, []);

  const musicGenres = [
    { name: 'Classical', color: 'bg-emotion-default' },
    { name: 'Ambient', color: 'bg-emotion-mouth' },
    { name: 'Piano', color: 'bg-emotion-blue' },
    { name: 'Peaceful', color: 'bg-emotion-orange' },
    { name: 'Jazz', color: 'bg-emotion-mouth' },
    { name: 'Electronic', color: 'bg-emotion-blue' },
    { name: 'Folk', color: 'bg-emotion-orange' },
    { name: 'Meditation', color: 'bg-emotion-default' },
    { name: 'Natural', color: 'bg-emotion-blue' },
    { name: 'Chill', color: 'bg-emotion-orange' },
    { name: 'Instrumental', color: 'bg-emotion-default' },
    { name: 'Relaxing', color: 'bg-emotion-mouth' },
  ];

  const toggleGenre = async (genreName: string) => {
    const newGenres = selectedGenres.includes(genreName)
      ? selectedGenres.filter(genre => genre !== genreName)
      : [...selectedGenres, genreName];

    setSelectedGenres(newGenres);
    
    // Save to both services
    musicService.saveSelectedGenres(newGenres);
    
    // Update simple music service with new genres
    if (newGenres.length > 0) {
      console.log('🎵 Updating music selection with genres:', newGenres);
      await simpleMusicService.updateGenres(newGenres);
    }
  };

  const isSelected = (genreName: string) => selectedGenres.includes(genreName);

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Status Bar */}
      <StatusBar
        title="Music Selection"
        showHomeButton={true}
        showTemperature={true}
      />

      {/* Header */}
      <div className="text-center mb-6 lg:mb-8 px-4">
        <h1 className="text-base lg:text-xl text-emotion-default leading-tight">
          What <span className="text-emotion-mouth">types of music</span> do you like to listen ?
        </h1>
        <p className="text-xs lg:text-sm text-emotion-default mt-1">
          (You can choose <span className="text-emotion-mouth">more than one</span> !!!)
        </p>
        
        {/* Current Selection Status */}
        <div className="mt-3 p-2 bg-emotion-face/10 rounded-lg">
          <p className="text-xs text-emotion-default">
            {selectedGenres.length > 0 
              ? `Selected: ${selectedGenres.join(', ')} (${selectedGenres.length} genres)`
              : 'No genres selected - please select genres to enable music'
            }
          </p>
        </div>
      </div>

      {/* Music Genre Grid */}
      <div className="space-y-4 lg:space-y-6">
        {/* Row 1 */}
        <div className="grid grid-cols-4 gap-3 lg:gap-4">
          {musicGenres.slice(0, 4).map((genre, index) => (
            <button
              key={genre.name}
              onClick={() => toggleGenre(genre.name)}
              className={`
                flex flex-col items-center justify-center gap-1 lg:gap-2
                p-3 lg:p-4 rounded-xl border-2 border-emotion-face
                ${genre.color} text-white font-medium
                text-sm lg:text-base h-20 lg:h-24
                transition-all duration-200 hover:scale-105
                ${isSelected(genre.name) ? 'ring-2 ring-emotion-default' : ''}
              `}
            >
              <span className="text-center leading-tight">{genre.name}</span>
              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-sm bg-white relative transition-all duration-200 border border-gray-200">
                {isSelected(genre.name) && (
                  <svg
                    className="absolute inset-0 w-3 h-2 lg:w-3.5 lg:h-2.5 m-auto"
                    viewBox="0 0 9 7"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.26579 0.390099C7.14379 0.267657 6.94376 0.267657 6.82176 0.390099L3.12832 4.08265L1.22621 2.16753C1.10421 2.04464 0.905524 2.04464 0.782633 2.16753L0.116153 2.83356C-0.0058402 2.9551 -0.0058402 3.15514 0.116153 3.27758L2.90451 6.08433C3.02651 6.20587 3.2252 6.20587 3.34854 6.08433L7.93182 1.5006C8.0556 1.37816 8.0556 1.17768 7.93182 1.05478L7.26579 0.390099Z"
                      fill="#3A2018"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-4 gap-3 lg:gap-4">
          {musicGenres.slice(4, 8).map((genre, index) => (
            <button
              key={genre.name}
              onClick={() => toggleGenre(genre.name)}
              className={`
                flex flex-col items-center justify-center gap-1 lg:gap-2
                p-3 lg:p-4 rounded-xl border-2 border-emotion-face
                ${genre.color} text-white font-medium
                text-sm lg:text-base h-20 lg:h-24
                transition-all duration-200 hover:scale-105
                ${isSelected(genre.name) ? 'ring-2 ring-emotion-default' : ''}
              `}
            >
              <span className="text-center leading-tight">{genre.name}</span>
              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-sm bg-white relative transition-all duration-200 border border-gray-200">
                {isSelected(genre.name) && (
                  <svg
                    className="absolute inset-0 w-3 h-2 lg:w-3.5 lg:h-2.5 m-auto"
                    viewBox="0 0 9 7"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.26579 0.390099C7.14379 0.267657 6.94376 0.267657 6.82176 0.390099L3.12832 4.08265L1.22621 2.16753C1.10421 2.04464 0.905524 2.04464 0.782633 2.16753L0.116153 2.83356C-0.0058402 2.9551 -0.0058402 3.15514 0.116153 3.27758L2.90451 6.08433C3.02651 6.20587 3.2252 6.20587 3.34854 6.08433L7.93182 1.5006C8.0556 1.37816 8.0556 1.17768 7.93182 1.05478L7.26579 0.390099Z"
                      fill="#3A2018"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-4 gap-3 lg:gap-4">
          {musicGenres.slice(8, 12).map((genre, index) => (
            <button
              key={genre.name}
              onClick={() => toggleGenre(genre.name)}
              className={`
                flex flex-col items-center justify-center gap-1 lg:gap-2
                p-3 lg:p-4 rounded-xl border-2 border-emotion-face
                ${genre.color} text-white font-medium
                text-sm lg:text-base h-20 lg:h-24
                transition-all duration-200 hover:scale-105
                ${isSelected(genre.name) ? 'ring-2 ring-emotion-default' : ''}
              `}
            >
              <span className="text-center leading-tight">{genre.name}</span>
              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-sm bg-white relative transition-all duration-200 border border-gray-200">
                {isSelected(genre.name) && (
                  <svg
                    className="absolute inset-0 w-3 h-2 lg:w-3.5 lg:h-2.5 m-auto"
                    viewBox="0 0 9 7"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.26579 0.390099C7.14379 0.267657 6.94376 0.267657 6.82176 0.390099L3.12832 4.08265L1.22621 2.16753C1.10421 2.04464 0.905524 2.04464 0.782633 2.16753L0.116153 2.83356C-0.0058402 2.9551 -0.0058402 3.15514 0.116153 3.27758L2.90451 6.08433C3.02651 6.20587 3.2252 6.20587 3.34854 6.08433L7.93182 1.5006C8.0556 1.37816 8.0556 1.17768 7.93182 1.05478L7.26579 0.390099Z"
                      fill="#3A2018"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MusicSelection;
