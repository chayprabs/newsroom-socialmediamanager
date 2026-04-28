'use client';

import { useEffect, useState } from 'react';
import { Heading, Bold, Italic, List, ListOrdered, Link, Code } from 'lucide-react';

interface MarkdownEditorProps {
  title: string;
  subtitle: string;
  initialContent: string;
  onSave: (content: string) => Promise<void> | void;
  onReset: () => Promise<string | void> | string | void;
}

export function MarkdownEditor({ title, subtitle, initialContent, onSave, onReset }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    setHasChanges(content !== initialContent);
  }, [content, initialContent]);

  const handleSave = async () => {
    await onSave(content);
    setLastSaved(new Date());
    setHasChanges(false);
  };

  const handleReset = async () => {
    const resetContent = await onReset();
    if (typeof resetContent === 'string') {
      setContent(resetContent);
    }
    setLastSaved(new Date());
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const getTimeSinceLastSaved = () => {
    if (!lastSaved) return null;
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      before + selectedText + after +
      content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="border-b bg-white"
        style={{
          borderBottomWidth: '0.5px',
          borderColor: '#E5E5E5',
          paddingTop: '24px',
          paddingBottom: '24px',
          paddingLeft: '40px',
          paddingRight: '40px'
        }}
      >
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px', color: '#000' }}>
              {title}
            </h1>
            <p style={{ fontSize: '13px', color: '#666' }}>
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="transition-all"
              style={{
                backgroundColor: '#fff',
                border: '0.5px solid #E5E5E5',
                color: '#666',
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                fontSize: '13px',
                fontWeight: 400,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#999';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E5E5';
                e.currentTarget.style.color = '#666';
              }}
              onClick={handleReset}
            >
              Reset to default
            </button>
            <button
              className="transition-all"
              disabled={!hasChanges}
              style={{
                backgroundColor: hasChanges ? '#000' : '#E5E5E5',
                color: hasChanges ? '#fff' : '#999',
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: hasChanges ? 'pointer' : 'not-allowed'
              }}
              onClick={handleSave}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="h-full max-w-[1200px] mx-auto" style={{ paddingTop: '32px', paddingLeft: '40px', paddingRight: '40px', paddingBottom: '32px' }}>
          <div
            className="bg-white h-full flex flex-col"
            style={{
              border: '0.5px solid #E5E5E5',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            {/* Toolbar */}
            <div
              className="flex items-center border-b bg-[#FAFAFA]"
              style={{
                height: '48px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderBottomWidth: '0.5px',
                borderColor: '#E5E5E5'
              }}
            >
              <div className="flex items-center gap-1">
                {[
                  { icon: Heading, action: () => insertFormatting('# ', ''), title: 'Heading' },
                  { icon: Bold, action: () => insertFormatting('**', '**'), title: 'Bold' },
                  { icon: Italic, action: () => insertFormatting('*', '*'), title: 'Italic' },
                  'divider',
                  { icon: List, action: () => insertFormatting('- ', ''), title: 'Bulleted list' },
                  { icon: ListOrdered, action: () => insertFormatting('1. ', ''), title: 'Numbered list' },
                  'divider',
                  { icon: Link, action: () => insertFormatting('[', '](url)'), title: 'Link' },
                  { icon: Code, action: () => insertFormatting('```\n', '\n```'), title: 'Code block' },
                ].map((item, index) => {
                  if (item === 'divider') {
                    return (
                      <div
                        key={`divider-${index}`}
                        style={{ width: '1px', height: '20px', backgroundColor: '#E5E5E5', marginLeft: '6px', marginRight: '6px' }}
                      ></div>
                    );
                  }
                  const { icon: Icon, action, title } = item as { icon: any; action: () => void; title: string };
                  return (
                    <button
                      key={index}
                      className="transition-all"
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: '#666',
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F0F0F0';
                        e.currentTarget.style.color = '#000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#666';
                      }}
                      onClick={action}
                      title={title}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden" style={{ padding: '24px', minHeight: 0 }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="scrollbar-hidden"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  boxSizing: 'border-box',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  overflowY: 'auto',
                  fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  color: '#000',
                  backgroundColor: 'transparent'
                }}
                placeholder="Start writing..."
              />
            </div>

            {/* Status Bar */}
            <div
              className="flex items-center justify-between border-t bg-[#FAFAFA]"
              style={{
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderTopWidth: '0.5px',
                borderColor: '#E5E5E5'
              }}
            >
              <span style={{ fontSize: '12px', color: '#999' }}>
                {lastSaved ? `Saved ${getTimeSinceLastSaved()}` : hasChanges ? 'Unsaved changes' : 'No changes'}
              </span>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {wordCount} words · {charCount} characters
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
