'use server';

import { xata } from '@/lib/xata';
import { fetchContentByPath } from '@/lib/content';
import { marked } from 'marked';
import { getSession } from '@/lib/auth';

// Configure marked to be more secure
marked.setOptions({
  gfm: true,
  breaks: false,
});

export async function getPageContent(path: string) {
  try {
    console.log('Fetching content for path:', path);

    try {
      const markdownContent = await fetchContentByPath(path);

      console.log('Raw markdown_content:', markdownContent);

      return {
        content: markdownContent?.current || '',
        error: null,
        exists: !!markdownContent
      };
    } catch (fetchError) {
      // If no content is found, return an empty string with a flag
      console.log('No content found for path:', path);
      return {
        content: '',
        error: null,
        exists: false
      };
    }
  } catch (error) {
    console.error('Unexpected content fetch error', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      exists: false
    };
  }
}

export async function saveContent(path: string, content: string) {
  // Verify user is authenticated
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    console.log('Saving content for path:', path);
    console.log('Content:', content);
    // Fetch existing content record
    const existingContent = await fetchContentByPath(path);

    // Update the content record
    const updatedContent = await xata.db.pages.update(existingContent?.id || '', {
      markdown_content: JSON.stringify({
        current: content
      }),
      path
    });

    return {
      success: true,
      content: {
        id: updatedContent.id,
        current: content,
        path
      }
    };
  } catch (error) {
    console.error('Error saving content', error);

    // If content doesn't exist, create it
    try {
      const newContent = await createContent(path, content);
      return newContent;
    } catch (createError) {
      return {
        error: error instanceof Error ? error.message : 'Failed to save or create content'
      };
    }
  }
}

export async function createContent(path: string, content: string) {
  // Verify user is authenticated
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    console.log('Creating content for path:', path);
    console.log('Content:', content);
    // Create a new content record
    const newContent = await xata.db.pages.create({
      path,
      markdown_content: JSON.stringify({
        current: content
      })
    });

    return {
      success: true,
      content: {
        id: newContent.id,
        current: content,
        path
      }
    };
  } catch (error) {
    console.error('Error creating content', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create content'
    };
  }
}

// Optional: Add a function to convert markdown to HTML if needed
export async function markdownToHtml(markdown: string): Promise<string> {
  return marked.parse(markdown) as string;
}
