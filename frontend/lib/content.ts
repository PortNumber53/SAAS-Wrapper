import { xata } from './xata';

export type MarkdownContent = {
  current: string;
  timestamp?: string;
}

export async function fetchContentByPath(path: string) {
  console.log('Fetching content for path:', path);

  // Remove '/c' or '/e' prefixes if present and ensure leading '/'
  const cleanPath = path.replace(/^\/?(c|e)\//, '/').replace(/^\/+/, '/');
  console.log('Cleaned path:', cleanPath);

  try {
    // Fetch the record for this path
    const record = await xata.db.pages
      .filter({ path: cleanPath })
      .getFirst();

    console.log('Fetched record details:', {
      record,
      cleanPath
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

        // Return a plain object with only the necessary properties
        return {
          id: record.id,
          current: markdownContent.current || '',
          path: record.path
        };
      } catch (parseError) {
        console.error('Failed to parse markdown_content:', {
          rawContent: record.markdown_content,
          error: parseError
        });
        throw new Error('Failed to parse content');
      }
    }

    // Return null if no record found
    return null;
  } catch (error) {
    console.error('ERROR: Failed to fetch content', error);
    throw error;
  }
}
