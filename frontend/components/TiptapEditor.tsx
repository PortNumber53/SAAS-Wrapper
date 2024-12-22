'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';

interface TiptapEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  className?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent = '',
  onChange,
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html);
      }
    },
  });

  return (
    <div className={`tiptap-editor-container ${className}`}>
      <EditorContent 
        editor={editor} 
        className="w-full h-full border border-gray-300 rounded p-4 prose prose-lg max-w-none focus:outline-none [&>div]:outline-none [&>div]:focus:outline-none [&>div]:focus:ring-0 [&>div]:border-none tiptap-editor-content overflow-auto flex-grow"
      />
    </div>
  );
};
