import { useEffect } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultBaseContent = '';

export function ManageBase() {
  useEffect(() => {
    document.title = 'Manage base - Newsroom';
  }, []);

  const handleSave = (content: string) => {
    console.log('Saving base content:', content);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default? This will overwrite your current content.')) {
      console.log('Reset to default');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <MarkdownEditor
        title="Manage base"
        subtitle="Edit the editorial DNA Newsroom learns from."
        initialContent={defaultBaseContent}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
