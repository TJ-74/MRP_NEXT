import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a Healthcare Price Transparency Assistant for California hospitals. Make your responses short, concise, and to the point.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: lastMessage.content,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response at this time.';
    
    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 