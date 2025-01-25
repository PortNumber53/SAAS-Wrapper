import { Metadata } from "next";
import { getPageContent } from "./actions";
import ClientContentPage from "./ClientContentPage";
import PublicContentPage from "./PublicContentPage";
import { auth } from "@/app/auth";
import Link from "next/link";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  // Preserve the leading '/' for path consistency
  const path = `/${params.slug.join("/").replace(/^(c|e)\//, "")}`;

  try {
    const result = await getPageContent(path);

    // Use the title if available, otherwise use a default
    const title = result.title
      ? `${result.title} | Your Site Name`
      : `${path.split("/").pop()} | Your Site Name`;

    return {
      title: title,
      description: result.title ? `Page about ${result.title}` : "Content Page",
    };
  } catch (error) {
    return {
      title: "Page Not Found",
      description: "The requested page could not be loaded",
    };
  }
}

// List of paths that should be publicly accessible
const publicPaths = [
  "/website/privacy-policy",
  "/website/terms-of-service",
  "/website/about",
  "/website/contact",
];

export default async function ContentPage({
  params,
}: {
  params: { slug: string[] };
}) {
  // Get the path
  const path = `/${params.slug.join("/").replace(/^(c|e)\//, "")}`;

  // Get the current session
  const session = await auth();
  const isGodUser = session?.user?.profile === "god";

  try {
    // Try to get the content first
    const content = await getPageContent(path);

    // If content exists, show it using the appropriate component
    if (!content.notFound) {
      return isGodUser ? (
        <ClientContentPage params={params} />
      ) : (
        <PublicContentPage params={params} />
      );
    }

    // Content not found - handle differently for god users
    if (isGodUser) {
      return (
        <div className="container mx-auto px-4 py-24">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Content Not Found
            </h2>
            <p className="text-yellow-700 mb-4">
              This content does not exist yet.
            </p>
            <Link
              href={`/e${path}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Create Content
            </Link>
          </div>
        </div>
      );
    }

    // For non-god users, show 404
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Page Not Found</h2>
          <p className="text-red-700">
            The requested content could not be found.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    // Handle any errors gracefully
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-red-700">
            An error occurred while loading the content.
          </p>
        </div>
      </div>
    );
  }
}
