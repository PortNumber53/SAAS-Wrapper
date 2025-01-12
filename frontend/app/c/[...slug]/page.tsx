import { Metadata } from 'next';
import { getPageContent } from './actions';
import ClientContentPage from './ClientContentPage';
import PublicContentPage from './PublicContentPage';

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
      ? `${result.title} | Your Site Name`
      : `${path.split('/').pop()} | Your Site Name`;

    return {
      title: title,
      description: result.title ? `Page about ${result.title}` : 'Content Page'
    };
  } catch (error) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be loaded'
    };
  }
}

// List of paths that should be publicly accessible
const publicPaths = [
  '/website/privacy-policy',
  '/website/terms-of-service',
  '/website/about',
  '/website/contact'
];

export default function ContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  // Get the path
  const path = `/${params.slug.join('/').replace(/^(c|e)\//, '')}`;
  
  // Check if this is a public path
  const isPublicPath = publicPaths.includes(path);

  // Use PublicContentPage for public paths, ClientContentPage for others
  return isPublicPath ? (
    <PublicContentPage params={params} />
  ) : (
    <ClientContentPage params={params} />
  );
}
