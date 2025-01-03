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
      error: null
    };
  } catch (error) {
    console.error('Content fetch error', error);
    return {
      content: null,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}
