'use client';

import { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultDesignContent = '';

export function ManageDesign() {
  const [content, setContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Manage design - Newsroom';
    fetch('/api/design')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Could not load design.md.');
        }
        setContent(data.content ?? '');
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'Could not load design.md.'))
      .finally(() => setIsLoaded(true));
  }, []);

  const handleSave = async (nextContent: string) => {
    const response = await fetch('/api/design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: nextContent }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not save design.md.');
    }

    return data;
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to default? This will overwrite your current content.')) {
      const response = await fetch('/api/design/reset', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not reset design.md.');
      }

      setContent(data.content ?? '');
      return data.content ?? '';
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex flex-col">
        <TopNav />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA', fontSize: '13px', color: '#666' }}>
          Loading design.md...
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
        title="Manage design"
        subtitle="Edit the visual spec for generated posts."
        initialContent={content || defaultDesignContent}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
