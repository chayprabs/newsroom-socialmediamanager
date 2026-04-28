'use client';

import { useEffect, useState } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultBaseContent = '';

export function ManageBase() {
  const [content, setContent] = useState('');

  useEffect(() => {
    document.title = 'Manage base - Newsroom';
    fetch('/api/base')
      .then((response) => response.json())
      .then((data) => setContent(data.content ?? ''));
  }, []);

  const handleSave = async (nextContent: string) => {
    await fetch('/api/base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: nextContent }),
    });
    setContent(nextContent);
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to default? This will overwrite your current content.')) {
      const response = await fetch('/api/base/reset', { method: 'POST' });
      const data = await response.json();
      setContent(data.content ?? '');
      return data.content ?? '';
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <MarkdownEditor
        title="Manage base"
        subtitle="Edit the editorial DNA Newsroom learns from."
        initialContent={content || defaultBaseContent}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
