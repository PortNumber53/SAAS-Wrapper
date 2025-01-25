"use server";

import { xata } from "@/lib/xata";
import { fetchContentByPath } from "@/lib/content";
import { marked } from "marked";
import { auth } from "@/app/auth";

// Configure marked to be more secure
marked.setOptions({
  gfm: true,
  breaks: false,
});

export async function getPageContent(path: string) {
  try {
    console.log("Fetching content for path:", path);

    const session = await auth();
    if (session?.user?.profile !== "god") {
      throw new Error("Unauthorized - Only god users can access the editor");
    }

    const recordContent = await fetchContentByPath(path);

    if (!recordContent) {
      // Return a special object indicating the page doesn't exist
      return {
        notFound: true,
        path: path,
        content: "",
        title: "",
      };
    }

    return {
      content: recordContent.current || "",
      title: recordContent.title || "",
      notFound: false,
      exists: true,
    };
  } catch (error) {
    console.error("Error fetching page content:", error);
    throw error;
  }
}

export async function saveContent(
  path: string,
  content: string,
  title?: string
) {
  try {
    const session = await auth();
    if (session?.user?.profile !== "god") {
      return {
        error: "Unauthorized - Only god users can save content",
      };
    }

    console.log("Saving content for path:", path);
    console.log("Content:", content);
    console.log("Title:", title);

    // Fetch existing content record
    const existingContent = await fetchContentByPath(path);
    console.log(">>>> Existing content:", existingContent);

    // Update the content record
    const updatedContent = await xata.db.pages.update(
      existingContent?.id || "",
      {
        markdown_content: JSON.stringify({
          current: content,
        }),
        title: title || existingContent?.title || "",
        path,
      }
    );

    return {
      success: true,
      content: {
        id: updatedContent.id,
        current: content,
        path,
        title: title || existingContent?.title || "",
      },
    };
  } catch (error) {
    console.error("Error saving content", error);

    // If content doesn't exist, create it
    try {
      const newContent = await createContent(path, content, title);
      return newContent;
    } catch (createError) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save or create content",
      };
    }
  }
}

export async function createContent(
  path: string,
  content: string,
  title?: string
) {
  try {
    const session = await auth();
    if (session?.user?.profile !== "god") {
      return {
        error: "Unauthorized - Only god users can create content",
      };
    }

    console.log("Creating content for path:", path);
    console.log("Content:", content);
    console.log("Title:", title);

    // Create the content record
    const newContent = await xata.db.pages.create({
      markdown_content: JSON.stringify({
        current: content,
      }),
      title: title || "",
      path,
    });

    return {
      success: true,
      content: {
        id: newContent.id,
        current: content,
        path,
        title: title || "",
      },
    };
  } catch (error) {
    console.error("Error creating content", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to create content",
    };
  }
}

// Optional: Add a function to convert markdown to HTML if needed
export async function markdownToHtml(markdown: string): Promise<string> {
  return marked.parse(markdown) as string;
}
