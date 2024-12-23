'use client';

import { useState } from 'react';
import { TiptapEditor } from '@/components/TiptapEditor';
import { saveContent, createContent } from './actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface EditorProps {
  initialContent: string;
  path: string;
  exists: boolean;
}

export function Editor({ initialContent, path, exists }: EditorProps) {
  // Ensure initialContent is always a string, defaulting to empty string if undefined
  const [content, setContent] = useState(initialContent || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure content is not empty or just whitespace
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        toast.error('Content cannot be empty');
        setIsSaving(false);
        return;
      }

      // Determine whether to save or create based on exists flag
      let result;
      if (exists) {
        result = await saveContent(path, trimmedContent);
      } else {
        result = await createContent(path, trimmedContent);
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
    <div className="w-full h-screen flex flex-col">
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
      
      <div className="flex-grow overflow-auto">
        <TiptapEditor 
          initialContent={content}
          onChange={setContent}
          className="h-full"
        />
      </div>
    </div>
  );
}
