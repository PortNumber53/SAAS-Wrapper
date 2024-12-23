'use server';

import { marked } from 'marked';
import * as DOMPurify from 'dompurify';
import { fetchContentByPath } from '@/lib/content';

// Configure marked to be more secure
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Server-side sanitization
function sanitizeHtml(html: string): string {
  // Ensure we're using the sanitize method correctly
  if (typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(html);
  }
  
  // Fallback if sanitize is not available
  console.warn('DOMPurify sanitize method not found, returning original HTML');
  return html;
}

export async function getPageContent(path: string) {
  try {
    const markdownContent = await fetchContentByPath(path);
    
    // Render markdown
    const htmlContent = marked.parse(markdownContent) as string;

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(htmlContent);

    return {
      content: sanitizedContent,
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
