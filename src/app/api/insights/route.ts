import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: Request) {
  try {
    const { chartData, modelMetrics, procedureName } = await request.json();

    const prompt = `As a healthcare cost analyst, provide a clear and patient-friendly analysis of the following medical procedure cost data:

Procedure: ${procedureName}

Historical and Predicted Cost Data:
${JSON.stringify(chartData, null, 2)}

Model Performance Metrics:
${JSON.stringify(modelMetrics, null, 2)}

Please provide a comprehensive yet easy-to-understand analysis in the following format:

## 📈 Cost Trend Analysis

Analyze the historical cost trends, including:
- Overall direction of costs (increasing/decreasing/stable)
- Significant changes or patterns
- Year-over-year comparison
- Notable price points

## 🎯 Prediction Accuracy

Evaluate the model's performance:
- How accurate are the predictions?
- What is the confidence level?
- What factors might affect the predictions?
- How reliable is this forecast?

## 💡 Key Insights for Patients

Provide practical insights for patients:
- Best times to schedule the procedure
- Cost-saving opportunities
- Factors affecting cost variations
- Comparison with similar procedures

## 🔮 Future Outlook

Share predictions and recommendations:
- Expected cost trends in the next 6-12 months
- Potential factors that could impact costs
- Recommendations for timing the procedure
- Cost optimization strategies

Please format your response with:
- Clear headings and subheadings
- Bullet points for easy reading
- Important numbers in bold
- Double spacing between sections
- Simple, patient-friendly language
- Concrete examples and comparisons

Focus on providing actionable insights that help patients make informed decisions about their healthcare costs.`;

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
    console.error('AI Insights Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 