'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';

export function ReviewPost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams?.get('runId') ?? null;
  const { run, setRun, isLoading, error } = useRunState(runId);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);

  useEffect(() => {
    document.title = 'Review post - Newsroom';
  }, []);

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleSave = async () => {
    if (!runId) return;
    setIsWorking(true);
    const response = await fetch(`/api/runs/${runId}/save`, { method: 'POST' });
    setIsWorking(false);

    if (response.ok) {
      router.push('/dashboard');
    }
  };

  const handleRegenerate = async () => {
    if (!runId) return;
    setIsWorking(true);
    const response = await fetch(`/api/runs/${runId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editPrompt }),
    });
    const data = await response.json();
    if (response.ok && data.run) {
      setRun(data.run);
      if (!data.run.error) {
        setIsEditMode(false);
        setEditPrompt('');
      }
    }
    setIsWorking(false);
  };

  const imageVersion = run?.updated_at ? `?version=${encodeURIComponent(run.updated_at)}` : '';
  const imageUrl = runId ? `/api/runs/${runId}/image${imageVersion}` : '';
  const downloadUrl = runId
    ? `/api/runs/${runId}/image?download=1${run?.updated_at ? `&version=${encodeURIComponent(run.updated_at)}` : ''}`
    : '';

  const PostImage = () => (
    <div
      onMouseEnter={() => setIsImageHovered(true)}
      onMouseLeave={() => setIsImageHovered(false)}
      style={{ width: '480px', maxWidth: '100%', aspectRatio: '2 / 3', border: '0.5px solid #E5E5E5', borderRadius: '12px', overflow: 'hidden', position: 'relative', backgroundColor: '#F5F5F5' }}
    >
      <a
        href={downloadUrl}
        download
        className="transition-all"
        aria-label="Download post image"
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
          zIndex: 10,
          opacity: isImageHovered ? 1 : 0,
          transform: isImageHovered ? 'translateY(0)' : 'translateY(-4px)',
          pointerEvents: isImageHovered ? 'auto' : 'none'
        }}
      >
        <Download size={14} color="#000" />
      </a>
      <img src={imageUrl} alt={run?.data?.title ?? 'Generated post'} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  );

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
          {isLoading || !run ? (
            <div className="bg-white flex flex-col items-center" style={{ width: '100%', maxWidth: '460px', border: '0.5px solid #E5E5E5', borderRadius: '14px', padding: '36px 36px 28px' }}>
              <EmptyState title="Loading post" description="Fetching the generated output for this run." />
            </div>
          ) : run.status === 'failed' || error || !run.image_path ? (
            <div className="bg-white flex flex-col items-center" style={{ width: '100%', maxWidth: '460px', border: '0.5px solid #E5E5E5', borderRadius: '14px', padding: '36px 36px 28px' }}>
              <EmptyState title="No post to review" description={run.error || error || 'Generation has not completed yet.'} />
              <button onClick={handleBack} className="transition-all" style={{ height: '36px', paddingLeft: '16px', paddingRight: '16px', fontSize: '13px', color: '#000', backgroundColor: '#fff', border: '0.5px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer' }}>
                Back to dashboard
              </button>
            </div>
          ) : isEditMode ? (
            <div style={{ maxWidth: '960px', paddingLeft: '24px', paddingRight: '24px' }}>
              <div className="flex" style={{ gap: '24px', marginBottom: '24px' }}>
                <PostImage />
                <div className="bg-white" style={{ width: '400px', border: '0.5px solid #E5E5E5', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#000', marginBottom: '4px' }}>Edit post</h3>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                    Describe the changes you want and Newsroom will regenerate.
                  </p>
                  <textarea
                    value={editPrompt}
                    onChange={(event) => setEditPrompt(event.target.value)}
                    placeholder="Make the headline shorter, adjust colors, or simplify the chart."
                    style={{ width: '100%', height: '140px', border: '0.5px solid #E5E5E5', borderRadius: '8px', padding: '12px', fontSize: '13px', resize: 'none', outline: 'none', marginBottom: '16px' }}
                  />
                  <button
                    onClick={handleRegenerate}
                    disabled={isWorking}
                    aria-live="polite"
                    className="transition-all"
                    style={{
                      width: '100%',
                      backgroundColor: isWorking ? '#E5E5E5' : '#000',
                      color: isWorking ? '#777' : '#fff',
                      height: '36px',
                      fontSize: '13px',
                      fontWeight: 500,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isWorking ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isWorking && <Loader2 className="animate-spin" size={14} aria-hidden="true" />}
                    {isWorking ? 'Regenerating' : 'Regenerate'}
                  </button>
                  {run.error && (
                    <p style={{ fontSize: '12px', color: '#B42318', lineHeight: '1.5', marginTop: '12px' }}>
                      {run.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setIsEditMode(false)} className="transition-all" style={{ backgroundColor: '#fff', border: '0.5px solid #E5E5E5', color: '#000', height: '36px', paddingLeft: '14px', paddingRight: '14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSave} className="transition-all" style={{ backgroundColor: '#000', color: '#fff', height: '36px', paddingLeft: '14px', paddingRight: '14px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center" style={{ maxWidth: '520px', paddingLeft: '24px', paddingRight: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <PostImage />
              </div>
              {run.caption && (
                <p className="text-center" style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', marginBottom: '24px' }}>
                  {run.caption}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditMode(true)} className="transition-all" style={{ backgroundColor: '#fff', border: '0.5px solid #E5E5E5', color: '#000', height: '36px', paddingLeft: '14px', paddingRight: '14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>
                  Edit
                </button>
                <button onClick={handleSave} disabled={isWorking} className="transition-all" style={{ backgroundColor: isWorking ? '#E5E5E5' : '#000', color: isWorking ? '#999' : '#fff', height: '36px', paddingLeft: '14px', paddingRight: '14px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: isWorking ? 'not-allowed' : 'pointer' }}>
                  {isWorking ? 'Saving' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
