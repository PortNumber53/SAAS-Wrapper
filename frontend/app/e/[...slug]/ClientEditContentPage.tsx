'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Editor } from './editor';
import { getPageContent } from './actions';

export default function ClientEditContentPage({
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

        const result = await getPageContent(path);

        console.log('Fetched content result:', result);

        if (result.notFound) {
          // Page doesn't exist, prepare for content creation
          setContent('');
          setTitle('');
          setExists(false);
        } else {
          // Page exists, set content and title
          setContent(result.content || '');
          setTitle(result.title || '');
          setExists(true);
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
