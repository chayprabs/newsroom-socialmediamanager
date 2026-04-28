'use client';

import { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultDesignContent = '';

export function ManageDesign() {
  const [content, setContent] = useState('');

  useEffect(() => {
    document.title = 'Manage design - Newsroom';
    fetch('/api/design')
      .then((response) => response.json())
      .then((data) => setContent(data.content ?? ''));
  }, []);

  const handleSave = async (nextContent: string) => {
    await fetch('/api/design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: nextContent }),
    });
    setContent(nextContent);
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to default? This will overwrite your current content.')) {
      const response = await fetch('/api/design/reset', { method: 'POST' });
      const data = await response.json();
      setContent(data.content ?? '');
      return data.content ?? '';
    }
  };

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
