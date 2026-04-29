'use client';

import { useEffect, useState } from 'react';

interface DebugFile {
  name: string;
  url: string;
}

const DEBUG_LABELS: Record<string, string> = {
  'post_raw.png': 'Pre-footer raw image',
  'stage_4c_footer_overlay.json': 'Footer overlay',
};

interface DebugBundleProps {
  runId: string | null;
  visible: boolean;
  /** Optional substring filter (e.g. "stage_4a_") to scope the listing to one stage. */
  filter?: string;
  /** Override the summary label. Defaults to "View debug bundle". */
  label?: string;
}

export function DebugBundle({ runId, visible, filter, label }: DebugBundleProps) {
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

  const visibleFiles = filter ? files.filter((file) => file.name.includes(filter)) : files;

  if (!visible || !visibleFiles.length) {
    return null;
  }

  return (
    <details style={{ marginTop: '10px' }}>
      <summary style={{ color: '#555', cursor: 'pointer', fontSize: '12px' }}>
        {label ?? 'View debug bundle'}
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
        {visibleFiles.map((file) => (
          <a
            key={file.name}
            href={file.url}
            download={file.name.endsWith('.png') ? undefined : true}
            style={{ color: '#555', fontSize: '12px', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            {DEBUG_LABELS[file.name] ?? file.name}
          </a>
        ))}
      </div>
    </details>
  );
}
