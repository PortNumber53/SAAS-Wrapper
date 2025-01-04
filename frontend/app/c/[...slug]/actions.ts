'use server';

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { fetchContentByPath } from '@/lib/content';

// Configure marked to be more secure
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Server-side sanitization
function sanitizeHtml(html: string): string {
  try {
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.warn('HTML sanitization failed:', error);
    return html;
  }
}

export async function getPageContent(path: string) {
  try {
    const fetchedContent = await fetchContentByPath(path);

    // Check if content is not found
    if (!fetchedContent) {
      return {
        content: null,
        title: null,
        error: null,
        notFound: true
      };
    }

    // Ensure we're passing a string to marked.parse()
    const markdownString = fetchedContent?.current || '';
    const title = fetchedContent?.title || '';

    // Render markdown
    const htmlContent = marked.parse(markdownString) as string;

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(htmlContent);

    return {
      content: sanitizedContent,
      title,
      error: null,
      notFound: false
    };
  } catch (error) {
    console.error('Content fetch error', error);
    return {
      content: null,
      title: null,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      notFound: true
    };
  }
}
