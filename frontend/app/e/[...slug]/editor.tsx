'use client';

import { useState } from 'react';
import { TiptapEditor } from '@/components/TiptapEditor';
import { saveContent, createContent } from './actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface EditorProps {
  initialContent: string;
  initialTitle?: string;
  path: string;
  exists: boolean;
}

export function Editor({
  initialContent,
  initialTitle = '',
  path,
  exists
}: EditorProps) {
  // Ensure initialContent is always a string, defaulting to empty string if undefined
  const [content, setContent] = useState(initialContent || '');
  const [title, setTitle] = useState(initialTitle || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure content is not empty or just whitespace
      const trimmedContent = content.trim();
      const trimmedTitle = title.trim();

      if (!trimmedContent) {
        toast.error('Content cannot be empty');
        setIsSaving(false);
        return;
      }

      // Determine whether to save or create based on exists flag
      let result;
      if (exists) {
        result = await saveContent(path, trimmedContent, trimmedTitle);
      } else {
        result = await createContent(path, trimmedContent, trimmedTitle);
      }

      if (result.error) {
        toast.error('Failed to save content', {
          description: result.error
        });
        return;
      }

      toast.success('Content saved successfully');
    } catch (error) {
      toast.error('An unexpected error occurred', {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-screen container mx-auto px-4 py-1 flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-bold">
          {exists ? 'Edit' : 'Create'}: {path}
        </h1>
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="container mx-auto px-4 py-16 overflow-auto">
        <div className="mb-4">
          <label htmlFor="page-title" className="block text-sm font-medium text-gray-700 mb-2">
            Page Title (Optional)
          </label>
          <input
            type="text"
            id="page-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter optional page title"
          />
        </div>
        <TiptapEditor
          initialContent={content}
          onChange={setContent}
          className="h-full"
        />
      </div>
    </div>
  );
}
