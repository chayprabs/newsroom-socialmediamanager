'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';
import { DebugBundle } from './DebugBundle';

function formatTokenCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatTemplateName(template?: string): string {
  if (!template) return '';
  const words = template.replace(/_/g, ' ').trim().toLowerCase();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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

              <div
                className="bg-white"
                style={{
                  border: '0.5px solid #E5E5E5',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '28px',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#888',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                      fontWeight: 400,
                    }}
                  >
                    User intent
                  </p>
                  {run.steering_input?.trim() ? (
                    <p style={{ fontSize: '13px', fontWeight: 400, color: '#1A1A1A', lineHeight: 1.5 }}>
                      {run.steering_input.trim()}
                    </p>
                  ) : (
                    <p style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 400, color: '#1A1A1A', lineHeight: 1.5 }}>
                      No user intent — general trending discovery
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#888', fontWeight: 400, marginBottom: '6px' }}>
                    Newsroom interpreted this as:
                  </p>
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', lineHeight: 1.5 }}>
                    {run.steering_acknowledged?.trim() || 'Not recorded for this run.'}
                  </p>
                </div>
                {(() => {
                  const chartTemplate =
                    run.selected_chart_template ||
                    run.visual_template ||
                    run.selected_candidate?.visual_template ||
                    '';
                  const chartLabel = formatTemplateName(chartTemplate);
                  if (!chartLabel) return null;

                  return (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '0.5px solid #E5E5E5' }}>
                      <p style={{ fontSize: '11px', color: '#888', fontWeight: 400, marginBottom: '6px' }}>
                        Chart type:
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: 400, color: '#1A1A1A', lineHeight: 1.5 }}>
                        {chartLabel}
                      </p>
                      {run.selected_chart_rationale?.trim() ? (
                        <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', lineHeight: 1.5, marginTop: '4px' }}>
                          {run.selected_chart_rationale.trim()}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
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

              {run.usage_summary && (
                <details
                  style={{
                    marginBottom: '28px',
                    borderTop: '0.5px solid #E5E5E5',
                    borderBottom: '0.5px solid #E5E5E5',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    color: '#777',
                    fontSize: '12px',
                  }}
                >
                  <summary style={{ cursor: 'pointer', color: '#555', fontSize: '13px', fontWeight: 500 }}>
                    Usage
                  </summary>
                  <div style={{ paddingTop: '14px' }}>
                    <div className="grid grid-cols-3" style={{ gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <p style={{ color: '#999', marginBottom: '3px' }}>Tokens in</p>
                        <p style={{ color: '#111' }}>{formatTokenCount(run.usage_summary.total_input_tokens)}</p>
                      </div>
                      <div>
                        <p style={{ color: '#999', marginBottom: '3px' }}>Tokens out</p>
                        <p style={{ color: '#111' }}>{formatTokenCount(run.usage_summary.total_output_tokens)}</p>
                      </div>
                      <div>
                        <p style={{ color: '#999', marginBottom: '3px' }}>Sonnet calls</p>
                        <p style={{ color: '#111' }}>{formatTokenCount(run.usage_summary.total_sonnet_calls)}</p>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ color: '#999', textAlign: 'left', borderBottom: '0.5px solid #E5E5E5' }}>
                          <th style={{ fontWeight: 400, padding: '0 8px 8px 0' }}>Stage</th>
                          <th style={{ fontWeight: 400, padding: '0 8px 8px', textAlign: 'right' }}>Calls</th>
                          <th style={{ fontWeight: 400, padding: '0 8px 8px', textAlign: 'right' }}>In</th>
                          <th style={{ fontWeight: 400, padding: '0 8px 8px', textAlign: 'right' }}>Out</th>
                          <th style={{ fontWeight: 400, padding: '0 8px 8px', textAlign: 'right' }}>Cache read</th>
                          <th style={{ fontWeight: 400, padding: '0 0 8px 8px', textAlign: 'right' }}>Cache write</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.usage_summary.by_stage.map((stage) => (
                          <tr key={stage.stage} style={{ borderBottom: '0.5px solid #F0F0F0' }}>
                            <td style={{ padding: '8px 8px 8px 0', color: '#555' }}>{stage.stage}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatTokenCount(stage.sonnet_calls)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatTokenCount(stage.input_tokens)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatTokenCount(stage.output_tokens)}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatTokenCount(stage.cache_read_input_tokens)}</td>
                            <td style={{ padding: '8px 0 8px 8px', textAlign: 'right' }}>{formatTokenCount(stage.cache_creation_input_tokens)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              <DebugBundle runId={runId} visible={Boolean(runId)} />

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
