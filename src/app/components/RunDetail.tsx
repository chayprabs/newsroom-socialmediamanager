'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';

export function RunDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params.id;
  const { run, isLoading, error } = useRunState(runId);

  useEffect(() => {
    document.title = 'Run detail - Newsroom';
  }, []);

  const handleDelete = async () => {
    if (!window.confirm('Delete this run?')) return;
    await fetch(`/api/runs/${runId}`, { method: 'DELETE' });
    router.push('/dashboard');
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FAFAFA' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 40px' }}>
          {isLoading || !run ? (
            <EmptyState title="Loading run" description="Fetching the saved run." />
          ) : error || !run.image_path ? (
            <EmptyState title="Run unavailable" description={error || run.error || 'This run does not have an image.'} />
          ) : (
            <>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#000', marginBottom: '6px' }}>
                  {run.selected_candidate?.headline || run.data?.title || 'Saved run'}
                </h1>
                <p style={{ fontSize: '13px', color: '#666' }}>
                  {new Date(run.saved_at ?? run.updated_at).toLocaleString()} · {run.selected_candidate?.source || 'Generated post'}
                </p>
              </div>

              <div className="flex justify-center" style={{ marginBottom: '32px' }}>
                <img
                  src={`/api/runs/${run.run_id}/image`}
                  alt={run.data?.title || 'Generated post'}
                  style={{ width: '480px', maxWidth: '100%', border: '0.5px solid #E5E5E5', borderRadius: '12px' }}
                />
              </div>

              {run.caption && (
                <p className="text-center" style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '28px' }}>
                  {run.caption}
                </p>
              )}

              <div className="flex items-center justify-center gap-2">
                <button onClick={() => router.push('/dashboard')} className="transition-all" style={{ backgroundColor: '#fff', border: '0.5px solid #E5E5E5', color: '#000', height: '36px', paddingLeft: '14px', paddingRight: '14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>
                  Back to dashboard
                </button>
                <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer' }}>
                  Delete run
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
