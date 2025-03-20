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

const QUERY_CLASSIFIER_PROMPT = `You are a medical query classifier. Your task is to determine if the user's question is related to medical procedures, healthcare pricing, hospital services, or health conditions that would benefit from searching a database of medical procedures.

Respond with "YES" if the query is medical-related and should use the procedure database, or "NO" if it's a general question that doesn't require medical procedure lookup.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as ChatRequest;
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // First, determine if this is a medical-related query
    const classifierResponse = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: QUERY_CLASSIFIER_PROMPT },
        { role: 'user', content: userQuery }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.1,
      max_tokens: 10,
    });

    const classification = classifierResponse.choices[0]?.message?.content?.trim().toUpperCase() || '';
    const isMedicalQuery = classification.includes('YES');
    
    console.log(`Query classification: ${classification}, Is medical: ${isMedicalQuery}`);

    let aiResponse;
    let searchResults: SearchResult[] = [];

    if (isMedicalQuery) {
      // Call Python FastAPI server for medical procedure search
      console.log('Executing search with medical query:', userQuery);
      
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

        const searchData = await searchResponse.json() as { results: SearchResult[] };
        
        // Sort results by score (assuming higher is better) and take only top 5
        searchResults = searchData.results
          .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
          .slice(0, 5);
        
        console.log('Top 5 search results:', JSON.stringify(searchResults, null, 2));

        // Format context for AI
        const searchContext = searchResults
          .map((hit: SearchResult) => `${hit.text}`)
          .join('\n\n');

        // Get AI response using search results
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Query: ${userQuery}\n\nTop 5 most relevant procedures found:\n${searchContext}\n\nPlease analyze these procedures and provide insights relevant to the user's query. Ignore any procedures that don't seem relevant. Do not number or enumerate the procedures in your response - just refer to them directly.` }
          ],
          model: 'llama3-8b-8192',
          temperature: 0.5,
          max_tokens: 500,
        });

        aiResponse = completion.choices[0]?.message?.content || 'No response generated';
      } catch (searchError: unknown) {
        console.error('Search API error:', searchError);
        return NextResponse.json(
          { error: `Failed to fetch search results: ${searchError instanceof Error ? searchError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else {
      // For non-medical queries, respond directly without calling the backend
      console.log('Handling general query without search:', userQuery);
      
      const generalCompletion = await groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful assistant. You can answer general questions, but for medical procedure pricing in California hospitals, you'll need specific information which isn't available for this type of query.` 
          },
          ...messages
        ],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 500,
      });

      aiResponse = generalCompletion.choices[0]?.message?.content || 'No response generated';
    }

    const response: ChatResponse = {
      message: aiResponse,
      searchResults: searchResults,
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 