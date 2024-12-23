import { getXataClient } from './xata';

export type MarkdownContent = {
  current: string;
  timestamp: string;
}

export async function fetchContentByPath(path: string) {
  console.log('Fetching content for path:', path);

  try {
    const xata = getXataClient();
    
    // Fetch the record for this path
    const record = await xata.db.pages
      .filter({ path })
      .getFirst();
    
    console.log('Fetched record details:', {
      record,
      path
    });
    
    if (record) {
      // Defensive parsing of markdown_content
      console.log('Raw markdown_content:', record.markdown_content);
      
      try {
        // Determine if markdown_content is already an object or a JSON string
        const markdownContent: MarkdownContent = 
          typeof record.markdown_content === 'string'
            ? JSON.parse(record.markdown_content)
            : record.markdown_content;

        console.log('Parsed markdown content:', markdownContent);

        return markdownContent;
      } catch (parseError) {
        console.error('Failed to parse markdown_content:', {
          rawContent: record.markdown_content,
          error: parseError
        });
        throw new Error('Failed to parse content');
      }
    } else {
      console.warn(`No record found for path: ${path}`);
      throw new Error(`No content found for path: ${path}`);
    }
  } catch (error) {
    console.error('Failed to fetch content', error);
    throw error;
  }
}
