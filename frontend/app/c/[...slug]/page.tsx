import { getPageContent } from './actions';

export const runtime = 'edge';

export default async function ContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  // Construct the full path with a leading '/'
  const path = `/${params.slug.join('/')}`;
  
  const { content, error } = await getPageContent(path);

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading content: {error}
      </div>
    );
  }

  return (
    <div 
      className="prose max-w-full"
      dangerouslySetInnerHTML={{ __html: content || '' }}
    />
  );
}
