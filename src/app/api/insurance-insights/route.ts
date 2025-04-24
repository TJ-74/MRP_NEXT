import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: Request) {
  try {
    const { insuranceData } = await request.json();

    const prompt = `As a healthcare insurance advisor, analyze the following insurance coverage data and provide patient-friendly insights:

Insurance Coverage Data:
${JSON.stringify(insuranceData, null, 2)}

Please provide a comprehensive analysis in the following format:

## 💰 Coverage Overview

Analyze the insurance providers based on:
- Average coverage percentages
- Total claim amounts
- Out-of-pocket costs
- Value for patients

## 📊 Insurance Provider Rankings

Provide a ranked analysis of each provider:
- Best overall coverage
- Lowest out-of-pocket costs
- Most consistent coverage
- Special considerations or limitations

## 💡 Patient Recommendations

Offer clear guidance for patients:
- Which insurance providers offer the best value
- Potential savings with different providers
- Important factors beyond just coverage percentage
- Coverage gaps to be aware of

## ✅ Action Steps

Provide specific next steps:
- Top 3 recommended insurance providers with reasoning
- Questions to ask insurance providers
- Important coverage details to verify
- Tips for maximizing coverage benefits

Please format your response with:
- Clear headings and subheadings
- Important numbers in bold
- Bullet points for easy reading
- Simple, patient-friendly language
- Specific examples and comparisons
- Double spacing between sections

Focus on helping patients make informed decisions about insurance coverage, considering both cost and value.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    });

    return NextResponse.json({
      insights: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Insurance Insights Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insurance insights',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 