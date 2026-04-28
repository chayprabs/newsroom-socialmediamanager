'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';

export function RunDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params?.id ?? null;
  const { run, isLoading, error } = useRunState(runId);
  const [isImageHovered, setIsImageHovered] = useState(false);

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
                <div
                  onMouseEnter={() => setIsImageHovered(true)}
                  onMouseLeave={() => setIsImageHovered(false)}
                  style={{ position: 'relative', width: '480px', maxWidth: '100%' }}
                >
                  <a
                    href={`/api/runs/${run.run_id}/image?download=1&version=${encodeURIComponent(run.updated_at)}`}
                    download
                    aria-label="Download post image"
                    className="transition-all"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#fff',
                      border: '0.5px solid #E5E5E5',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isImageHovered ? 1 : 0,
                      transform: isImageHovered ? 'translateY(0)' : 'translateY(-4px)',
                      pointerEvents: isImageHovered ? 'auto' : 'none',
                      zIndex: 2,
                    }}
                  >
                    <Download size={14} color="#000" />
                  </a>
                  <img
                    src={`/api/runs/${run.run_id}/image?version=${encodeURIComponent(run.updated_at)}`}
                    alt={run.data?.title || 'Generated post'}
                    style={{ width: '100%', maxWidth: '100%', border: '0.5px solid #E5E5E5', borderRadius: '12px', display: 'block' }}
                  />
                </div>
              </div>

              {run.caption && (
                <p className="text-center" style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '28px' }}>
                  {run.caption}
                </p>
              )}

              <div className="grid grid-cols-2" style={{ gap: '16px', marginBottom: '28px' }}>
                <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px', padding: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Generated</p>
                  <img
                    src={`/api/runs/${run.run_id}/image?version=${encodeURIComponent(run.updated_at)}`}
                    alt={run.data?.title || 'Generated post'}
                    style={{ width: '100%', border: '0.5px solid #E5E5E5', borderRadius: '8px', display: 'block' }}
                  />
                </div>
                <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px', padding: '14px', minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Reference</p>
                  <div className="flex flex-1 items-center justify-center text-center" style={{ border: '0.5px solid #E5E5E5', borderRadius: '8px', backgroundColor: '#FAFAFA', color: '#888', fontSize: '13px', lineHeight: 1.5, padding: '18px' }}>
                    Add source reference images to the corpus to show the closest matching Crustdata post here.
                  </div>
                </div>
              </div>

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
