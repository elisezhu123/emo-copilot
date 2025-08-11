import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import { musicService } from '../services/musicService';
import { simpleMusicService } from '../services/simpleMusicService';

const MusicSelection = () => {
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Load saved genres on component mount
  useEffect(() => {
    const savedGenres = musicService.loadSelectedGenres();
    console.log('🎵 Loaded saved genres:', savedGenres);
    setSelectedGenres(savedGenres || []);
  }, []);

  const handleNavigateToPlaylists = () => {
    if (selectedGenres.length > 0) {
      navigate('/music-playlists');
    }
  };

  const musicGenres = [
    { name: 'Classical', color: 'bg-emotion-default' },
    { name: 'Ambient', color: 'bg-emotion-mouth' },
    { name: 'Jazz', color: 'bg-emotion-blue' },
    { name: 'Folk', color: 'bg-emotion-orange' },
    { name: 'Rock', color: 'bg-emotion-mouth' },
    { name: 'Blues', color: 'bg-emotion-blue' },
    { name: 'Chillout', color: 'bg-emotion-orange' },
    { name: 'Country', color: 'bg-emotion-default' },
    { name: 'Hip-Pop', color: 'bg-emotion-blue' },
    { name: 'Electro Pop', color: 'bg-emotion-orange' },
    { name: 'Downbeat', color: 'bg-emotion-default' },
    { name: 'New Age', color: 'bg-emotion-mouth' },
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

      {/* Header with Right Arrow */}
      <div className="relative text-center mb-6 lg:mb-8 px-4">
        <h1 className="text-base lg:text-xl text-emotion-default leading-tight">
          What <span className="text-emotion-mouth">types of music</span> do you like to listen ?
        </h1>
        <p className="text-xs lg:text-sm text-emotion-default mt-1">
          (You can choose <span className="text-emotion-mouth">more than one</span> !!!)
        </p>

        {/* Right Arrow - positioned absolutely like in Figma */}
        <button
          onClick={handleNavigateToPlaylists}
          disabled={selectedGenres.length === 0}
          className={`
            absolute right-0 top-0 w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center
            transition-all duration-200 hover:scale-105
            ${selectedGenres.length > 0
              ? 'text-emotion-default cursor-pointer'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <path
              d="M13.2673 4.20926C12.9674 3.92357 12.4926 3.93511 12.2069 4.23504C11.9212 4.53497 11.9328 5.0097 12.2327 5.29539L18.4841 11.25H3.75C3.33579 11.25 3 11.5858 3 12C3 12.4142 3.33579 12.75 3.75 12.75H18.4842L12.2327 18.7047C11.9328 18.9904 11.9212 19.4651 12.2069 19.7651C12.4926 20.065 12.9674 20.0765 13.2673 19.7908L20.6862 12.7241C20.8551 12.5632 20.9551 12.358 20.9861 12.1446C20.9952 12.0978 21 12.0495 21 12C21 11.9504 20.9952 11.902 20.986 11.8551C20.955 11.6419 20.855 11.4368 20.6862 11.276L13.2673 4.20926Z"
              fill="currentColor"
            />
          </svg>
        </button>
        
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
