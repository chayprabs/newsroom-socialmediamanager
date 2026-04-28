'use client';

interface RunCardProps {
  imageUrl?: string;
  headline: string;
  date: string;
  status: string;
  onClick?: () => void;
}

export function RunCard({ imageUrl, headline, date, status, onClick }: RunCardProps) {
  return (
    <div
      className="bg-white cursor-pointer transition-all group"
      style={{
        border: '0.5px solid #E5E5E5',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#CCCCCC';
        e.currentTarget.style.backgroundColor = '#FAFAFA';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E5E5';
        e.currentTarget.style.backgroundColor = '#fff';
      }}
      onClick={onClick}
    >
      <div style={{ aspectRatio: '4 / 5', backgroundColor: '#F5F5F5', borderBottom: '0.5px solid #E5E5E5' }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <h3
          className="line-clamp-2"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '1.4',
            color: '#000',
            marginBottom: '10px'
          }}
        >
          {headline}
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="rounded-full"
            style={{
              width: '7px',
              height: '7px',
              backgroundColor: status === 'failed' ? '#EF4444' : '#22C55E'
            }}
          />
          <span style={{ fontSize: '12px', color: '#888' }}>{date}</span>
          <span style={{ fontSize: '12px', color: '#C0C0C0' }}>·</span>
          <span style={{ fontSize: '12px', color: '#888' }}>{status}</span>
        </div>
      </div>
    </div>
  );
}
