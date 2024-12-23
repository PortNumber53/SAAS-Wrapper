'use client';

import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { fetchContentByPath, MarkdownContent } from '@/lib/content';

// Configure marked to be more secure
marked.setOptions({
  gfm: true,
  breaks: false,
  sanitize: true  // This enables basic HTML sanitization
});

export default function ContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preserve the leading '/' for path consistency
  const path = `/${params.slug.join('/').replace(/^(c|e)\//, '')}`;

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      try {
        const markdownContent = await fetchContentByPath(path);

        // Render markdown
        const htmlContent = marked.parse(markdownContent.current);

        setContent(htmlContent);
        setLoading(false);
      } catch (fetchError) {
        console.error('Content fetch error', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'An unknown error occurred');
        setLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div
        className="max-w-full"
        dangerouslySetInnerHTML={{
          __html: content
            .replace(/<h1>/g, '<h1 class="text-3xl font-extrabold text-foreground mb-4">')
            .replace(/<p>/g, '<p class="text-base text-muted-foreground mb-2">')
        }}
      />
    </div>
  );
}
