'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChartDatum, ChartEntitySeries, ChartTypeOption, GeneratedPostData } from '@/lib/types';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { useRunState } from './useRunState';
import { getPendingChartType, requestRunSnapshot, setPendingChartType } from './runBrowserStore';

type PreviewRow = {
  label: string;
  value: number;
};

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 200;
const INK = '#1A1A1A';
const MUTED = '#888888';
const GRID = '#E5E5E5';

function formatTemplateName(template?: string): string {
  if (!template) return '';
  const words = template.replace(/_/g, ' ').trim().toLowerCase();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function compactValue(value: number, unit?: string) {
  const abs = Math.abs(value);
  const suffix = unit ? ` ${unit}` : '';

  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B${suffix}`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M${suffix}`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K${suffix}`;
  if (abs > 0 && abs < 1) return `${value.toFixed(2)}${suffix}`;
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function truncateLabel(value: string, length = 14) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function labelForDatum(datum: ChartDatum) {
  return datum.label || datum.entity || datum.date || 'Item';
}

function rowsFromData(data?: GeneratedPostData | null): PreviewRow[] {
  if (!data) return [];

  if (Array.isArray(data.rows) && data.rows.length > 0) {
    return data.rows
      .filter((row) => finiteNumber(row.value))
      .map((row) => ({ label: labelForDatum(row), value: row.value }));
  }

  if (Array.isArray(data.segments) && data.segments.length > 0) {
    return data.segments
      .filter((segment) => finiteNumber(segment.value))
      .map((segment) => ({ label: segment.label, value: segment.value }));
  }

  if (Array.isArray(data.entities) && data.entities.length > 0) {
    return data.entities
      .map((entity) => {
        const pointValue = entity.points?.[entity.points.length - 1]?.value;
        const value = finiteNumber(entity.end_value)
          ? entity.end_value
          : finiteNumber(entity.y)
            ? entity.y
            : finiteNumber(pointValue)
              ? pointValue
              : undefined;
        return finiteNumber(value) ? { label: entity.entity, value } : null;
      })
      .filter((row): row is PreviewRow => Boolean(row));
  }

  if (Array.isArray(data.points) && data.points.length > 0) {
    return data.points
      .filter((point) => finiteNumber(point.value))
      .map((point) => ({ label: point.date || point.label || 'Point', value: point.value }));
  }

  return [];
}

function seriesFromData(data?: GeneratedPostData | null): Array<{ name: string; points: ChartDatum[] }> {
  if (!data) return [];

  if (Array.isArray(data.entities)) {
    const series = data.entities
      .filter((entity): entity is ChartEntitySeries & { points: ChartDatum[] } =>
        Array.isArray(entity.points) && entity.points.length > 0
      )
      .map((entity) => ({ name: entity.entity, points: entity.points }));
    if (series.length > 0) return series;
  }

  if (Array.isArray(data.points) && data.points.length > 0) {
    return [{ name: data.title || 'Series', points: data.points }];
  }

  return [];
}

function scaledY(value: number, values: number[], top = 24, bottom = 158) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max === min ? 1 : max - min;
  return bottom - ((value - min) / span) * (bottom - top);
}

function pathForPoints(points: ChartDatum[], values: number[], left = 28, right = 252) {
  if (points.length === 0) return '';
  return points
    .map((point, index) => {
      const x = left + (index / Math.max(points.length - 1, 1)) * (right - left);
      const y = scaledY(point.value, values);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      role="img"
      aria-label="Chart preview"
      style={{
        width: '100%',
        height: '200px',
        display: 'block',
        backgroundColor: '#FAFAFA',
        border: '0.5px solid #E5E5E5',
        borderRadius: '8px',
      }}
    >
      {children}
    </svg>
  );
}

function EmptyPreview() {
  return (
    <PreviewFrame>
      <text x="140" y="100" textAnchor="middle" fill={MUTED} fontSize="12">
        Preview unavailable
      </text>
    </PreviewFrame>
  );
}

function RankedBarPreview({ data }: { data?: GeneratedPostData | null }) {
  const rows = rowsFromData(data).sort((a, b) => b.value - a.value).slice(0, 5);
  if (rows.length === 0) return <EmptyPreview />;
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);

  return (
    <PreviewFrame>
      <line x1="104" y1="24" x2="104" y2="170" stroke={GRID} strokeWidth="1" />
      {rows.map((row, index) => {
        const y = 28 + index * 30;
        const width = (Math.abs(row.value) / max) * 124;
        return (
          <g key={`${row.label}-${index}`}>
            <text x="10" y={y + 14} fill={INK} fontSize="10" fontWeight="500">
              {truncateLabel(row.label)}
            </text>
            <rect x="104" y={y} width={Math.max(width, 4)} height="16" fill={INK} />
            <text x={Math.min(246, 112 + width)} y={y + 12} fill={INK} fontSize="10" fontWeight="600">
              {compactValue(row.value, data?.unit_label)}
            </text>
          </g>
        );
      })}
    </PreviewFrame>
  );
}

function VerticalBarPreview({ data }: { data?: GeneratedPostData | null }) {
  const rows = rowsFromData(data).sort((a, b) => b.value - a.value).slice(0, 5);
  if (rows.length === 0) return <EmptyPreview />;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const barWidth = 28;
  const gap = 18;
  const startX = 38;

  return (
    <PreviewFrame>
      <line x1="24" y1="160" x2="260" y2="160" stroke={INK} strokeWidth="1" />
      {rows.map((row, index) => {
        const height = (row.value / max) * 112;
        const x = startX + index * (barWidth + gap);
        const y = 160 - height;
        return (
          <g key={`${row.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={height} fill={INK} />
            <text x={x + barWidth / 2} y={Math.max(18, y - 6)} textAnchor="middle" fill={INK} fontSize="9" fontWeight="600">
              {compactValue(row.value)}
            </text>
            <text x={x + barWidth / 2} y="176" textAnchor="middle" fill={INK} fontSize="9">
              {truncateLabel(row.label, 7)}
            </text>
          </g>
        );
      })}
    </PreviewFrame>
  );
}

function LinePreview({ data, multi = false }: { data?: GeneratedPostData | null; multi?: boolean }) {
  const series = seriesFromData(data).slice(0, multi ? 4 : 1);
  if (series.length === 0) return <EmptyPreview />;
  const allValues = series.flatMap((entry) => entry.points.map((point) => point.value)).filter(finiteNumber);
  if (allValues.length === 0) return <EmptyPreview />;

  return (
    <PreviewFrame>
      {[44, 84, 124, 164].map((y) => (
        <line key={y} x1="24" y1={y} x2="260" y2={y} stroke={GRID} strokeWidth="1" />
      ))}
      <line x1="28" y1="24" x2="28" y2="166" stroke={INK} strokeWidth="1" />
      <line x1="28" y1="166" x2="260" y2="166" stroke={INK} strokeWidth="1" />
      {series.map((entry, index) => {
        const points = entry.points.filter((point) => finiteNumber(point.value));
        const path = pathForPoints(points, allValues);
        const strokeWidth = multi && index > 0 ? 2 : 3;
        const opacity = multi && index > 0 ? 0.55 : 1;
        const last = points[points.length - 1];
        const lastY = last ? scaledY(last.value, allValues) : 0;
        return (
          <g key={entry.name}>
            <path d={path} fill="none" stroke={INK} strokeWidth={strokeWidth} opacity={opacity} />
            {last ? (
              <text x="256" y={lastY - 4} textAnchor="end" fill={INK} fontSize="9" fontWeight="500" opacity={opacity}>
                {truncateLabel(entry.name, 10)}
              </text>
            ) : null}
          </g>
        );
      })}
    </PreviewFrame>
  );
}

function ScatterPreview({ data }: { data?: GeneratedPostData | null }) {
  const entities = Array.isArray(data?.entities)
    ? data.entities
        .filter((entity) => finiteNumber(entity.x) && finiteNumber(entity.y))
        .map((entity) => ({ label: entity.entity, x: entity.x as number, y: entity.y as number }))
    : [];
  const points =
    entities.length > 0
      ? entities
      : rowsFromData(data).map((row, index) => ({ label: row.label, x: index + 1, y: row.value }));
  if (points.length === 0) return <EmptyPreview />;

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xSpan = maxX === minX ? 1 : maxX - minX;
  const ySpan = maxY === minY ? 1 : maxY - minY;

  return (
    <PreviewFrame>
      {[62, 102, 142].map((y) => (
        <line key={y} x1="34" y1={y} x2="256" y2={y} stroke={GRID} strokeWidth="1" />
      ))}
      <line x1="34" y1="24" x2="34" y2="164" stroke={INK} strokeWidth="1" />
      <line x1="34" y1="164" x2="256" y2="164" stroke={INK} strokeWidth="1" />
      {points.slice(0, 12).map((point, index) => {
        const x = 42 + ((point.x - minX) / xSpan) * 202;
        const y = 156 - ((point.y - minY) / ySpan) * 122;
        return (
          <g key={`${point.label}-${index}`}>
            <circle cx={x} cy={y} r="5" fill={INK} />
            <text x={x + 7} y={y + 3} fill={INK} fontSize="8">
              {truncateLabel(point.label, 9)}
            </text>
          </g>
        );
      })}
    </PreviewFrame>
  );
}

function GenericShapePreview({ template, data }: { template: string; data?: GeneratedPostData | null }) {
  if (template === 'diverging_horizontal_bar') {
    return <RankedBarPreview data={data} />;
  }

  if (template === 'stacked_horizontal_bar' || template === 'donut_chart') {
    const rows = rowsFromData(data).slice(0, 6);
    if (rows.length === 0) return <EmptyPreview />;
    const total = rows.reduce((sum, row) => sum + Math.max(0, row.value), 0) || 1;
    let x = 36;
    return (
      <PreviewFrame>
        <rect x="36" y="82" width="208" height="34" fill="none" stroke={INK} strokeWidth="1" />
        {rows.map((row, index) => {
          const width = (Math.max(0, row.value) / total) * 208;
          const currentX = x;
          x += width;
          return <rect key={`${row.label}-${index}`} x={currentX} y="82" width={width} height="34" fill={INK} opacity={1 - index * 0.11} />;
        })}
        <text x="140" y="137" textAnchor="middle" fill={MUTED} fontSize="10">
          {template === 'donut_chart' ? 'Distribution preview' : 'Composition preview'}
        </text>
      </PreviewFrame>
    );
  }

  if (template === 'slope_chart') {
    const rows = rowsFromData(data).slice(0, 5);
    if (rows.length === 0) return <EmptyPreview />;
    return (
      <PreviewFrame>
        <line x1="70" y1="34" x2="70" y2="166" stroke={INK} strokeWidth="1" />
        <line x1="210" y1="34" x2="210" y2="166" stroke={INK} strokeWidth="1" />
        {rows.map((row, index) => {
          const leftY = 48 + index * 24;
          const rightY = 148 - index * 18;
          return (
            <g key={`${row.label}-${index}`}>
              <line x1="70" y1={leftY} x2="210" y2={rightY} stroke={INK} strokeWidth="2" opacity={1 - index * 0.1} />
              <circle cx="70" cy={leftY} r="3" fill={INK} />
              <circle cx="210" cy={rightY} r="3" fill={INK} />
            </g>
          );
        })}
      </PreviewFrame>
    );
  }

  return <EmptyPreview />;
}

function ChartPreview({ template, data }: { template: string; data?: GeneratedPostData | null }) {
  if (template === 'ranked_horizontal_bar' || template === 'ranked_horizontal_bar_with_icons') {
    return <RankedBarPreview data={data} />;
  }
  if (template === 'vertical_bar_comparison') {
    return <VerticalBarPreview data={data} />;
  }
  if (template === 'single_line_timeseries' || template === 'annotated_line_timeseries' || template === 'single_line_timeseries_with_annotations') {
    return <LinePreview data={data} />;
  }
  if (template === 'multi_line_timeseries') {
    return <LinePreview data={data} multi />;
  }
  if (template === 'scatter_plot') {
    return <ScatterPreview data={data} />;
  }
  return <GenericShapePreview template={template} data={data} />;
}

export function ChartTypePicker() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params?.id ?? null;
  const { run, setRun, isLoading, error, setError } = useRunState(runId);
  const [selectedTemplate, setSelectedTemplate] = useState(() => getPendingChartType(runId));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Pick chart type - Newsroom';
  }, []);

  const options = useMemo<ChartTypeOption[]>(() => {
    const chartOptions = run?.selected_candidate?.chart_type_options;
    if (Array.isArray(chartOptions) && chartOptions.length > 0) {
      return [...chartOptions].sort((a, b) => a.rank - b.rank).slice(0, 3);
    }

    const fallbackTemplate = run?.selected_candidate?.visual_template;
    if (!fallbackTemplate) return [];
    return [
      {
        rank: 1,
        visual_template: fallbackTemplate,
        rationale: 'Newsroom selected this as the best available chart type for the candidate.',
        data_preview: 'Preview generated from the finalized run data.',
        suitability_score: 8,
      },
    ];
  }, [run]);

  const handleCancel = () => {
    router.push('/dashboard');
  };

  const handleGeneratePost = async () => {
    if (!runId || !selectedTemplate || isSubmitting) return;
    setIsSubmitting(true);
    setPendingChartType(runId, selectedTemplate);

    try {
      const response = await fetch(`/api/runs/${runId}/chart-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_template: selectedTemplate, run: requestRunSnapshot(runId, run) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not select chart type.');
      }
      if (data.run) setRun(data.run);
      router.push(`/generating-progress?runId=${runId}&chartType=${encodeURIComponent(selectedTemplate)}`);
    } catch (chartTypeError) {
      setError(chartTypeError instanceof Error ? chartTypeError.message : 'Could not select chart type.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FAFAFA' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 32px 40px' }}>
          <div className="text-center" style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '6px', color: '#000' }}>
              Pick a chart type
            </h1>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.45 }}>
              Newsroom suggested 3 visualization options for your data. Pick the one that best answers your question.
            </p>
          </div>

          {isLoading || !run ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="Loading chart options" description="Fetching the finalized run data." />
            </div>
          ) : run.status === 'failed' || error ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="Chart selection unavailable" description={run.error || error} />
            </div>
          ) : options.length === 0 ? (
            <div className="bg-white" style={{ border: '0.5px solid #E5E5E5', borderRadius: '12px' }}>
              <EmptyState title="No chart options" description="This run does not have chart-type options yet." />
            </div>
          ) : (
            <>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '16px',
                }}
              >
                {options.map((option) => {
                  const isSelected = selectedTemplate === option.visual_template;
                  return (
                    <button
                      key={`${option.rank}-${option.visual_template}`}
                      type="button"
                      className="bg-white text-left transition-all"
                      onClick={() => {
                        setSelectedTemplate(option.visual_template);
                        setPendingChartType(runId, option.visual_template);
                      }}
                      style={{
                        border: isSelected ? '1.5px solid #000' : '0.5px solid #E5E5E5',
                        borderRadius: '12px',
                        padding: '20px',
                        minHeight: '472px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 8px 24px rgba(0, 0, 0, 0.06)' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
                        {option.rank === 1 ? (
                          <span
                            style={{
                              backgroundColor: '#0F0F0F',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '6px 10px',
                              borderRadius: '999px',
                              lineHeight: 1,
                            }}
                          >
                            Recommended
                          </span>
                        ) : (
                          <span />
                        )}
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            border: isSelected ? 'none' : '1.5px solid #000',
                            backgroundColor: isSelected ? '#000' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected ? (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />
                          ) : null}
                        </span>
                      </div>

                      <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#000', marginBottom: '4px' }}>
                        {formatTemplateName(option.visual_template)}
                      </h2>
                      <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                        Suitability: {option.suitability_score}/10
                      </p>

                      <div style={{ marginBottom: '12px' }}>
                        <ChartPreview template={option.visual_template} data={run.data} />
                      </div>

                      <p
                        style={{
                          fontSize: '13px',
                          color: '#666',
                          lineHeight: 1.45,
                          marginBottom: '12px',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {option.rationale}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#888',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                          marginTop: 'auto',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {option.data_preview}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2" style={{ marginTop: '32px' }}>
                <button
                  type="button"
                  className="transition-all"
                  onClick={handleCancel}
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
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="transition-all"
                  disabled={!selectedTemplate || isSubmitting}
                  onClick={handleGeneratePost}
                  style={{
                    backgroundColor: selectedTemplate && !isSubmitting ? '#000' : '#E5E5E5',
                    color: selectedTemplate && !isSubmitting ? '#fff' : '#999',
                    height: '36px',
                    paddingLeft: '14px',
                    paddingRight: '14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: selectedTemplate && !isSubmitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {isSubmitting ? 'Starting' : 'Generate post'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
