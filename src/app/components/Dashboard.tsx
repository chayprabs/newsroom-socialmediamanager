'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RunSummary } from '@/lib/types';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';
import { RunCard } from './RunCard';

export function Dashboard() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    document.title = 'Newsroom';

    fetch('/api/runs')
      .then((response) => response.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]));
  }, []);

  const handleCreateRun = async () => {
    setIsCreating(true);
    const response = await fetch('/api/runs', { method: 'POST' });
    const data = await response.json();
    router.push(`/generating?runId=${data.run.run_id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <TopNav />
      <main className="flex-1 overflow-auto">
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '48px', paddingLeft: '48px', paddingRight: '48px', paddingBottom: '48px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '6px', color: '#000', letterSpacing: '-0.02em' }}>
                Runs
              </h1>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                Each run produces one issue.
              </p>
            </div>
            <button
              className="transition-all"
              style={{
                backgroundColor: '#000',
                color: '#fff',
                height: '40px',
                paddingLeft: '20px',
                paddingRight: '20px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1A1A1A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000';
              }}
              onClick={() => {
                handleCreateRun();
              }}
              disabled={isCreating}
            >
              {isCreating ? 'Starting' : 'Generate new post'}
            </button>
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
