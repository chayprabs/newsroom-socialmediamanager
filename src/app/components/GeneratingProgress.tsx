import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';

export function GeneratingProgress() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Generating - Newsroom';
  }, []);

  const handleCancel = () => {
    navigate('/dashboard');
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
            <EmptyState
              title="No active generation"
              description="Generation progress will appear here once the real workflow is wired up."
            />

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
