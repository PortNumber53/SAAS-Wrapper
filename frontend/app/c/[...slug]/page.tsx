import { getPageContent } from './actions';

export const runtime = 'edge';

export default async function ContentPage({
  params
}: {
  params: { slug: string[] }
}) {
  // Construct the full path with a leading '/'
  const path = `/${params.slug.join('/')}`;

  const { content, title, error } = await getPageContent(path);

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading content: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1>{title}</h1>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: content || '' }}
      />
    </div>
  );
}
