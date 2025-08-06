import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


const Starter: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Text-to-speech function
    const speakIntro = () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance("Hi, I am Melo, your emo-copilot assistant today.");
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    };

    // Start speaking after a short delay
    const speechTimer = setTimeout(speakIntro, 1000);

    // Navigate to dashboard after 8 seconds regardless of speech
    const navigationTimer = setTimeout(() => {
      navigate('/dashboard');
    }, 8000);

    return () => {
      clearTimeout(speechTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white px-3 py-2 max-w-md mx-auto lg:max-w-4xl xl:max-w-6xl">
      {/* Main Content - Centered Melo Face */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] w-full p-4">
        {/* Melo Face Container */}
        <div className="flex flex-col items-center gap-6 lg:gap-10 w-full max-w-2xl lg:max-w-4xl xl:max-w-6xl">
          {/* Face Design from Figma - Responsive like dashboard emojis */}
          <div className="relative w-full h-auto">
            <svg
              className="w-full h-auto max-h-[60vh] min-w-[280px] min-h-[200px] lg:max-h-[70vh]"
              viewBox="0 0 400 224"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <g clipPath="url(#clip0_145_969)">
                {/* Left eye with eyebrow */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M90.7222 161.143C117.832 159.519 137.226 137.79 138.952 113.269H36.2991C38.2283 139.77 60.8707 162.92 90.7222 161.143Z" 
                  fill="#3A2018"
                />
                
                {/* Left eyebrow */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M5.02602 114.589C2.28455 114.589 0 112.355 0 109.563C0 106.771 2.23379 104.588 5.02602 104.588H138.495C141.236 104.588 143.521 106.822 143.521 109.563C143.521 112.305 141.287 114.589 138.495 114.589H5.02602Z" 
                  fill="#3A2018"
                />
                
                {/* Right eye with eyebrow */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M312.121 161.143C285.011 159.519 265.617 137.79 263.891 113.269H366.544C364.615 139.77 341.972 162.92 312.121 161.143Z" 
                  fill="#3A2018"
                />
                
                {/* Right eyebrow */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M365.325 104.537C368.067 104.537 370.351 106.771 370.351 109.512C370.351 112.254 368.118 114.538 365.325 114.538H234.497C231.755 114.538 229.471 112.305 229.471 109.512C229.471 106.72 231.704 104.537 234.497 104.537H365.325Z" 
                  fill="#3A2018"
                />
                
                {/* Left eye pupil */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M113.517 143.222C121.538 140.582 125.854 131.901 123.163 123.88C120.472 115.858 111.842 111.543 103.82 114.234C95.799 116.924 91.4837 125.555 94.1744 133.576C96.8651 141.598 105.496 145.913 113.517 143.222Z" 
                  fill="white"
                />
                
                {/* Right eye pupil */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M332.58 143.222C324.559 140.582 320.244 131.901 322.934 123.88C325.625 115.858 334.256 111.543 342.277 114.234C350.298 116.924 354.614 125.555 351.923 133.576C349.232 141.598 340.602 145.913 332.58 143.222Z" 
                  fill="white"
                />
                
                {/* Mouth */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M175.098 220.643C171.088 219.679 168.6 215.668 169.565 211.657C170.529 207.647 174.54 205.159 178.551 206.124C178.652 206.124 218.505 215.871 244.244 195.818C247.493 193.279 252.215 193.888 254.753 197.138C257.292 200.387 256.682 205.108 253.433 207.647C222.008 232.117 175.2 220.694 175.048 220.643H175.098Z" 
                  fill="#3A2018"
                />
                
                {/* Left eyebrow curve */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M27.0085 52.4492C23.8102 55.0384 19.0887 54.5815 16.4996 51.3831C13.9104 48.1847 14.3673 43.4633 17.5657 40.8742C30.41 30.4668 47.8234 19.2978 67.3182 14.881C87.5238 10.3119 109.709 12.9518 131.133 30.6191C134.332 33.259 134.789 37.9804 132.149 41.1788C129.509 44.3771 124.787 44.8341 121.589 42.1941C104.43 27.9791 86.7115 25.8976 70.6181 29.5022C53.814 33.259 38.4821 43.2095 27.0085 52.5V52.4492Z" 
                  fill="#3A2018"
                />
                
                {/* Right eyebrow curve */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M233.177 55.7491C230.334 52.7538 230.385 48.0324 233.38 45.1387C236.375 42.2957 241.097 42.3464 243.99 45.3417C246.173 47.5755 248.661 49.3524 251.504 50.4693C254.042 51.4846 256.885 51.9416 260.033 51.7385C267.293 51.2308 285.265 44.9864 307.044 34.5789C324.762 26.1007 344.714 14.9826 363.244 1.98598C366.645 -0.400108 371.316 0.462945 373.651 3.81362C376.038 7.21507 375.174 11.8349 371.824 14.221C352.532 27.7253 331.819 39.3004 313.492 48.0324C289.986 59.2521 269.831 66.055 261.048 66.6642C255.565 67.0704 250.539 66.2073 245.97 64.4305C241.147 62.5013 236.883 59.506 233.177 55.6984V55.7491Z" 
                  fill="#3A2018"
                />
                
                {/* Left cheek/blush */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M45.5388 205.87C-10.2043 206.124 -9.79819 171.398 45.9449 171.144C101.688 170.891 101.282 205.616 45.5388 205.87Z" 
                  fill="#FFDCDC" 
                  fillOpacity="0.8"
                />
                
                {/* Right cheek/blush */}
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M358.421 205.87C414.164 206.124 413.758 171.398 358.015 171.144C302.272 170.891 302.678 205.616 358.421 205.87Z" 
                  fill="#FFDCDC" 
                  fillOpacity="0.8"
                />
              </g>
              <defs>
                <clipPath id="clip0_145_969">
                  <rect width="400" height="222.668" fill="white" transform="translate(0 0.666016)"/>
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* Message Container - Responsive like dashboard cards */}
          <div className="bg-white border border-emotion-face rounded-xl p-4 lg:p-6 w-full max-w-md lg:max-w-2xl backdrop-blur-sm">
            <p className="text-center text-emotion-default font-medium text-base lg:text-xl xl:text-2xl leading-relaxed">
              Hi, I am Melo, your emo-copilot assistant today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Starter;
