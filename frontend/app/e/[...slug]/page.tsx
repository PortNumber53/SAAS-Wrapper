'use client';

import { useState, useEffect } from 'react';
import { TiptapEditor } from '@/components/TiptapEditor';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getXataClient } from '@/lib/xata';
import { fetchContentByPath, MarkdownContent } from '@/lib/content';

export default function EditContentPage({ 
  params 
}: { 
  params: { slug: string[] } 
}) {
  const { data: session, status } = useSession();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Preserve the leading '/' for path consistency
  const path = `/${params.slug.join('/').replace(/^(c|e)\//, '')}`;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  // Fetch existing content
  useEffect(() => {
    async function fetchContent() {
      try {
        const markdownContent = await fetchContentByPath(path);
        
        // Get the current version of markdown content
        setContent(markdownContent.current);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch content', error);
        setLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  // Save content
  const saveContent = async (publish = false) => {
    try {
      const xata = getXataClient();
      
      // First, unpublish any existing published records for this path
      await xata.db.pages
        .filter({ path, is_published: true })
        .update({ is_published: false });

      // Upsert the new record
      await xata.db.pages.upsert({
        path,
        markdown_content: JSON.stringify({ 
          current: content, 
          timestamp: new Date().toISOString() 
        }),
        owner: session?.user?.id,
        is_homepage: false,
        is_published: publish
      });

      toast.success(publish ? 'Content published successfully' : 'Content saved as draft');
    } catch (error) {
      console.error('Save content error', error);
      toast.error('Failed to save content');
    }
  };

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Editing: {path}</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => saveContent(true)}
          >
            Publish
          </Button>
          <Button onClick={() => saveContent(false)}>Save Draft</Button>
        </div>
      </div>
      <TiptapEditor 
        initialContent={content}
        onChange={setContent}
        className="flex-grow"
      />
    </div>
  );
}
