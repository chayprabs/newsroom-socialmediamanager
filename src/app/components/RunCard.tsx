interface RunCardProps {
  headline: string;
  date: string;
  status: 'done' | 'error';
}

export function RunCard({ headline, date, status }: RunCardProps) {
  return (
    <div
      className="bg-white cursor-pointer transition-all group"
      style={{
        border: '0.5px solid #E5E5E5',
        borderRadius: '12px',
        padding: '20px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#CCCCCC';
        e.currentTarget.style.backgroundColor = '#FAFAFA';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E5E5';
        e.currentTarget.style.backgroundColor = '#fff';
      }}
      onClick={() => {
        console.log('Run card clicked:', headline);
      }}
    >
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: '12px' }}>
        <h3
          className="line-clamp-2 flex-1"
          style={{
            fontSize: '15px',
            fontWeight: 500,
            lineHeight: '1.4',
            color: '#000'
          }}
        >
          {headline}
        </h3>
        <div
          className="flex-shrink-0 rounded-full"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: status === 'done' ? '#22C55E' : '#EF4444',
            marginTop: '4px'
          }}
        ></div>
      </div>

      <div className="flex items-center gap-2">
        <span style={{ fontSize: '13px', color: '#999' }}>{date}</span>
      </div>
    </div>
  );
}
