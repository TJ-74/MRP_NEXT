import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

interface SearchResult {
  id: string;
  score: string;
  text: string;
  category?: string;
}

interface ChatMessage {
  role: 'user' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface ChatResponse {
  message: string;
  searchResults: SearchResult[];
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a Healthcare Price Transparency Assistant for California hospitals. Your task is to:
1. Analyze the provided procedure descriptions
2. Explain the matches in simple terms
3. Highlight the most relevant procedures
Make your responses concise and easy to understand.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as ChatRequest;
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Call Python FastAPI server for search
    console.log('Executing search with query:', userQuery);
    
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const searchResponse = await fetch(`${BACKEND_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.text();
        throw new Error(`Search API error: ${errorData}`);
      }

      const searchResults = await searchResponse.json() as { results: SearchResult[] };
      console.log('Search results:', JSON.stringify(searchResults, null, 2));

      // Format context for AI
      const searchContext = searchResults.results
        .map((hit: SearchResult) => `${hit.text} (Score: ${hit.score})`)
        .join('\n');

      // Get AI response using search results
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Query: ${userQuery}\n\nRelevant procedures found:\n${searchContext}` }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.5,
        max_tokens: 500,
      });

      const response: ChatResponse = {
        message: completion.choices[0]?.message?.content || 'No response generated',
        searchResults: searchResults.results,
      };

      return NextResponse.json(response);

    } catch (searchError: unknown) {
      console.error('Search API error:', searchError);
      return NextResponse.json(
        { error: `Failed to fetch search results: ${searchError instanceof Error ? searchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 