'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';
import { shouldShowTemplateDiversityBanner } from './templateDiversity';

/**
 * Render a snake_case visual_template id as a human-readable label.
 * Example: "diverging_horizontal_bar" -> "Diverging horizontal bar".
 * Returns an empty string for falsy input so callers can hide the pill cleanly.
 */
function formatTemplateName(template?: string): string {
  if (!template) return '';
  const words = template.replace(/_/g, ' ').trim().toLowerCase();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function PickIdea() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams?.get('runId') ?? null;
  const { run, isLoading, error } = useRunState(runId);
  const [selectedId, setSelectedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLimitedTemplateVariety = shouldShowTemplateDiversityBanner(run);

  useEffect(() => {
    document.title = 'Pick an idea - Newsroom';
  }, []);

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const handleFindNewIdeas = () => {
    router.push('/generating');
  };

  const handleGeneratePost = async () => {
    if (!runId || !selectedId) return;
    setIsSubmitting(true);
    await fetch(`/api/runs/${runId}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: selectedId }),
    });
    router.push(`/generating-progress?runId=${runId}`);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FAFAFA' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '32px', paddingLeft: '42px', paddingRight: '42px', paddingBottom: '40px' }}>
          <div className="flex items-start justify-between" style={{ marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '4px', color: '#000' }}>
                Pick an idea
              </h1>
              <p style={{ fontSize: '13px', color: '#666' }}>
                Newsroom found the strongest candidates from today's trending conversations. Pick one to continue.
              </p>
            </div>
            <button
              className="transition-all"
              style={{
                height: '36px',
                paddingLeft: '14px',
                paddingRight: '14px',
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
              onClick={handleFindNewIdeas}
            >
              Find new ideas
            </button>
          </div>

          {hasLimitedTemplateVariety ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between"
              style={{
                marginBottom: '20px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '0.5px solid #EAEAEA',
                backgroundColor: '#FAFAFA',
                fontSize: '13px',
                lineHeight: '1.4',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#444' }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '999px',
                    backgroundColor: '#F0E6CC',
                    color: '#7A5A00',
                    fontSize: '11px',
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  !
                </span>
                <span>Limited template variety in this run.</span>
              </div>
              <button
                type="button"
                className="transition-all"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#000',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  textDecorationColor: '#BBBBBB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecorationColor = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecorationColor = '#BBBBBB';
                }}
                onClick={handleFindNewIdeas}
              >
                Find new ideas
              </button>
            </div>
          ) : null}

          {isLoading || !run ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="Loading ideas" description="Fetching the candidate set for this run." />
            </div>
          ) : run.status === 'failed' || error ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="Idea discovery failed" description={run.error || error} />
            </div>
          ) : run.candidates.length === 0 ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="No ideas yet" description="Run discovery again after adding base.md, design.md, and API keys." />
            </div>
          ) : (
            <div className="grid grid-cols-3" style={{ gap: '18px', marginBottom: '36px' }}>
              {run.candidates.map((candidate) => {
                const isSelected = selectedId === candidate.candidate_id;
                const score = candidate.scores?.total ?? 0;

                return (
                  <div
                    key={candidate.candidate_id}
                    className="bg-white cursor-pointer transition-all"
                    style={{
                      border: isSelected ? '1.5px solid #000' : '0.5px solid #E5E5E5',
                      borderRadius: '12px',
                      padding: '24px',
                      minHeight: '330px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isSelected ? '0 8px 24px rgba(0, 0, 0, 0.06)' : '0 1px 2px rgba(0, 0, 0, 0.03)'
                    }}
                    onClick={() => setSelectedId(candidate.candidate_id)}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          backgroundColor: '#F5F5F5',
                          border: '0.5px solid #EAEAEA',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '6px 10px',
                          borderRadius: '999px'
                        }}
                      >
                        Score {score}/50
                      </div>
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: isSelected ? 'none' : '1.5px solid #000',
                          backgroundColor: isSelected ? '#000' : 'transparent'
                        }}
                      >
                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                      </div>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 500, lineHeight: '1.4', color: '#000', marginBottom: '10px' }}>
                      {candidate.headline}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.4', marginBottom: '20px' }}>
                      {candidate.subhead}
                    </p>

                    <div className="border-t" style={{ marginTop: 'auto', borderTopWidth: '0.5px', borderColor: '#E5E5E5', paddingTop: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4', marginBottom: '10px' }}>
                        Source: {candidate.source || candidate.source_url || 'Trend source'}
                      </div>
                      {(() => {
                        const templateLabel = formatTemplateName(
                          candidate.visual_template || candidate.matched_visual
                        );
                        return templateLabel ? (
                          <span
                            title="Visual template chosen by Newsroom for this candidate"
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#F5F5F5',
                              border: '0.5px solid #EAEAEA',
                              color: '#666',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '999px',
                              marginBottom: '8px',
                              lineHeight: '1.3',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {templateLabel}
                          </span>
                        ) : null;
                      })()}
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
                        Endpoint: {candidate.crustdata_query.endpoint}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-center gap-2" style={{ marginTop: '28px' }}>
            <button
              className="transition-all"
              style={{
                backgroundColor: '#fff',
                border: '0.5px solid #E5E5E5',
                color: '#000',
                height: '36px',
                paddingLeft: '14px',
                paddingRight: '14px',
                fontSize: '13px',
                fontWeight: 400,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#999';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5';
              }}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="transition-all"
              disabled={!selectedId || isSubmitting}
              style={{
                backgroundColor: selectedId && !isSubmitting ? '#000' : '#E5E5E5',
                color: selectedId && !isSubmitting ? '#fff' : '#999',
                height: '36px',
                paddingLeft: '14px',
                paddingRight: '14px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: selectedId && !isSubmitting ? 'pointer' : 'not-allowed'
              }}
              onClick={handleGeneratePost}
            >
              {isSubmitting ? 'Starting' : 'Generate post'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
