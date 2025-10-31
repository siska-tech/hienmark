import { useState, useEffect, useRef } from 'react';

export interface InitializationState {
  isInitializing: boolean;
  progress: number;
  message: string;
}

/**
 * Tracks app initialization progress and displays splash screen
 * 
 * @param translations Translation object for splash screen messages
 */
export function useInitialization(translations?: {
  initializing: string;
  loadingLanguage: string;
  initializingComponents: string;
  preparingWorkspace: string;
  finalizing: string;
  ready: string;
}): InitializationState {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(translations?.initializing || 'Initializing application...');
  const [isInitializing, setIsInitializing] = useState(true);
  const startTime = useRef(Date.now());
  const minDisplayTime = 1200; // Minimum display time in ms

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Phase 1: Initial setup (10%)
        setProgress(10);
        setMessage(translations?.initializing || 'Initializing application...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Phase 2: Loading language settings (25%)
        setProgress(25);
        setMessage(translations?.loadingLanguage || 'Loading language settings...');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Phase 3: Initializing components (45%)
        setProgress(45);
        setMessage(translations?.initializingComponents || 'Initializing components...');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Phase 4: Preparing workspace (65%)
        setProgress(65);
        setMessage(translations?.preparingWorkspace || 'Preparing workspace...');
        await new Promise(resolve => setTimeout(resolve, 400));

        // Phase 5: Finalizing (85%)
        setProgress(85);
        setMessage(translations?.finalizing || 'Finalizing...');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Ensure minimum display time
        const elapsed = Date.now() - startTime.current;
        if (elapsed < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
        }

        // Complete
        setProgress(100);
        setMessage(translations?.ready || 'Ready');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitializing(false);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isInitializing, progress, message };
}

