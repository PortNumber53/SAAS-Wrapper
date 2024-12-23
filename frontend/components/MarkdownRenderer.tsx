'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ node, ...props }) => (
          <h1 
            className="text-3xl font-extrabold text-foreground mb-4" 
            {...props} 
          />
        ),
        h2: ({ node, ...props }) => (
          <h2 
            className="text-2xl font-bold text-foreground mb-3" 
            {...props} 
          />
        ),
        p: ({ node, ...props }) => (
          <p 
            className="text-base text-muted-foreground mb-2" 
            {...props} 
          />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
