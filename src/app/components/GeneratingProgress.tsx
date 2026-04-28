'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';

export function GeneratingProgress() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams?.get('runId') ?? null;
  const { run, setRun, error, setError } = useRunState(runId);
  const hasStartedGeneration = useRef(false);

  useEffect(() => {
    document.title = 'Generating - Newsroom';
  }, []);

  useEffect(() => {
    if (!runId || hasStartedGeneration.current) return;
    hasStartedGeneration.current = true;

    fetch(`/api/runs/${runId}/generate`, { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        if (data.run) {
          setRun(data.run);
          if (data.run.status === 'ready') {
            router.replace(`/review?runId=${runId}`);
          }
        }
      })
      .catch(() => setError('Generation failed to start.'));
  }, [router, runId, setError, setRun]);

  useEffect(() => {
    if (run?.status === 'ready') {
      router.replace(`/review?runId=${run.run_id}`);
    }
  }, [router, run]);

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const StepIndicator = ({ status }: { status: string }) => {
    if (status === 'done') {
      return (
        <div className="rounded-full flex items-center justify-center" style={{ width: '16px', height: '16px', backgroundColor: '#000' }}>
          <Check size={10} color="#fff" strokeWidth={3} />
        </div>
      );
    }

    if (status === 'running') {
      return (
        <div className="rounded-full flex items-center justify-center" style={{ width: '16px', height: '16px', border: '1.5px solid #000' }}>
          <Loader2 size={10} className="animate-spin" style={{ color: '#000' }} />
        </div>
      );
    }

    return <div className="rounded-full" style={{ width: '16px', height: '16px', border: '1.5px solid #D5D5D5' }} />;
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
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#000', marginBottom: '8px' }}>
              Generating post
            </h1>
            <p className="text-center" style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '28px' }}>
              Newsroom is fetching data, shaping the chart, and rendering the post.
            </p>

            {run ? (
              <div className="w-full" style={{ maxWidth: '380px', padding: '18px', border: '0.5px solid #E5E5E5', borderRadius: '10px', backgroundColor: '#FAFAFA' }}>
                {run.generation_steps.map((step, index) => (
                  <div key={step.id} className="flex" style={{ gap: '12px', paddingBottom: index === run.generation_steps.length - 1 ? 0 : '22px' }}>
                    <div style={{ width: '20px', display: 'flex', justifyContent: 'center', paddingTop: '2px' }}>
                      <StepIndicator status={step.status} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 500, color: step.status === 'pending' ? '#888' : '#000', marginBottom: '4px' }}>
                        {step.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>{step.description}</p>
                      {step.microStatus && (
                        <p style={{ fontSize: '11px', color: step.status === 'error' ? '#B42318' : '#AAA', lineHeight: '1.4', marginTop: '6px' }}>
                          {step.microStatus}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {error || run.error ? (
                  <p style={{ fontSize: '12px', color: '#B42318', lineHeight: '1.5', marginTop: '14px' }}>
                    {error || run.error}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState title="Loading run" description="Fetching the active generation state." />
            )}

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
