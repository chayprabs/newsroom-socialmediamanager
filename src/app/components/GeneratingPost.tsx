'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TopNav } from './TopNav';
import { useRunState } from './useRunState';

export function GeneratingPost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const { run, setRun, error, setError } = useRunState(runId);
  const [isStarting, setIsStarting] = useState(false);
  const hasStartedDiscovery = useRef(false);

  useEffect(() => {
    document.title = 'Generate - Newsroom';
  }, []);

  useEffect(() => {
    if (runId || isStarting) return;

    setIsStarting(true);
    fetch('/api/runs', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => router.replace(`/generating?runId=${data.run.run_id}`))
      .catch(() => setError('Could not start a new run.'))
      .finally(() => setIsStarting(false));
  }, [isStarting, router, runId, setError]);

  useEffect(() => {
    if (!runId || hasStartedDiscovery.current) return;
    hasStartedDiscovery.current = true;

    fetch(`/api/runs/${runId}/discover`, { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        if (data.run) {
          setRun(data.run);
          if (data.run.status === 'awaiting_selection') {
            router.replace(`/pick-idea?runId=${runId}`);
          }
        }
      })
      .catch(() => setError('Idea discovery failed to start.'));
  }, [router, runId, setError, setRun]);

  useEffect(() => {
    if (run?.status === 'awaiting_selection') {
      router.replace(`/pick-idea?runId=${run.run_id}`);
    }
  }, [router, run]);

  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FAFAFA' }}>
        <div
          className="flex items-center justify-center"
          style={{
            minHeight: 'calc(100vh - 56px)',
            paddingTop: '64px',
            paddingBottom: '64px',
            paddingLeft: '24px',
            paddingRight: '24px'
          }}
        >
          <div
            className="bg-white flex flex-col items-center"
            style={{
              width: '100%',
              maxWidth: '460px',
              border: '0.5px solid #E5E5E5',
              borderRadius: '14px',
              padding: '36px 36px 28px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: '#F5F5F5',
                border: '0.5px solid #E5E5E5',
                marginBottom: '22px'
              }}
            >
              <Loader2 className="animate-spin" size={18} style={{ color: '#000' }} />
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#000', marginBottom: '8px' }}>
              Finding relevant ideas
            </h1>
            <p
              className="text-center"
              style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '24px' }}
            >
              Newsroom is scanning trend signals and preparing candidate post ideas.
            </p>

            <div
              className="w-full"
              style={{
                border: '0.5px solid #E5E5E5',
                borderRadius: '10px',
                backgroundColor: '#FAFAFA',
                padding: '14px',
                marginBottom: '24px'
              }}
            >
              {(run?.logs ?? []).slice(-5).map((log) => (
                <div key={`${log.at}-${log.message}`} style={{ fontSize: '12px', color: '#666', lineHeight: '1.5', marginBottom: '6px' }}>
                  {log.message}
                </div>
              ))}
              {error || run?.error ? (
                <div style={{ fontSize: '12px', color: '#B42318', lineHeight: '1.5' }}>
                  {error || run?.error}
                </div>
              ) : null}
            </div>

            <button
              onClick={handleCancel}
              className="transition-all"
              style={{
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                fontSize: '13px',
                fontWeight: 400,
                color: '#000',
                backgroundColor: '#fff',
                border: '0.5px solid #E5E5E5',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#999';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5';
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
