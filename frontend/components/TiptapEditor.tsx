'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';
import { marked } from 'marked';

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
    content: marked.parse(initialContent) as string,
    onUpdate: ({ editor }) => {
      // Convert HTML back to markdown
      const html = editor.getHTML();
      const markdown = convertHtmlToMarkdown(html);
      
      if (onChange) {
        onChange(markdown);
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

// Helper function to convert HTML to Markdown
function convertHtmlToMarkdown(html: string): string {
  // This is a basic conversion and might need refinement
  // For a more robust solution, consider using a library like turndown
  return html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<p>(.*?)<\/p>/g, '$1\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<.*?>/g, '')
    .trim();
}
