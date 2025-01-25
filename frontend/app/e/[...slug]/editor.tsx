"use client";

import { useState } from "react";
import { TiptapEditor } from "@/components/TiptapEditor";
import { saveContent, createContent } from "./actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface EditorProps {
  initialContent: string;
  initialTitle?: string;
  path: string;
  exists: boolean;
}

interface SaveResult {
  error?: string;
  success?: boolean;
  content?: {
    id: string;
    current: string;
    path: string;
    title: string;
  };
}

export function Editor({
  initialContent,
  initialTitle = "",
  path,
  exists,
}: EditorProps) {
  // Ensure initialContent is always a string, defaulting to empty string if undefined
  const [content, setContent] = useState(initialContent || "");
  const [title, setTitle] = useState(initialTitle || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
    if (showEmptyError && newContent.trim()) {
      setShowEmptyError(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    // Ensure content is not empty or just whitespace
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setShowEmptyError(true);
      toast.error("Content is required", {
        description: "Please add some content before saving",
      });
      return;
    }

    setIsSaving(true);
    // Show immediate feedback that we're starting to save
    const toastId: string | number = toast.loading("Saving changes...");

    try {
      const trimmedTitle = title.trim();

      // Determine whether to save or create based on exists flag
      let result: SaveResult;
      if (exists) {
        result = await saveContent(path, trimmedContent, trimmedTitle);
      } else {
        result = await createContent(path, trimmedContent, trimmedTitle);
      }

      if (result.error) {
        toast.error("Failed to save content", {
          description: result.error,
        });
        return;
      }

      // Dismiss the loading toast and show success
      toast.dismiss(toastId);
      toast.success("Content saved successfully");
      setHasChanges(false);
    } catch (error) {
      // Dismiss the loading toast and show error
      toast.dismiss(toastId);
      toast.error("An unexpected error occurred", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-screen container mx-auto px-4 py-24 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b sticky top-24 bg-white z-10">
        <div>
          <h1 className="text-xl font-bold mb-1">
            {exists ? "Edit" : "Create"}: {path}
          </h1>
          {hasChanges && (
            <p className="text-sm text-yellow-600">You have unsaved changes</p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="min-w-[100px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save{hasChanges ? "*" : ""}</>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="mb-4">
          <label
            htmlFor="page-title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Page Title (Optional)
          </label>
          <input
            type="text"
            id="page-title"
            value={title}
            onChange={handleTitleChange}
            disabled={isSaving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter optional page title"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label
                htmlFor="content-editor"
                className="block text-sm font-medium text-gray-700"
              >
                Content
              </label>
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(required)</span>
            </div>
            {showEmptyError && (
              <div
                className="flex items-center text-sm text-red-500"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                Content is required
              </div>
            )}
          </div>
          <div
            className={`rounded-md ${
              showEmptyError ? "ring-2 ring-red-500" : ""
            }`}
            aria-invalid={showEmptyError}
            aria-describedby={showEmptyError ? "content-error" : undefined}
          >
            <TiptapEditor
              initialContent={content}
              onChange={handleContentChange}
              className="min-h-[500px] prose max-w-none"
            />
          </div>
          {showEmptyError && (
            <div id="content-error" className="sr-only">
              Content is required. Please add some content before saving.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
