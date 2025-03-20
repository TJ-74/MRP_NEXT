import React, { useState } from 'react';
import { Bot, Check, CheckCircle2, User, ExternalLink } from 'lucide-react';
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
  isDone?: boolean;
  onProcedureClick?: (procedure: string) => void;
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
  code: ({ children }) => (
    <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-200">
      {children}
    </code>
  ),
};

export function ChatMessage({ 
  text, 
  sender, 
  searchResults, 
  onMarkDone, 
  isDone: propIsDone,
  onProcedureClick 
}: ChatMessageProps) {
  const [localIsDone, setLocalIsDone] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isDone = propIsDone || localIsDone;

  const handleMarkDone = () => {
    setLocalIsDone(true);
    onMarkDone?.();
  };

  const handleProcedureClick = (procedure: string) => {
    if (onProcedureClick) {
      onProcedureClick(procedure);
    }
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
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-lg px-5 py-3 shadow-md transition-all ${
          sender === 'user'
            ? 'bg-blue-600 text-white'
            : isDone
            ? 'bg-gradient-to-r from-green-700 to-green-600 text-white'
            : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start">
            {sender === 'user' && (
              <User className="mr-2 mt-1 flex-shrink-0 text-blue-200" size={18} />
            )}
            {(sender === 'ai' || sender === 'system') && (
              <Bot className="mr-2 mt-1 flex-shrink-0 text-gray-200" size={18} />
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
              className={`ml-2 p-1 h-7 rounded-full transition-all ${
                isDone 
                  ? 'bg-green-600 text-white hover:bg-green-500' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-white'
              }`}
              onClick={handleMarkDone}
              disabled={isDone}
              title={isDone ? "Marked as helpful" : "Mark as helpful"}
            >
              {isDone ? (
                <CheckCircle2 size={16} />
              ) : (
                <Check size={16} />
              )}
            </Button>
          )}
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="mt-4 text-sm border-t border-gray-500 pt-4">
            <p className="text-gray-200 mb-3 font-medium text-xs uppercase tracking-wider">Related Procedures</p>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-md p-3 text-gray-200 hover:bg-gray-700/50 transition-all border border-gray-700/50 cursor-pointer group"
                  onClick={() => handleProcedureClick(result.text)}
                >
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs mr-3">{index + 1}</span>
                    <div className="flex-1">
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                        >
                          {result.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 mt-1" />
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