'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Editor } from './editor';
import { getPageContent } from './actions';

export const runtime = 'edge';

export default function EditContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  const { data: session, status } = useSession();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);

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
        console.log('Fetching content for path in page:', path);

        const { content: fetchedContent, title: fetchedTitle, error: fetchError, exists: contentExists } = await getPageContent(path);

        console.log('Fetched content in page:', fetchedContent);
        console.log('Content exists:', contentExists);
        console.log('>>>>title:', fetchedTitle);

        if (fetchError) {
          setError(fetchError);
          setContent('');
          setTitle('');
          setExists(false);
        } else {
          // Ensure content is a string and not undefined
          // If fetchedContent is falsy, use an empty string
          setContent(fetchedContent || '');
          setTitle(fetchedTitle || '');
          // Ensure contentExists is a boolean
          setExists(!!contentExists);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch content', error);
        setError('Failed to load content');
        setLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading content: {error}
      </div>
    );
  }

  return (
    <Editor
      initialContent={content}
      path={path}
      initialTitle={title}
      exists={exists}
    />
  );
}
