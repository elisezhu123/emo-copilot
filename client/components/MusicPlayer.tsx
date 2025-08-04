import React, { useState } from 'react';

interface MusicPlayerProps {
  title?: string;
  artist?: string;
  isPlaying?: boolean;
  progress?: number; // percentage 0-100
  timeRemaining?: string;
  onPlayPause?: () => void;
  onNext?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  title = "Relaxing Music",
  artist = "Jelly Daisy",
  isPlaying = false,
  progress = 74, // roughly matches the 282/381 from design
  timeRemaining = "-1:40",
  onPlayPause,
  onNext,
  onFavorite,
  isFavorited = false
}) => {
  return (
    <div className="flex flex-col w-full max-w-md p-2 pr-4 pl-2 gap-2 rounded-xl border border-emotion-face bg-white">
      {/* Top row with album art, info, and controls */}
      <div className="flex items-center gap-2 w-full">
        {/* Album Art */}
        <div className="w-12 h-12 rounded-lg bg-emotion-orange flex-shrink-0"></div>
        
        {/* Song Info */}
        <div className="flex flex-col py-1 gap-1 flex-1 min-w-0">
          <div className="text-emotion-default font-medium text-base leading-none truncate">
            {title}
          </div>
          <div className="text-emotion-default text-xs leading-none truncate">
            {artist}
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center gap-0 flex-shrink-0">
          {/* Play/Pause Button */}
          <button 
            onClick={onPlayPause}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 2.5C3.89543 2.5 3 3.39543 3 4.5V16.5C3 17.6046 3.89543 18.5 5 18.5H7C8.10457 18.5 9 17.6046 9 16.5V4.5C9 3.39543 8.10457 2.5 7 2.5H5ZM13 2.5C11.8954 2.5 11 3.39543 11 4.5V16.5C11 17.6046 11.8954 18.5 13 18.5H15C16.1046 18.5 17 17.6046 17 16.5V4.5C17 3.39543 16.1046 2.5 15 2.5H13Z" fill="#FF8B7E"/>
              </svg>
            ) : (
              <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.2221 9.18458C18.2586 9.75438 18.2586 11.2437 17.2221 11.8135L7.22259 17.3105C6.22292 17.86 5 17.1367 5 15.996L5 5.00214C5 3.86137 6.22292 3.13812 7.22259 3.68766L17.2221 9.18458Z" fill="#FF8B7E"/>
              </svg>
            )}
          </button>
          
          {/* Next Button */}
          <button 
            onClick={onNext}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity ml-2"
            aria-label="Next track"
          >
            <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.99976 4.75211C2.99976 3.75186 4.11618 3.15676 4.94659 3.71436L13.4458 9.42144C14.1803 9.91464 14.1841 10.9938 13.453 11.4921L4.95375 17.285C4.12398 17.8505 2.99976 17.2562 2.99976 16.2521V4.75211ZM17 4C17 3.72386 16.7761 3.5 16.5 3.5C16.2238 3.5 16 3.72386 16 4V17C16 17.2761 16.2238 17.5 16.5 17.5C16.7761 17.5 17 17.2761 17 17V4Z" fill="#FFA680"/>
            </svg>
          </button>
          
          {/* Favorite Button */}
          <button 
            onClick={onFavorite}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity ml-2"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.38843 4.78963C7.69278 3.07693 4.94954 3.0686 3.26122 4.7739C1.5729 6.4792 1.58114 9.25004 3.27679 10.9627L9.55368 17.3028C9.81404 17.5657 10.2362 17.5657 10.4965 17.3028L16.7408 10.9994C18.4252 9.28856 18.4199 6.52549 16.7239 4.81249C15.0252 3.09671 12.2807 3.08838 10.5894 4.79673L9.99299 5.40026L9.38843 4.78963Z" fill={isFavorited ? "#FF8B7E" : "#FFDCDC"} fillOpacity={isFavorited ? "1" : "0.8"}/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress Bar Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Progress Bar */}
        <div className="flex-1 h-3 rounded-full relative">
          {/* Background Track */}
          <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-2 rounded-full bg-emotion-face"></div>
          {/* Progress Track */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 h-2 rounded-full bg-emotion-orange"
            style={{ width: `${progress}%` }}
          ></div>
          {/* Progress Handle */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-emotion-orange"
            style={{ left: `${progress}%` }}
          ></div>
        </div>
        
        {/* Time Remaining */}
        <div className="text-emotion-default text-xs font-medium w-10 text-right flex-shrink-0">
          {timeRemaining}
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
