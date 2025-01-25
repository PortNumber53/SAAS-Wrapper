"use client";

import { useState, useEffect } from "react";
import { getPageContent } from "./actions";

export default function PublicContentPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preserve the leading '/' for path consistency
  const path = `/${params.slug.join("/").replace(/^(c|e)\//, "")}`;

  // Fetch existing content
  useEffect(() => {
    async function fetchContent() {
      try {
        console.log("Fetching content for path in page:", path);

        const result = await getPageContent(path);

        if (result.notFound) {
          setError("Page not found");
        } else {
          setContent(result.content || "");
          setTitle(result.title || "");
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch content", error);
        setError("Failed to load content");
        setLoading(false);
      }
    }

    fetchContent();
  }, [path]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-24">
      {title && <h1 className="text-3xl font-bold mb-6">{title}</h1>}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
