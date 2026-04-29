'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunState } from '@/lib/types';

export function useRunState(runId: string | null) {
  const [run, setRun] = useState<RunState | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(runId));
  const [error, setError] = useState('');
  const runRef = useRef<RunState | null>(null);

  useEffect(() => {
    if (!runId) {
      runRef.current = null;
      setRun(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

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
  }, []);

  return { run, setRun: setTrackedRun, isLoading, error, setError };
}
