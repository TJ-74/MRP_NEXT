import React, { useState } from 'react';
import { Bot, Check, CheckCircle2, User, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import SqlQueryWindow from './SqlQueryWindow';

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
  onSqlExecute?: (query: string) => void;
}

const MarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed break-words">{children}</p>
  ),
  ul: ({  children }) => (
    <ul className="list-disc ml-4 mb-3 mt-2 overflow-x-hidden">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal ml-4 mb-3 mt-2 overflow-x-hidden">{children}</ol>
  ),
  li: ({  children }) => (
    <li className="mb-1 leading-relaxed break-words">{children}</li>
  ),
  h1: ({  children }) => (
    <h1 className="text-xl font-bold mb-3 mt-4 break-words">{children}</h1>
  ),
  h2: ({  children }) => (
    <h2 className="text-lg font-bold mb-2 mt-3 break-words">{children}</h2>
  ),
  h3: ({  children }) => (
    <h3 className="text-md font-bold mb-2 mt-3 break-words">{children}</h3>
  ),
  strong: ({  children }) => (
    <strong className="font-bold text-white break-words">{children}</strong>
  ),
  em: ({  children }) => (
    <em className="italic text-gray-200 break-words">{children}</em>
  ),
  blockquote: ({  children }) => (
    <blockquote className="border-l-2 border-blue-400 pl-4 my-3 italic text-gray-300 break-words">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm break-all whitespace-pre-wrap">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 table-container">
      <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-800">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-700">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr>{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider break-words">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 whitespace-normal break-words text-sm text-gray-300">{children}</td>
  ),
};

export function ChatMessage({ 

  text, 
  sender, 
  searchResults, 
  onMarkDone, 
  isDone: propIsDone,
  onProcedureClick,
  onSqlExecute
}: ChatMessageProps) {
  const [localIsDone, setLocalIsDone] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSqlWindow, setShowSqlWindow] = useState(false);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  
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

  // Check if the message contains a SQL query
  React.useEffect(() => {
    if (text.includes('Generated SQL Query:')) {
      const query = text.split('Generated SQL Query:')[1].trim();
      setSqlQuery(query);
      setShowSqlWindow(true);
    }
  }, [text]);

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-6 message-appear`}>
      {/* Avatar for non-user messages */}
      {(sender === 'ai' || sender === 'system') && (
        <div className="claude-avatar ai flex-shrink-0 mr-3">
          <Bot className="text-white" size={18} />
        </div>
      )}
      
      <div
        className={`w-auto max-w-[90%] claude-message-bubble ${
          sender === 'user'
            ? 'user bg-indigo-600/90 text-white rounded-2xl rounded-tr-sm ml-12'
            : sender === 'system'
            ? 'system bg-gray-800/90 text-white rounded-2xl rounded-tl-sm mr-12'
            : 'ai bg-gray-800/90 text-white rounded-2xl rounded-tl-sm mr-12'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 overflow-hidden">
            <div 
              className={`prose prose-invert w-full ${
                !isExpanded && text.length > 350 ? 'cursor-pointer' : ''
              }`}
              onClick={() => text.length > 350 && setIsExpanded(!isExpanded)}
            >
              <div className="markdown-content text-gray-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {isExpanded || text.length <= 350 
                    ? formatText(text)
                    : formatText(text.slice(0, 350) + '... (Click to expand)')}
                </ReactMarkdown>
              </div>
            </div>
          </div>
          
          {sender === 'ai' && (
            <Button
              variant="ghost"
              size="sm"
              className={`ml-2 p-1 h-8 w-8 rounded-full transition-all flex-shrink-0 ${
                isDone 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
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
          <div className="mt-5 text-sm border-t border-gray-500/30 pt-4">
            <p className="text-gray-300 mb-3 font-medium text-xs uppercase tracking-wider">Related Procedures</p>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3.5 text-gray-200 hover:bg-gray-700/50 transition-all border border-gray-700/30 cursor-pointer group hover:shadow-md"
                  onClick={() => handleProcedureClick(result.text)}
                >
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/70 flex items-center justify-center text-xs font-medium mr-3 shadow-sm">{index + 1}</span>
                    <div className="flex-1 overflow-hidden">
                      <div className="prose prose-invert max-w-none text-sm text-gray-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                        >
                          {result.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showSqlWindow && sqlQuery && onSqlExecute && (
          <SqlQueryWindow
            query={sqlQuery}
            onExecute={onSqlExecute}
            onClose={() => setShowSqlWindow(false)}
          />
        )}
      </div>
      
      {/* Avatar for user messages */}
      {sender === 'user' && (
        <div className="claude-avatar user flex-shrink-0 ml-3">
          <User className="text-white" size={18} />
        </div>
      )}
    </div>
  );
} 