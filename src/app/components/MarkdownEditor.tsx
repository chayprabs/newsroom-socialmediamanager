'use client';

import { useEffect, useState } from 'react';
import { Bold, Code, Heading, Italic, Link, List, ListOrdered } from 'lucide-react';

interface SaveResult {
  content?: string;
  filePath?: string;
}

interface MarkdownEditorProps {
  title: string;
  subtitle: string;
  initialContent: string;
  onSave: (content: string) => Promise<SaveResult | void> | SaveResult | void;
  onReset: () => Promise<string | void> | string | void;
  extraAction?: {
    label: string;
    isWorking?: boolean;
    onClick: () => Promise<void> | void;
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function MarkdownEditor({ title, subtitle, initialContent, onSave, onReset, extraAction }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setContent(initialContent);
    setSavedContent(initialContent);
    setSaveStatus('idle');
    setSaveMessage('');
  }, [initialContent]);

  const hasChanges = content !== savedContent;
  const isSaving = saveStatus === 'saving';

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

  const handleContentChange = (nextContent: string) => {
    setContent(nextContent);
    if (saveStatus !== 'saving') {
      setSaveStatus('idle');
      setSaveMessage('');
    }
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setSaveStatus('saving');
    setSaveMessage('');

    try {
      const result = await onSave(content);
      const savedValue = typeof result?.content === 'string' ? result.content : content;

      setContent(savedValue);
      setSavedContent(savedValue);
      setLastSaved(new Date());
      setSaveStatus('saved');
      setSaveMessage(result?.filePath ? `Saved to ${result.filePath}` : 'Saved locally');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Could not save changes.');
    }
  };

  const handleReset = async () => {
    const resetContent = await onReset();
    if (typeof resetContent !== 'string') return;

    setContent(resetContent);
    setSavedContent(resetContent);
    setLastSaved(new Date());
    setSaveStatus('saved');
    setSaveMessage('Reset saved locally');
  };

  const insertFormatting = (before: string, after = '') => {
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[data-markdown-editor="true"]');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);

    handleContentChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const saveButtonLabel = isSaving ? 'Saving' : saveStatus === 'saved' && !hasChanges ? 'Saved' : 'Save changes';
  const statusText =
    saveStatus === 'saving'
      ? 'Saving changes...'
      : saveStatus === 'error'
        ? saveMessage
        : saveMessage || (lastSaved ? `Saved ${getTimeSinceLastSaved()}` : hasChanges ? 'Unsaved changes' : 'No changes');

  return (
    <div className="h-full flex flex-col">
      <div
        className="border-b bg-white"
        style={{
          borderBottomWidth: '0.5px',
          borderColor: '#E5E5E5',
          paddingTop: '24px',
          paddingBottom: '24px',
          paddingLeft: '40px',
          paddingRight: '40px',
        }}
      >
        <div className="flex items-center justify-between max-w-[1200px] mx-auto">
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px', color: '#000' }}>
              {title}
            </h1>
            <p style={{ fontSize: '13px', color: '#666' }}>{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {extraAction && (
              <button
                className="transition-all"
                style={{
                  backgroundColor: '#fff',
                  border: '0.5px solid #E5E5E5',
                  color: '#000',
                  height: '36px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  fontSize: '13px',
                  fontWeight: 400,
                  borderRadius: '8px',
                  cursor: extraAction.isWorking ? 'not-allowed' : 'pointer',
                  opacity: extraAction.isWorking ? 0.7 : 1,
                }}
                disabled={extraAction.isWorking}
                onClick={extraAction.onClick}
              >
                {extraAction.isWorking ? 'Extracting' : extraAction.label}
              </button>
            )}

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
                cursor: 'pointer',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = '#999';
                event.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = '#E5E5E5';
                event.currentTarget.style.color = '#666';
              }}
              onClick={handleReset}
            >
              Reset to default
            </button>

            <button
              className="transition-all"
              disabled={!hasChanges || isSaving}
              style={{
                backgroundColor: hasChanges && !isSaving ? '#000' : '#E5E5E5',
                color: hasChanges && !isSaving ? '#fff' : '#999',
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                border: 'none',
                cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
              }}
              onClick={handleSave}
            >
              {saveButtonLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#FAFAFA' }}>
        <div
          className="h-full max-w-[1200px] mx-auto"
          style={{ paddingTop: '32px', paddingLeft: '40px', paddingRight: '40px', paddingBottom: '32px' }}
        >
          <div
            className="bg-white h-full flex flex-col"
            style={{
              border: '0.5px solid #E5E5E5',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              className="flex items-center border-b bg-[#FAFAFA]"
              style={{
                height: '48px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderBottomWidth: '0.5px',
                borderColor: '#E5E5E5',
              }}
            >
              <div className="flex items-center gap-1">
                {[
                  { icon: Heading, action: () => insertFormatting('# '), title: 'Heading' },
                  { icon: Bold, action: () => insertFormatting('**', '**'), title: 'Bold' },
                  { icon: Italic, action: () => insertFormatting('*', '*'), title: 'Italic' },
                  'divider',
                  { icon: List, action: () => insertFormatting('- '), title: 'Bulleted list' },
                  { icon: ListOrdered, action: () => insertFormatting('1. '), title: 'Numbered list' },
                  'divider',
                  { icon: Link, action: () => insertFormatting('[', '](url)'), title: 'Link' },
                  { icon: Code, action: () => insertFormatting('```\n', '\n```'), title: 'Code block' },
                ].map((item, index) => {
                  if (item === 'divider') {
                    return (
                      <div
                        key={`divider-${index}`}
                        style={{
                          width: '1px',
                          height: '20px',
                          backgroundColor: '#E5E5E5',
                          marginLeft: '6px',
                          marginRight: '6px',
                        }}
                      />
                    );
                  }

                  const { icon: Icon, action, title } = item as { icon: typeof Heading; action: () => void; title: string };
                  return (
                    <button
                      key={title}
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
                        borderRadius: '6px',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = '#F0F0F0';
                        event.currentTarget.style.color = '#000';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = 'transparent';
                        event.currentTarget.style.color = '#666';
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

            <div className="flex-1 overflow-hidden" style={{ padding: '24px', minHeight: 0 }}>
              <textarea
                data-markdown-editor="true"
                value={content}
                onChange={(event) => handleContentChange(event.target.value)}
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
                  backgroundColor: 'transparent',
                }}
                placeholder="Start writing..."
              />
            </div>

            <div
              className="flex items-center justify-between border-t bg-[#FAFAFA]"
              style={{
                height: '36px',
                paddingLeft: '16px',
                paddingRight: '16px',
                borderTopWidth: '0.5px',
                borderColor: '#E5E5E5',
              }}
            >
              <span style={{ fontSize: '12px', color: saveStatus === 'error' ? '#B42318' : '#999' }}>{statusText}</span>
              <span style={{ fontSize: '12px', color: '#999' }}>
                {wordCount} words - {charCount} characters
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
