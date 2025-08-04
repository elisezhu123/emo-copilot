import React, { useState, useRef, useCallback } from 'react';

interface MusicProgressBarProps {
  currentTime?: number;
  duration?: number;
  onProgressChange?: (progress: number) => void;
}

const MusicProgressBar: React.FC<MusicProgressBarProps> = ({
  currentTime = 0,
  duration = 0,
  onProgressChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Calculate real progress from current time and duration
  const realProgress = duration > 0 ? currentTime / duration : 0;
  const [localProgress, setLocalProgress] = useState(realProgress);
  
  // Update local progress when not dragging
  React.useEffect(() => {
    if (!isDragging) {
      setLocalProgress(realProgress);
    }
  }, [realProgress, isDragging]);
  
  const progress = isDragging ? localProgress : realProgress;

  const updateProgress = useCallback((clientX: number) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const newProgress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    setLocalProgress(newProgress);
    onProgressChange?.(newProgress);
  }, [onProgressChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateProgress(e.clientX);
  }, [updateProgress]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateProgress(e.clientX);
  }, [isDragging, updateProgress]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateProgress(e.touches[0].clientX);
  }, [updateProgress]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateProgress(e.touches[0].clientX);
  }, [isDragging, updateProgress]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global event listeners for mouse/touch events
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = duration - (progress * duration);

  return (
    <div className="flex items-center gap-2 font-light text-sm lg:gap-4">
      <div 
        ref={progressBarRef}
        className="flex-1 relative h-3 lg:h-4 cursor-pointer"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-emotion-face rounded-full"></div>
        
        {/* Progress fill */}
        <div 
          className="absolute left-0 top-0 h-full bg-emotion-orange rounded-full transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        ></div>
        
        {/* Draggable circle */}
        <div 
          className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
          style={{ left: `${progress * 100}%` }}
        >
          <div 
            className={`w-4 h-4 bg-white border-2 border-emotion-orange rounded-full lg:w-5 lg:h-5 cursor-grab transition-transform duration-150 ${
              isDragging ? 'scale-110 cursor-grabbing shadow-lg' : 'hover:scale-105'
            }`}
          ></div>
        </div>
      </div>
      
      <span className="text-xs text-emotion-default lg:text-sm">
        -{formatTime(remainingTime)}
      </span>
    </div>
  );
};

export default MusicProgressBar;
