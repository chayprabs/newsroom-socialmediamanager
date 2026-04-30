'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunState } from '@/lib/types';
import { getStoredRun, storeRun } from './runBrowserStore';

export function useRunState(runId: string | null) {
  const [run, setRun] = useState<RunState | null>(() => getStoredRun(runId));
  const [isLoading, setIsLoading] = useState(Boolean(runId));
  const [error, setError] = useState('');
  const runRef = useRef<RunState | null>(getStoredRun(runId));

  useEffect(() => {
    if (!runId) {
      runRef.current = null;
      setRun(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const cachedRun = getStoredRun(runId);
    if (cachedRun) {
      runRef.current = cachedRun;
      setRun(cachedRun);
      setIsLoading(false);
      setError('');
    }

    const loadRun = async () => {
      try {
        const response = await fetch(`/api/runs/${runId}`);
        if (!response.ok) {
          throw new Error('Run could not be loaded.');
        }
        const data = await response.json();
        if (isMounted) {
          runRef.current = data.run;
          setRun(data.run);
          storeRun(data.run);
          setError('');
        }
      } catch (loadError) {
        if (isMounted && !runRef.current) {
          setError(loadError instanceof Error ? loadError.message : 'Run could not be loaded.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRun();

    const events = new EventSource(`/api/runs/${runId}/stream`);
    events.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.run && isMounted) {
        runRef.current = data.run;
        setRun(data.run);
        storeRun(data.run);
        setError('');
      }
    };
    events.onerror = () => {
      events.close();
    };

    const interval = window.setInterval(loadRun, 2500);

    return () => {
      isMounted = false;
      events.close();
      window.clearInterval(interval);
    };
  }, [runId]);

  const setTrackedRun = useCallback((nextRun: RunState | null) => {
    runRef.current = nextRun;
    setRun(nextRun);
    storeRun(nextRun);
  }, []);

  return { run, setRun: setTrackedRun, isLoading, error, setError };
}
