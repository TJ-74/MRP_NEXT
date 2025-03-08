import React, { useState } from 'react';
import { Bot, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface SearchResult {
  id: string;
  score: string;
  text: string;
  category?: string;
}

interface ChatMessageProps {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  searchResults?: SearchResult[];
  onMarkDone?: () => void;
}

const MarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({  children }) => (
    <ul className="list-disc ml-4 mb-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal ml-4 mb-2">{children}</ol>
  ),
  li: ({  children }) => (
    <li className="mb-1">{children}</li>
  ),
  h1: ({  children }) => (
    <h1 className="text-xl font-bold mb-2">{children}</h1>
  ),
  h2: ({  children }) => (
    <h2 className="text-lg font-bold mb-2">{children}</h2>
  ),
  h3: ({  children }) => (
    <h3 className="text-md font-bold mb-2">{children}</h3>
  ),
  strong: ({  children }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({  children }) => (
    <em className="italic">{children}</em>
  ),
  blockquote: ({  children }) => (
    <blockquote className="border-l-2 border-gray-400 pl-4 my-2 italic">
      {children}
    </blockquote>
  ),
};

export function ChatMessage({  text, sender, searchResults, onMarkDone }: ChatMessageProps) {
  const [isDone, setIsDone] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMarkDone = () => {
    setIsDone(true);
    onMarkDone?.();
  };

  // Format the text to include markdown for better readability
  const formatText = (text: string) => {
    // Add line breaks between sentences
    const formattedText = text.replace(/([.!?])\s+/g, '$1\n\n');
    
    // Add bullet points for lists (if text contains items with numbers or dashes)
    const withBullets = formattedText.replace(/^(\d+\.|-)(?!\n)/gm, '\n$1');
    
    return withBullets;
  };

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 flex flex-col ${
          sender === 'user'
            ? 'bg-blue-600 text-white'
            : isDone
            ? 'bg-green-700 text-white'
            : 'bg-gray-700 text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start">
            {(sender === 'ai' || sender === 'system') && (
              <Bot className="mr-2 mt-1 flex-shrink-0" size={16} />
            )}
            <div 
              className={`prose prose-invert max-w-none ${
                !isExpanded && text.length > 300 ? 'cursor-pointer' : ''
              }`}
              onClick={() => text.length > 300 && setIsExpanded(!isExpanded)}
            >
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {isExpanded || text.length <= 300 
                    ? formatText(text)
                    : formatText(text.slice(0, 300) + '... (Click to expand)')}
                </ReactMarkdown>
              </div>
            </div>
          </div>
          {sender === 'ai' && (
            <Button
              variant="ghost"
              size="sm"
              className={`ml-2 p-1 h-6 ${isDone ? 'text-green-300' : 'text-gray-400 hover:text-white'}`}
              onClick={handleMarkDone}
              disabled={isDone}
            >
              {isDone ? (
                <CheckCircle2 size={16} className="text-green-300" />
              ) : (
                <Check size={16} />
              )}
            </Button>
          )}
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="mt-4 text-sm border-t border-gray-600 pt-4">
            <p className="text-gray-400 mb-3 font-medium">Related Procedures:</p>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-gray-800 rounded-md p-3 text-gray-300 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start">
                    <span className="text-gray-400 mr-3 font-medium">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                        >
                          {result.text}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className="text-gray-400 text-xs px-2 py-1 bg-gray-700 rounded-full">
                          Relevance Score: {result.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 