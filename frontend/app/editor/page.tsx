'use client';

import { useState } from 'react';
import { TiptapEditor } from '@/components/TiptapEditor';

export default function EditorPage() {
  const [content, setContent] = useState(`
    <h1>Welcome to the Editor</h1>
    <p>Start editing your content here. This is a rich text editor with support for:</p>
    <ul>
      <li>Headings</li>
      <li>Bold and <strong>strong</strong> text</li>
      <li><em>Italic</em> text</li>
      <li>Lists (ordered and unordered)</li>
      <li>Links</li>
      <li>And much more!</li>
    </ul>
  `.trim());

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Content Editor</h1>
      <TiptapEditor 
        initialContent={content}
        onChange={setContent}
        className="mb-6"
      />
    </div>
  );
}
