import React, { useState, useEffect, useRef } from 'react';
import { arduinoService, HRVData, HeartRateData } from '../services/arduinoService';
import { carStateManager, DriverStateType } from '../services/carStateManager';

interface DriverStateProps {
  className?: string;
}

interface EmotionalAnalysisData {
  timestamp: number;
  heartRate: number;
  sdnn: number;
}

const DriverState: React.FC<DriverStateProps> = ({ className = '' }) => {
  const [currentState, setCurrentState] = useState<DriverStateType>('neutral');
  const [currentHRV, setCurrentHRV] = useState(173);
  const [currentHeartRate, setCurrentHeartRate] = useState(75);
  const [baselineHeartRate, setBaselineHeartRate] = useState<number | null>(null);
  const [baselineSDNN, setBaselineSDNN] = useState<number | null>(null);
  const [emotionalHistory, setEmotionalHistory] = useState<EmotionalAnalysisData[]>([]);
  const [stateStartTime, setStateStartTime] = useState<number>(Date.now());
  const [calibrationPeriod, setCalibrationPeriod] = useState<boolean>(true);
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const calibrationStartTime = useRef<number>(Date.now());
  const CALIBRATION_DURATION = 2 * 60 * 1000; // 2 minutes for baseline calibration

  useEffect(() => {
    // Subscribe to car state changes for manual emotion selection
    const unsubscribeCarState = carStateManager.subscribe((carState) => {
      if (carState.driverState !== currentState) {
        console.log('🧠 Manual emotion selection:', carState.driverState);
        setCurrentState(carState.driverState);
        setManualOverride(true);
        setStateStartTime(Date.now());

        // Reset manual override after 5 minutes to allow automatic detection again
        setTimeout(() => {
          setManualOverride(false);
          console.log('🧠 Manual override expired, resuming automatic detection');
        }, 5 * 60 * 1000);
      }
    });

    // Subscribe to HRV data changes
    const unsubscribeHRV = arduinoService.subscribeHRV((data: HRVData) => {
      setCurrentHRV(data.value);
    });

    // Subscribe to heart rate data changes
    const unsubscribeHR = arduinoService.subscribe((data: HeartRateData) => {
      if (data.values.length > 0) {
        const latestHR = data.values[data.values.length - 1];
        setCurrentHeartRate(latestHR);

        const currentTime = Date.now();
        const isCalibrating = currentTime - calibrationStartTime.current < CALIBRATION_DURATION;

        if (isCalibrating) {
          // During calibration, collect baseline data - use latest HR value from array
          const latestHRValue = data.values.length > 0 ? data.values[data.values.length - 1] : latestHR;
          collectBaselineData(latestHR, latestHRValue);
        } else {
          // After calibration, perform emotional analysis (only if not manually overridden)
          if (calibrationPeriod) {
            setCalibrationPeriod(false);
            console.log('🎯 Calibration complete. Baseline HR:', baselineHeartRate, 'Baseline SDNN:', baselineSDNN);
          }

          // Only perform automatic analysis if not manually overridden
          if (!manualOverride) {
            // Use latest HR value from array for HRV analysis
            const latestHRValue = data.values.length > 0 ? data.values[data.values.length - 1] : latestHR;
            performEmotionalAnalysis(latestHR, latestHRValue, currentTime);
          }
        }
      }
    });

    return () => {
      unsubscribeCarState();
      unsubscribeHRV();
      unsubscribeHR();
    };
  }, [baselineHeartRate, baselineSDNN, calibrationPeriod, currentState, manualOverride]);

  // Collect baseline data during calibration period
  const collectBaselineData = (heartRate: number, hrv: number) => {
    setEmotionalHistory(prev => {
      const newHistory = [...prev, { timestamp: Date.now(), heartRate, sdnn: hrv }];

      // Calculate running baseline averages
      if (newHistory.length >= 10) { // Start calculating after 10 readings
        const recentData = newHistory.slice(-30); // Use last 30 readings for baseline
        const avgHR = recentData.reduce((sum, data) => sum + data.heartRate, 0) / recentData.length;
        const avgHRV = recentData.reduce((sum, data) => sum + data.sdnn, 0) / recentData.length;

        setBaselineHeartRate(Math.round(avgHR));
        setBaselineSDNN(Math.round(avgHRV));
      }

      return newHistory;
    });
  };

  // Perform emotional analysis based on heart rate and HRV changes from baseline
  const performEmotionalAnalysis = (heartRate: number, hrv: number, currentTime: number) => {
    if (baselineHeartRate === null || baselineSDNN === null || manualOverride) return;

    // Calculate changes from baseline
    const hrChange = heartRate - baselineHeartRate;
    const hrvChangePercent = ((hrv - baselineSDNN) / baselineSDNN) * 100;

    // Add current data to history
    const newDataPoint = { timestamp: currentTime, heartRate, sdnn: hrv };
    setEmotionalHistory(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only last hour of data
      const oneHourAgo = currentTime - (60 * 60 * 1000);
      return updated.filter(data => data.timestamp > oneHourAgo);
    });

    // Determine new state based on the rules
    const newState = analyzeEmotionalState(hrChange, hrvChangePercent, currentTime);

    if (newState !== currentState) {
      setCurrentState(newState);
      setStateStartTime(currentTime);
      carStateManager.setDriverState(newState);

      // Also directly update StatusBar if function exists
      if ((window as any).updateStatusBarDriverState) {
        (window as any).updateStatusBarDriverState(newState);
      }

      console.log(`🧠 Driver state updated: ${currentState} → ${newState}`);
      console.log(`📊 HR change: ${hrChange > 0 ? '+' : ''}${hrChange}bpm, HRV change: ${hrvChangePercent > 0 ? '+' : ''}${hrvChangePercent.toFixed(1)}%`);
    }
  };

  // Analyze emotional state based on HR and HRV changes with duration requirements
  const analyzeEmotionalState = (hrChange: number, hrvChangePercent: number, currentTime: number): DriverStateType => {
    const timeInCurrentState = (currentTime - stateStartTime) / (60 * 1000); // minutes

    // Check conditions for each state with duration requirements

    // Anxious: HR +20bpm or HRV -40% for 2-5 minutes
    if ((hrChange >= 20 || hrvChangePercent <= -40) && timeInCurrentState >= 2 && timeInCurrentState <= 5) {
      return 'anxious';
    }

    // Stressed: HR +10-20bpm or HRV -30% for 2-3 minutes
    if ((hrChange >= 10 && hrChange < 20) || (hrvChangePercent <= -30 && hrvChangePercent > -40)) {
      if (timeInCurrentState >= 2 && timeInCurrentState <= 3) {
        return 'stressed';
      }
    }

    // Focused: HR +5-10bpm or HRV stable/+10% for 2-10 minutes
    if ((hrChange >= 5 && hrChange < 10) || (hrvChangePercent >= -10 && hrvChangePercent <= 10)) {
      if (timeInCurrentState >= 2 && timeInCurrentState <= 10) {
        return 'focused';
      }
    }

    // Neutral: HR ±0-5bpm or HRV stable for 2-5 minutes
    if ((Math.abs(hrChange) <= 5) || (Math.abs(hrvChangePercent) <= 10)) {
      if (timeInCurrentState >= 2 && timeInCurrentState <= 5) {
        return 'neutral';
      }
    }

    // Calm: HR -5-10bpm or HRV +10-20% for 2-5 minutes
    if ((hrChange >= -10 && hrChange <= -5) || (hrvChangePercent >= 10 && hrvChangePercent <= 20)) {
      if (timeInCurrentState >= 2 && timeInCurrentState <= 5) {
        return 'calm';
      }
    }

    // Relaxed: HR -10+bpm or HRV +20%+ for 5+ minutes
    if ((hrChange <= -10) || (hrvChangePercent >= 20)) {
      if (timeInCurrentState >= 5) {
        return 'relaxed';
      }
    }

    // If no conditions are met or duration requirements not satisfied, maintain current state
    return currentState;
  };

  // Get state display info
  const getStateInfo = (state: DriverStateType) => {
    switch (state) {
      case 'anxious':
        return {
          label: 'Anxious',
          bgColor: 'bg-red-500',
          icon: AnxiousIcon
        };
      case 'stressed':
        return {
          label: 'Stressed',
          bgColor: 'bg-orange-400',
          icon: StressedIcon
        };
      case 'neutral':
        return {
          label: 'Neutral',
          bgColor: 'bg-emotion-default',
          icon: NeutralIcon
        };
      case 'focused':
        return {
          label: 'Focused',
          bgColor: 'bg-emotion-orange',
          icon: FocusedIcon
        };
      case 'calm':
        return {
          label: 'Calm',
          bgColor: 'bg-emotion-blue',
          icon: CalmIcon
        };
      case 'relaxed':
        return {
          label: 'Relaxed',
          bgColor: 'bg-flowkit-green',
          icon: RelaxedIcon
        };
    }
  };

  const stateInfo = getStateInfo(currentState);
  const IconComponent = stateInfo.icon;

  return (
    <div className={`flex flex-col items-center gap-2 w-28 lg:w-40 ${className}`}>
      <h3 className="text-base font-medium text-black lg:text-xl">Driver State</h3>
      <div className="flex flex-col items-center gap-1 lg:gap-2">
        <div className="w-12 h-12 lg:w-16 lg:h-16">
          <IconComponent />
        </div>
        <span className="text-xs text-black lg:text-sm">{stateInfo.label}</span>
      </div>
      {/* HRV Display */}
      <div className="text-xs text-gray-500 text-center">
        <div>HRV: {currentHRV}ms</div>
        {!calibrationPeriod && (
          <div>
            <div>HR: {currentHeartRate} ({baselineHeartRate ? (currentHeartRate - baselineHeartRate > 0 ? '+' : '') + (currentHeartRate - baselineHeartRate) : '?'})</div>
            <div>Change: {baselineSDNN ? ((currentHRV - baselineSDNN) / baselineSDNN * 100 > 0 ? '+' : '') + ((currentHRV - baselineSDNN) / baselineSDNN * 100).toFixed(0) + '%' : '?'}</div>
            <div>Time: {Math.floor((Date.now() - stateStartTime) / 60000)}:{Math.floor(((Date.now() - stateStartTime) % 60000) / 1000).toString().padStart(2, '0')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Icon Components for each state
const AnxiousIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_147)">
      <path d="M35.4142 48H12.5886C5.6377 48 0 42.3628 0 35.406V12.594C0 5.63719 5.63481 0 12.5886 0H35.3998C42.3478 0 47.9826 5.63429 47.9884 12.5853L48.0029 35.3974C48.0058 42.3541 42.371 47.9971 35.4142 47.9971V48Z" fill="#FC5555"/>
      <path d="M33.7019 34.7954C32.7965 34.7954 31.761 34.3758 30.6039 33.5366C29.6146 32.819 28.8105 32.5498 28.4605 32.8161C28.3477 32.9029 28.2204 33.0823 28.0873 33.2733C27.8993 33.5453 27.6853 33.8521 27.3642 34.1212C26.184 35.1196 24.5583 34.8475 23.4302 34.2572C22.9963 34.0315 22.6116 33.7652 22.2385 33.5106C21.8133 33.2183 21.4141 32.9463 21.0033 32.7727C20.0141 32.3559 18.7789 32.518 17.9343 33.1807C17.8186 33.2704 17.7 33.3775 17.5727 33.4903C17.214 33.8086 16.809 34.1704 16.2508 34.3932C14.5962 35.0501 13.2048 34.0459 12.0883 33.2415C11.4635 32.79 10.8705 32.3646 10.3036 32.2141C9.45024 31.9884 8.39154 32.5701 8.12542 33.4122C7.94897 33.9678 7.35599 34.2746 6.80061 34.098C6.24522 33.9215 5.93861 33.3283 6.11506 32.7727C6.7254 30.8511 8.89196 29.6589 10.8416 30.174C11.7904 30.4229 12.6032 31.0132 13.3234 31.5312C14.3908 32.301 14.952 32.6424 15.4755 32.4341C15.6896 32.3502 15.9239 32.1389 16.1756 31.9161C16.3202 31.7859 16.4706 31.6527 16.6384 31.5196C18.0905 30.3823 20.1298 30.1132 21.8277 30.828C22.4352 31.0855 22.9443 31.4328 23.436 31.7714C23.7716 32.0029 24.0897 32.2199 24.4137 32.3878C24.9489 32.6685 25.6691 32.7987 26.0104 32.5093C26.1204 32.4167 26.239 32.246 26.3662 32.0637C26.5658 31.7772 26.8146 31.4183 27.1935 31.1318C28.0179 30.5068 29.496 30.1161 31.8506 31.8235C32.8688 32.5614 33.6614 32.8392 34.023 32.5817C34.1329 32.5035 34.2602 32.3415 34.3961 32.1707C34.4945 32.0463 34.5928 31.9219 34.697 31.8061C35.6428 30.7499 37.1875 30.3071 38.7321 30.6486C40.2739 30.9901 41.4888 32.0434 41.9025 33.4006C42.0731 33.9591 41.7578 34.5466 41.1995 34.7173C40.6413 34.888 40.0541 34.5726 39.8834 34.0141C39.6549 33.2617 38.9028 32.845 38.2751 32.7061C37.6474 32.5672 36.7912 32.628 36.2676 33.2125C36.1924 33.2964 36.123 33.3861 36.0507 33.4759C35.8482 33.7305 35.5966 34.0517 35.2379 34.3035C34.7808 34.6276 34.2717 34.7868 33.7106 34.7868L33.7019 34.7954Z" fill="white"/>
      <path d="M10.0462 17.8289C10.1417 17.9996 10.3297 18.1443 10.6334 18.2225C13.1355 18.8736 18.0588 18.043 18.4608 14.883C18.5274 14.365 18.2612 13.1033 17.5178 13.7052C16.7368 14.336 16.2017 15.2129 15.3947 15.8322C14.6021 16.437 13.6765 16.7727 12.6727 16.7379C12.0219 16.7148 11.3132 16.5701 10.6768 16.7698C10.1041 16.9492 9.84085 17.4527 10.0491 17.8289H10.0462Z" fill="white"/>
      <path d="M37.4044 17.8289C37.309 17.9996 37.121 18.1443 36.8172 18.2225C34.3151 18.8736 29.3919 18.043 28.9898 14.883C28.9233 14.365 29.1894 13.1033 29.9328 13.7052C30.7138 14.336 31.2489 15.2129 32.056 15.8322C32.8486 16.437 33.7742 16.7727 34.7779 16.7379C35.4288 16.7148 36.1375 16.5701 36.7738 16.7698C37.3466 16.9492 37.6098 17.4527 37.4015 17.8289H37.4044Z" fill="white"/>
      <path d="M18.2466 22.0944C18.533 22.1986 18.8078 22.3288 19.0507 22.5111C20.3003 23.4487 18.9437 24.5715 18.0673 25.1214C17.1156 25.7204 15.5738 26.7853 14.3878 26.5538C14.2027 26.5162 14.006 26.4381 13.9135 26.2731C13.4651 25.4947 14.7147 25.1243 15.2209 24.9043C15.597 24.7423 16.3317 24.3776 16.2883 23.8712C16.2738 23.7207 16.1842 23.5905 16.0771 23.4863C15.3337 22.7629 13.7428 22.9741 13.4506 21.7703C13.4101 21.6082 13.4362 21.4259 13.5461 21.2986C13.6531 21.1771 13.8209 21.1279 13.98 21.0989C14.9693 20.9311 15.9441 21.2726 16.8524 21.6372C17.2949 21.8166 17.7867 21.9237 18.2495 22.0944H18.2466Z" fill="white"/>
      <path d="M29.2038 22.0944C28.9174 22.1986 28.6426 22.3288 28.3997 22.5111C27.15 23.4487 28.5067 24.5715 29.3831 25.1214C30.3348 25.7204 31.8766 26.7853 33.0625 26.5538C33.2477 26.5162 33.4444 26.4381 33.5369 26.2731C33.9853 25.4947 32.7357 25.1243 32.2295 24.9043C31.8534 24.7423 31.1187 24.3776 31.1621 23.8712C31.1766 23.7207 31.2662 23.5905 31.3733 23.4863C32.1167 22.7629 33.7076 22.9741 33.9998 21.7703C34.0402 21.6082 34.0142 21.4259 33.9043 21.2986C33.7973 21.1771 33.6295 21.1279 33.4704 21.0989C32.4811 20.9311 31.5063 21.2726 30.598 21.6372C30.1555 21.8166 29.6637 21.9237 29.2009 22.0944H29.2038Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_147">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const StressedIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_167)">
      <path d="M35.2613 0H12.7387C5.70329 0 0 5.70329 0 12.7387V35.2613C0 42.2967 5.70329 48 12.7387 48H35.2613C42.2967 48 48 42.2967 48 35.2613V12.7387C48 5.70329 42.2967 0 35.2613 0Z" fill="#FF8B7E"/>
      <path d="M29.462 37.1973C30.825 37.1973 31.7626 35.7851 31.1867 34.5495C30.0176 32.0376 27.2395 30.2695 23.9985 30.2695C20.7574 30.2695 17.9764 32.0376 16.8102 34.5495C16.2343 35.7851 17.1719 37.1973 18.5349 37.1973H29.462Z" fill="white"/>
      <path d="M8.61772 18.6971C8.72479 18.888 8.93893 19.053 9.27751 19.1398C12.0903 19.8719 17.6262 18.9372 18.0777 15.3865C18.1529 14.8048 17.8519 13.3869 17.0156 14.0611C16.1359 14.7701 15.534 15.7569 14.6282 16.4514C13.7369 17.1315 12.6951 17.5106 11.5694 17.4701C10.8373 17.444 10.0415 17.282 9.32381 17.5048C8.67849 17.7045 8.38332 18.2717 8.61772 18.6971Z" fill="white"/>
      <path d="M39.3793 18.6971C39.2722 18.888 39.0581 19.053 38.7195 19.1398C35.9067 19.8719 30.3708 18.9372 29.9193 15.3865C29.8441 14.8048 30.1451 13.3869 30.9814 14.0611C31.8611 14.7701 32.463 15.7569 33.3688 16.4514C34.2601 17.1315 35.3019 17.5106 36.4276 17.4701C37.1597 17.444 37.9555 17.282 38.6732 17.5048C39.3185 17.7045 39.6137 18.2717 39.3793 18.6971Z" fill="white"/>
      <path d="M17.8404 23.4892C18.1645 23.6079 18.4713 23.7526 18.7462 23.9551C20.1526 25.0085 18.6247 26.2702 17.6408 26.8895C16.5729 27.5609 14.8366 28.7589 13.5055 28.4985C13.2971 28.4579 13.0772 28.3682 12.9701 28.183C12.4666 27.3062 13.873 26.8924 14.4402 26.6464C14.8627 26.4641 15.6903 26.0532 15.6411 25.486C15.6267 25.3181 15.5225 25.1706 15.4038 25.0519C14.5704 24.2387 12.7791 24.476 12.4492 23.1217C12.4058 22.9394 12.4319 22.7339 12.5563 22.5921C12.6778 22.4532 12.8659 22.3983 13.0454 22.3693C14.1595 22.1812 15.2534 22.5632 16.2749 22.9741C16.7726 23.1738 17.3253 23.2982 17.8433 23.4863L17.8404 23.4892Z" fill="white"/>
      <path d="M30.1565 23.4892C29.8323 23.6079 29.5256 23.7526 29.2507 23.9551C27.8443 25.0085 29.3722 26.2702 30.3561 26.8895C31.424 27.5609 33.1603 28.7589 34.4914 28.4985C34.6998 28.4579 34.9197 28.3682 35.0268 28.183C35.5303 27.3062 34.1239 26.8924 33.5567 26.6464C33.1342 26.4641 32.3066 26.0532 32.3558 25.486C32.3702 25.3181 32.4744 25.1706 32.5931 25.0519C33.4265 24.2387 35.2178 24.476 35.5477 23.1217C35.5911 22.9394 35.565 22.7339 35.4406 22.5921C35.3191 22.4532 35.131 22.3983 34.9515 22.3693C33.8374 22.1812 32.7435 22.5632 31.722 22.9741C31.2243 23.1738 30.6716 23.2982 30.1536 23.4863L30.1565 23.4892Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_167">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const NeutralIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_82)">
      <path d="M35.2613 0H12.7387C5.70329 0 0 5.70329 0 12.7387V35.2613C0 42.2967 5.70329 48 12.7387 48H35.2613C42.2967 48 48 42.2967 48 35.2613V12.7387C48 5.70329 42.2967 0 35.2613 0Z" fill="#3A2018"/>
      <path d="M14.5618 25.431C16.0513 25.431 17.2588 24.2235 17.2588 22.7339C17.2588 21.2444 16.0513 20.0369 14.5618 20.0369C13.0723 20.0369 11.8647 21.2444 11.8647 22.7339C11.8647 24.2235 13.0723 25.431 14.5618 25.431Z" fill="white"/>
      <path d="M33.4383 25.431C34.9278 25.431 36.1353 24.2235 36.1353 22.7339C36.1353 21.2444 34.9278 20.0369 33.4383 20.0369C31.9487 20.0369 30.7412 21.2444 30.7412 22.7339C30.7412 24.2235 31.9487 25.431 33.4383 25.431Z" fill="white"/>
      <path d="M39.2144 32.2373H8.78574C8.4298 32.2373 8.14331 31.9508 8.14331 31.5949C8.14331 31.2389 8.4298 30.9524 8.78574 30.9524H39.2144C39.5703 30.9524 39.8568 31.2389 39.8568 31.5949C39.8568 31.9508 39.5703 32.2373 39.2144 32.2373Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_82">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const FocusedIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_183)">
      <path d="M35.406 0H12.594C5.63851 0 0 5.63851 0 12.594V35.406C0 42.3615 5.63851 48 12.594 48H35.406C42.3615 48 48 42.3615 48 35.406V12.594C48 5.63851 42.3615 0 35.406 0Z" fill="#FFA680"/>
      <path d="M13.5924 27.6448C14.7415 27.6448 15.6731 26.0732 15.6731 24.1346C15.6731 22.1959 14.7415 20.6243 13.5924 20.6243C12.4433 20.6243 11.5117 22.1959 11.5117 24.1346C11.5117 26.0732 12.4433 27.6448 13.5924 27.6448Z" fill="white"/>
      <path d="M34.4134 27.6448C35.5625 27.6448 36.4941 26.0732 36.4941 24.1346C36.4941 22.1959 35.5625 20.6243 34.4134 20.6243C33.2643 20.6243 32.3328 22.1959 32.3328 24.1346C32.3328 26.0732 33.2643 27.6448 34.4134 27.6448Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_183">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const CalmIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_233)">
      <path d="M35.406 0H12.594C5.63851 0 0 5.63851 0 12.594V35.406C0 42.3615 5.63851 48 12.594 48H35.406C42.3615 48 48 42.3615 48 35.406V12.594C48 5.63851 42.3615 0 35.406 0Z" fill="#A6DBFF"/>
      <path d="M13.3349 22.5082C14.4377 22.5082 15.3316 21.0014 15.3316 19.1427C15.3316 17.284 14.4377 15.7772 13.3349 15.7772C12.2321 15.7772 11.3381 17.284 11.3381 19.1427C11.3381 21.0014 12.2321 22.5082 13.3349 22.5082Z" fill="white"/>
      <path d="M31.8438 17.418C31.5573 17.5221 31.2824 17.6524 31.0393 17.8347C29.7891 18.7723 31.1463 19.8951 32.0232 20.4449C32.9752 21.0439 34.5177 22.1089 35.7041 21.8773C35.8893 21.8397 36.0861 21.7616 36.1787 21.5966C36.6273 20.8182 35.3771 20.4478 34.8707 20.2279C34.4945 20.0658 33.7595 19.7012 33.8029 19.1948C33.8174 19.0443 33.9071 18.9141 34.0141 18.8099C34.7578 18.0864 36.3495 18.2977 36.6417 17.0938C36.6822 16.9318 36.6562 16.7495 36.5462 16.6221C36.4392 16.5006 36.2713 16.4514 36.1122 16.4225C35.1225 16.2546 34.1472 16.5961 33.2386 16.9607C32.7958 17.1401 32.3039 17.2472 31.8409 17.418H31.8438Z" fill="white"/>
      <path d="M19.8258 33.2675C22.9337 33.4874 26.2385 32.9086 28.9211 31.2678C29.6648 30.8135 30.3564 30.2781 30.9757 29.6647C31.2564 29.3868 31.5313 29.0917 31.7744 28.782C31.9596 28.5447 32.4371 27.6621 32.7988 28.157C33.1287 28.6084 32.3734 29.6444 32.1361 30.0206C30.6661 32.3559 28.0905 33.8752 25.4282 34.4395C23.9929 34.7433 22.517 34.8273 21.0556 34.726C20.364 34.6768 19.6753 34.5871 18.9865 34.4858C18.4049 34.399 17.7711 34.3556 17.2792 33.9938C17.0361 33.8144 17.0419 33.5019 17.2531 33.3022C17.5049 33.062 17.939 33.0591 18.2631 33.0881C18.784 33.1373 19.2991 33.227 19.82 33.2646L19.8258 33.2675Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_233">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const RelaxedIcon: React.FC = () => (
  <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
    <g clipPath="url(#clip0_78_217)">
      <path d="M35.2613 0H12.7387C5.70329 0 0 5.70329 0 12.7387V35.2613C0 42.2967 5.70329 48 12.7387 48H35.2613C42.2967 48 48 42.2967 48 35.2613V12.7387C48 5.70329 42.2967 0 35.2613 0Z" fill="#29CC6A"/>
      <path d="M33.6812 25.4426C35.7734 25.4426 37.1914 27.5637 36.4043 29.5026C34.5407 34.0749 29.6212 37.342 23.8422 37.342C18.0632 37.342 13.1437 34.0749 11.28 29.5026C10.49 27.5637 11.908 25.4426 14.0031 25.4426H33.6841H33.6812Z" fill="white"/>
      <path d="M7.72355 17.8694C7.70619 17.8289 7.69461 17.7884 7.68593 17.745C7.22581 15.1608 12.1569 14.501 13.7398 14.9987C14.553 15.2534 15.372 15.699 16.0202 16.2518C16.2719 16.4659 17.8809 18.48 16.7234 18.5061C16.5526 18.509 16.3964 18.4135 16.2575 18.3122C15.1983 17.5656 14.6369 16.4572 13.3029 16.1389C11.8386 15.7888 10.2354 16.2633 9.21098 17.3717C8.88687 17.7218 8.0737 18.7173 7.72355 17.8665V17.8694Z" fill="white"/>
      <path d="M40.2733 17.8694C40.2906 17.8289 40.3022 17.7884 40.3109 17.745C40.771 15.1608 35.8399 14.501 34.257 14.9987C33.4438 15.2534 32.6249 15.699 31.9766 16.2518C31.7249 16.4659 30.1159 18.48 31.2734 18.5061C31.4442 18.509 31.6004 18.4135 31.7393 18.3122C32.7985 17.5656 33.3599 16.4572 34.694 16.1389C36.1582 15.7888 37.7614 16.2633 38.7858 17.3717C39.1099 17.7218 39.9231 18.7173 40.2733 17.8665V17.8694Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_78_217">
        <rect width="48" height="48" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

export default DriverState;
