import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownRenderer.css';

/**
 * Markdown renderer component with syntax highlighting
 */
export default function MarkdownRenderer({ content, className = '' }) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link rendering (open in new tab)
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // Code blocks
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className={className}>
                <code {...props}>{children}</code>
              </pre>
            ) : (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
