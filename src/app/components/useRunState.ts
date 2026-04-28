'use client';

import { useEffect, useState } from 'react';
import type { RunState } from '@/lib/types';

export function useRunState(runId: string | null) {
  const [run, setRun] = useState<RunState | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(runId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!runId) {
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
          setRun(data.run);
          setError('');
        }
      } catch (loadError) {
        if (isMounted) {
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
        setRun(data.run);
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

  return { run, setRun, isLoading, error, setError };
}
