interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = 'No runs yet',
  description = 'File your first issue to get started.',
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#F5F5F5',
          marginBottom: '20px'
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>
      <p style={{ fontSize: '16px', fontWeight: 500, color: '#000', marginBottom: '8px' }}>
        {title}
      </p>
      <p style={{ fontSize: '14px', color: '#666' }}>
        {description}
      </p>
    </div>
  );
}
