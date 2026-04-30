'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { RunSummary } from '@/lib/types';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { RunCard } from './RunCard';

const SUGGESTION_SEEDS = [
  'AI hiring',
  'Founder lineage',
  'Headcount changes',
  'Web traffic shifts',
  'European unicorns',
  'Recent funding',
];

const MAX_RECENT_STEERING_CHIPS = 2;
const MAX_RECENT_CHIP_LABEL_CHARS = 36;

function normalizeChipValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenOverlapRatio(a: string, b: string) {
  const aTokens = new Set(normalizeChipValue(a).split(' ').filter(Boolean));
  const bTokens = new Set(normalizeChipValue(b).split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / Math.min(aTokens.size, bTokens.size);
}

function isMeaningfullyDifferentFromSeeds(candidate: string) {
  const normalizedCandidate = normalizeChipValue(candidate);
  if (!normalizedCandidate) return false;

  return !SUGGESTION_SEEDS.some((seed) => {
    const normalizedSeed = normalizeChipValue(seed);
    return (
      normalizedCandidate === normalizedSeed ||
      normalizedCandidate.includes(normalizedSeed) ||
      normalizedSeed.includes(normalizedCandidate) ||
      tokenOverlapRatio(candidate, seed) >= 0.75
    );
  });
}

function formatRecentChip(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_RECENT_CHIP_LABEL_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_RECENT_CHIP_LABEL_CHARS - 3).trimEnd()}...`;
}

export function Dashboard() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [steeringInput, setSteeringInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keepChipsAfterSelection, setKeepChipsAfterSelection] = useState(false);
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);
  const [recentSteerings, setRecentSteerings] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'Newsroom';

    fetch('/api/runs')
      .then((response) => response.json())
      .then((data) => {
        setRuns(data.runs ?? []);
        if (Array.isArray(data.recent_steerings)) {
          setRecentSteerings(
            data.recent_steerings.filter(
              (entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0,
            ),
          );
        }
      })
      .catch(() => setRuns([]));
  }, []);

  const handleCreateRun = async () => {
    if (isCreating) return;
    setIsCreating(true);

    const trimmedSteering = steeringInput.trim();
    try {
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmedSteering ? { steering_input: trimmedSteering } : {}),
      });
      const data = await response.json();
      router.push(`/generating?runId=${data.run.run_id}`);
    } catch (error) {
      setIsCreating(false);
      throw error;
    }
  };

  const chips = useMemo(() => {
    const seedKeys = new Set(SUGGESTION_SEEDS.map((seed) => seed.toLowerCase()));
    const blendedRecents: Array<{ label: string; value: string }> = [];
    for (const candidate of recentSteerings) {
      const trimmed = candidate.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seedKeys.has(key) || !isMeaningfullyDifferentFromSeeds(trimmed)) continue;
      if (blendedRecents.some((existing) => existing.value.toLowerCase() === key)) continue;
      blendedRecents.push({ label: formatRecentChip(trimmed), value: trimmed });
      if (blendedRecents.length >= MAX_RECENT_STEERING_CHIPS) break;
    }
    return [
      ...blendedRecents,
      ...SUGGESTION_SEEDS.map((seed) => ({ label: seed, value: seed })),
    ];
  }, [recentSteerings]);

  const inputBorderColor = isInputFocused ? '#1A1A1A' : '#E5E5E5';
  const showSuggestionChips = steeringInput.trim().length === 0 || keepChipsAfterSelection;

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            paddingTop: '48px',
            paddingLeft: '48px',
            paddingRight: '48px',
            paddingBottom: '48px',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 500,
                marginBottom: '6px',
                color: '#000',
                letterSpacing: '-0.02em',
              }}
            >
              Runs
            </h1>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              Each run produces one issue.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <input
                type="text"
                value={steeringInput}
                onChange={(event) => {
                  setSteeringInput(event.target.value);
                  setKeepChipsAfterSelection(false);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isCreating) {
                    event.preventDefault();
                    handleCreateRun();
                  }
                }}
                placeholder="What do you want a post about? (Optional — leave blank for general trending discovery)"
                aria-label="Steering input for the next run"
                className="min-w-0 placeholder:text-[#999999]"
                style={{
                  flex: '0 1 520px',
                  width: '520px',
                  maxWidth: '100%',
                  height: '36px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: 400,
                  fontFamily: 'inherit',
                  color: '#1A1A1A',
                  border: `0.5px solid ${inputBorderColor}`,
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxShadow: 'none',
                  transition: 'border-color 120ms ease',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                style={{
                  flexShrink: 0,
                  backgroundColor: isCreating ? '#888888' : '#0F0F0F',
                  color: '#fff',
                  height: '36px',
                  padding: '0 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(event) => {
                  if (!isCreating) event.currentTarget.style.backgroundColor = '#000000';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = isCreating ? '#888888' : '#0F0F0F';
                }}
                onClick={() => {
                  handleCreateRun();
                }}
                disabled={isCreating}
              >
                Generate new post
              </button>
            </div>

            <div
              role="group"
              aria-label="Suggested steering topics"
              aria-hidden={!showSuggestionChips}
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: '8px',
                marginTop: showSuggestionChips ? '12px' : '0',
                maxHeight: showSuggestionChips ? '32px' : '0',
                opacity: showSuggestionChips ? 1 : 0,
                overflow: 'hidden',
                pointerEvents: showSuggestionChips ? 'auto' : 'none',
                transition: 'opacity 160ms ease, max-height 160ms ease, margin-top 160ms ease',
              }}
            >
              {chips.map((chip) => {
                const isHovered = hoveredChip === chip.label;
                return (
                  <button
                    key={`${chip.value}:${chip.label}`}
                    type="button"
                    onClick={() => {
                      setSteeringInput(chip.value);
                      setKeepChipsAfterSelection(true);
                    }}
                    onMouseEnter={() => setHoveredChip(chip.label)}
                    onMouseLeave={() =>
                      setHoveredChip((prev) => (prev === chip.label ? null : prev))
                    }
                    title={chip.value}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '28px',
                      backgroundColor: isHovered ? '#E5E5E5' : '#F1F1F1',
                      color: '#444444',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '6px 12px',
                      fontSize: '12pt',
                      fontWeight: 400,
                      fontFamily: 'inherit',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {runs.length === 0 ? (
            <EmptyState
              title="No runs yet"
              description="Generate your first post to get started."
            />
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              }}
            >
              {runs.map((run) => (
                <RunCard
                  key={run.run_id}
                  imageUrl={run.image_url}
                  headline={run.headline}
                  date={run.date}
                  status={run.status}
                  onClick={() => router.push(`/runs/${run.run_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
