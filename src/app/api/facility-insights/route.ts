import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: Request) {
  try {
    const { facilityData, procedureName } = await request.json();

    const prompt = `As a healthcare cost advisor, analyze the following cost data for different facilities and provide patient-friendly recommendations:

Procedure: ${procedureName}

Facility Cost Data:
${JSON.stringify(facilityData, null, 2)}

Please provide a comprehensive analysis in the following format:

## 💰 Cost Comparison Summary

Compare the facilities based on:
- Base costs and total costs
- Cost variations between facilities
- Value for money analysis
- Potential savings opportunities

## 🏥 Facility Rankings

Provide a ranked analysis of each facility:
- Best overall value
- Lowest base cost
- Most cost-effective when including additional costs
- Special considerations for each facility

## 💡 Patient Recommendations

Offer clear guidance for patients:
- Which facility offers the best overall value
- Potential savings from choosing different facilities
- Important factors to consider beyond cost
- Questions to ask when contacting facilities

## ✅ Action Steps

Provide specific next steps:
- Top 3 recommended facilities with reasoning
- Estimated potential savings
- Key questions to ask each facility
- Factors to consider when making the final decision

Please format your response with:
- Clear headings and subheadings
- Important numbers in bold
- Bullet points for easy reading
- Simple, patient-friendly language
- Specific examples and comparisons
- Double spacing between sections

Focus on helping patients make an informed decision about which facility to choose, considering both cost and value.`;

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
    console.error('Facility Insights Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate facility insights',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 