import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TopNav } from './TopNav';
import { EmptyState } from './EmptyState';

export function PickIdea() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Pick an idea - Newsroom';
  }, []);

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleFindNewIdeas = () => {
    navigate('/generating');
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
                Generated candidates will appear here once the idea discovery flow is connected.
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

          <div
            className="bg-white"
            style={{
              border: '0.5px solid #E5E5E5',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
          >
            <EmptyState
              title="No ideas yet"
              description="Candidate ideas will appear here after the real discovery pipeline runs."
            />
          </div>

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
              disabled
              style={{
                backgroundColor: '#E5E5E5',
                color: '#999',
                height: '36px',
                paddingLeft: '14px',
                paddingRight: '14px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: 'not-allowed'
              }}
            >
              Generate post
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
