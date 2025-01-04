import { Metadata } from 'next';
import { getPageContent } from './actions';
import ClientEditContentPage from './ClientEditContentPage';

export const runtime = 'edge';

export async function generateMetadata({
  params
}: {
  params: { slug: string[] }
}): Promise<Metadata> {
  // Preserve the leading '/' for path consistency
  const path = `/${params.slug.join('/').replace(/^(c|e)\//, '')}`;

  try {
    const result = await getPageContent(path);
    
    // Use the title if available, otherwise use a default
    const title = result.title 
      ? `Edit: ${result.title} | Your Site Name`
      : `Edit Page | Your Site Name`;

    return {
      title: title,
      description: result.title 
        ? `Editing page: ${result.title}` 
        : 'Create or Edit Content Page'
    };
  } catch (error) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be loaded'
    };
  }
}

export default function EditContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  return <ClientEditContentPage params={params} />;
}
