'use client';

import { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultBaseContent = '';

export function ManageBase() {
  const [content, setContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Manage base - Newsroom';
    fetch('/api/base')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Could not load base.md.');
        }
        setContent(data.content ?? '');
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Could not load base.md.'))
      .finally(() => setIsLoaded(true));
  }, []);

  const handleSave = async (nextContent: string) => {
    const response = await fetch('/api/base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: nextContent }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not save base.md.');
    }

    return data;
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to default? This will overwrite your current content.')) {
      const response = await fetch('/api/base/reset', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not reset base.md.');
      }

      setContent(data.content ?? '');
      return data.content ?? '';
    }
  };

  const handleExtract = async () => {
    if (!window.confirm('Extract a fresh base from files in base/source/? This will replace the current editor content.')) {
      return;
    }

    setIsExtracting(true);
    const response = await fetch('/api/base/extract', { method: 'POST' });
    const data = await response.json();
    setIsExtracting(false);

    if (!response.ok) {
      window.alert(data.error || 'Could not extract the base.');
      return;
    }

    setContent(data.content ?? '');
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA', fontSize: '13px', color: '#666' }}>
          Loading base.md...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA', fontSize: '13px', color: '#B42318' }}>
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <MarkdownEditor
        title="Manage base"
        subtitle="Edit the editorial DNA Newsroom learns from."
        initialContent={content || defaultBaseContent}
        onSave={handleSave}
        onReset={handleReset}
        extraAction={{
          label: 'Extract from corpus',
          isWorking: isExtracting,
          onClick: handleExtract,
        }}
      />
    </div>
  );
}
