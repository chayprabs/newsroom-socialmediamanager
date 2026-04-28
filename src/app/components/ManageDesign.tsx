import { useEffect } from 'react';
import { TopNav } from './TopNav';
import { MarkdownEditor } from './MarkdownEditor';

const defaultDesignContent = '';

export function ManageDesign() {
  useEffect(() => {
    document.title = 'Manage design - Newsroom';
  }, []);

  const handleSave = (content: string) => {
    console.log('Saving design content:', content);
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
        title="Manage design"
        subtitle="Edit the visual spec for generated posts."
        initialContent={defaultDesignContent}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
