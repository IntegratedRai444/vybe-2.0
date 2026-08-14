import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const code = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className= "bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props }>
        { children }
        </code>
    );
  }

return (
  <div className= "relative" >
  <div className="absolute right-2 top-2 flex space-x-1" >
    <button
          onClick={
  () => {
    navigator.clipboard.writeText(code);
  }
}
className = "p-1 text-xs text-gray-400 hover:text-white bg-gray-800 rounded"
title = "Copy code"
type = "button"
  >
  <svg className="w-3 h-3" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
    <path 
              strokeLinecap="round"
strokeLinejoin = "round"
strokeWidth = { 2}
d = "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
  />
  </svg>
  </button>
  </div>
  < SyntaxHighlighter
style = { vscDarkPlus }
language = { language }
PreTag = "div"
customStyle = {{
  margin: 0,
    padding: '1rem',
      backgroundColor: '#1E1E1E',
        borderRadius: '0.375rem',
          fontSize: '0.875rem',
            lineHeight: '1.5',
        }}
codeTagProps = {{
  style: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
}}
{...props }
      >
  { code }
  </SyntaxHighlighter>
  </div>
  );
};

export const renderMarkdown = (content: string): JSX.Element => {
  return (
    <div className= "prose dark:prose-invert max-w-none" >
    <ReactMarkdown
        components={
    {
      code: CodeBlock as any, // Temporary type assertion to avoid type issues
        }
  }
      >
    { content }
    </ReactMarkdown>
    </div>
  );
};
