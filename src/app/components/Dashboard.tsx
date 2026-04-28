import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';

export function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Newsroom';
  }, []);

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
                navigate('/generating');
              }}
            >
              Generate new post
            </button>
          </div>

          <EmptyState />
        </div>
      </main>
    </div>
  );
}
