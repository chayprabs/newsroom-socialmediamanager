'use client';

import { useEffect, useState } from 'react';

interface DebugFile {
  name: string;
  url: string;
}

export function DebugBundle({ runId, visible }: { runId: string | null; visible: boolean }) {
  const [files, setFiles] = useState<DebugFile[]>([]);

  useEffect(() => {
    if (!runId || !visible) {
      setFiles([]);
      return;
    }

    let isMounted = true;
    fetch(`/api/runs/${runId}/debug`)
      .then((response) => (response.ok ? response.json() : { files: [] }))
      .then((data) => {
        if (isMounted) {
          setFiles(Array.isArray(data.files) ? data.files : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFiles([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [runId, visible]);

  if (!visible || !files.length) {
    return null;
  }

  return (
    <details style={{ marginTop: '10px' }}>
      <summary style={{ color: '#555', cursor: 'pointer', fontSize: '12px' }}>View debug bundle</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        {files.map((file) => (
          <a
            key={file.name}
            href={file.url}
            download
            style={{ color: '#555', fontSize: '12px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            {file.name}
          </a>
        ))}
      </div>
    </details>
  );
}
