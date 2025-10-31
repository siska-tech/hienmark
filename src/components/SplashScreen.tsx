import React from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  progress: number;
  message: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ progress, message }) => {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img src="/Splash.png" alt="HienMark" className="splash-image" />
        <div className="splash-loader">
          <div className="splash-progress-bar">
            <div 
              className="splash-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="splash-message">{message}</p>
        </div>
      </div>
    </div>
  );
};

