import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
// import { supabase } from '@/lib/supabase';

// Since we're in a Node.js environment (API route), we should execute the SQL query directly
// instead of making an HTTP request to our own API
// async function executeSqlQuery(query: string, userQuery: string, maxRetries = 3) {
//   let retryCount = 0;
//   let currentQuery = query;

//   while (retryCount <= maxRetries) {
//     try {
//       console.log(`\n-------- SQL Query Execution (Attempt ${retryCount + 1}) --------`);
//       console.log('Executing query:', currentQuery);
      
//       // Parse the SQL query into Supabase query builder format
//       const queryParts = currentQuery.toLowerCase().replace(/;/g, '').trim().split(/\s+/);
//       const selectIndex = queryParts.indexOf('select');
//       const fromIndex = queryParts.indexOf('from');
      
//       if (selectIndex === -1 || fromIndex === -1) {
//         throw new Error('Invalid query format');
//       }

//       // Extract the base table and any aliases
//       const fromClause = queryParts.slice(fromIndex + 1).join(' ');
//       const baseTableMatch = fromClause.match(/^(\w+)(?:\s+as\s+(\w+))?/i);
      
//       if (!baseTableMatch) {
//         throw new Error('Could not determine base table');
//       }

//       const baseTable = baseTableMatch[1];
//       const tableAlias = baseTableMatch[2] || baseTable;

//       // Build the select statement based on the original query
//       const selectClause = queryParts.slice(selectIndex + 1, fromIndex).join(' ');
//       const selectFields = selectClause.split(',').map(field => field.trim());

//       // For COUNT queries, we need to handle them differently
//       if (selectFields[0].toLowerCase().includes('count')) {
//         // For unique organizations count
//         if (baseTable === 'organizations') {
//           const { data, error } = await supabase
//             .from('organizations')
//             .select('id', { count: 'exact', head: true });

//           if (error) {
//             console.error('SQL Error:', error.message);
//             throw new Error(error.message);
//           }

//           console.log('\nQuery Results:', data);
//           console.log('----------------------------------\n');

//           return [{ count: data }];
//         }
//         // For other COUNT queries
//         else {
//           const { data, error } = await supabase
//             .from(baseTable)
//             .select('id', { count: 'exact', head: true });

//           if (error) {
//             console.error('SQL Error:', error.message);
//             throw new Error(error.message);
//           }

//           console.log('\nQuery Results:', data);
//           console.log('----------------------------------\n');

//           return [{ count: data }];
//         }
//       }

//       // For regular queries, include relationships
//       const selectStatement = `
//         ${selectFields.join(', ')},
//         organizations (
//           name,
//           address,
//           city,
//           state,
//           zip
//         ),
//         payers (
//           name
//         )
//       `;

//       // Execute the query using Supabase
//       const { data, error } = await supabase
//         .from(baseTable)
//         .select(selectStatement)
//         .limit(100);

//       if (error) {
//         console.error('SQL Error:', error.message);
//         throw new Error(error.message);
//       }

//       console.log('\nQuery Results:');
//       console.table(data);
//       console.log('----------------------------------\n');

//       return data;
//     } catch (error) {
//       console.error(`SQL query execution error (Attempt ${retryCount + 1}):`, error);
      
//       if (retryCount >= maxRetries) {
//         throw error;
//       }

//       retryCount++;
      
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       const fixQueryPrompt = `You are a SQL expert. The following SQL query failed with this error:

// Error: ${errorMessage}

// Original query:
// ${currentQuery}

// User's original question:
// ${userQuery}

// Fix the SQL query to address the error. Return ONLY the fixed SQL query without any explanations.`;

//       try {
//         console.log('\n-------- Attempting query repair --------');
//         const fixResponse = await groq.chat.completions.create({
//           messages: [
//             { role: 'system', content: fixQueryPrompt },
//             { role: 'user', content: 'Please fix this query.' }
//           ],
//           model: 'llama3-8b-8192',
//           temperature: 0.1,
//           max_tokens: 500,
//         });

//         const fixedQuery = fixResponse.choices[0]?.message?.content?.trim() || '';
        
//         if (!fixedQuery.toLowerCase().startsWith('select')) {
//           console.error('LLM did not return a valid SQL query. Retrying with original query.');
//           continue;
//         }
        
//         console.log('Fixed query:', fixedQuery);
//         currentQuery = sanitizeSqlQuery(fixedQuery);
//         console.log('----------------------------------\n');
//       } catch (llmError) {
//         console.error('Error getting fixed query from LLM:', llmError);
//       }
//     }
//   }
  
//   throw new Error('Failed to execute SQL query after maximum retries');
// }

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

const QUERY_CLASSIFIER_PROMPT = `You are a query classifier. Your task is to determine if the user's question falls into one of these categories:
1. MEDICAL - Questions about medical health issues, procedures, or treatments.
2. SQL - Questions asking for data analysis, statistics, or numerical information from the database
3. GENERAL - General questions that don't require database lookup or pricing information.

Respond with exactly one of: "MEDICAL", "SQL", or "GENERAL"

Example SQL queries:
- What is the average cost of procedures?
- How many hospitals are in each state?
- What are the top 5 most expensive procedures?
- Which insurance provider covers the most procedures?`;

// Update the SQL_GENERATION_PROMPT
const SQL_GENERATION_PROMPT = `You are a SQL query generator for a healthcare pricing database. The schema is:

procedures:
- code: varchar (procedure code)
- description: text
- encounter: text (foreign key that references encounters.id)

encounters:
- id: text (primary key)
- organization: text (foreign key to organizations.id)
- payer: text (foreign key to payers.id)
- base_encounter_cost: numeric
- total_claim_cost: numeric
- payer_coverage: numeric

organizations:
- id: text
- name: text
- address: text
- city: text
- state: text
- zip: text
- phone: text

payers:
- id: text
- name: text

IMPORTANT INSTRUCTIONS:
1. Generate a SQL query that uses Supabase's query builder syntax
2. Return ONLY the query without any explanations
3. Do NOT include semicolons
4. ALWAYS join with reference tables to get human-readable names
5. For payer information, join with payers table
6. For organization information, join with organizations table
7. Start with SELECT and nothing else

Example valid response:
SELECT encounters.base_encounter_cost, organizations.name as hospital_name, payers.name as insurance_name
FROM encounters
JOIN organizations ON encounters.organization = organizations.id
JOIN payers ON encounters.payer = payers.id
WHERE encounters.base_encounter_cost > 1000
ORDER BY encounters.base_encounter_cost DESC
LIMIT 10

For questions we can't answer:
DATA_NOT_AVAILABLE

Remember: Return ONLY the query or DATA_NOT_AVAILABLE. No other text is allowed.`;

// Helper function to sanitize SQL query
function sanitizeSqlQuery(query: string): string {
  // Remove any trailing semicolons
  return query.replace(/;+$/, '').trim();
}

// Update the validateSqlResponse function
function validateSqlResponse(response: string): { isValid: boolean; query?: string } {
  // Remove any whitespace and convert to lowercase for checking
  const cleanResponse = response.trim().toLowerCase();
  
  // If it's a data not available response
  if (cleanResponse === 'data_not_available') {
    return { isValid: true };
  }
  
  // Check if it starts with select and contains basic SQL keywords
  if (cleanResponse.startsWith('select') && 
      (cleanResponse.includes('from') || cleanResponse.includes('join'))) {
    return { isValid: true, query: response.trim() };
  }
  
  return { isValid: false };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json() as ChatRequest;
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // First, classify the query type
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
    console.log(`Query classification: ${classification}`);

    let aiResponse;
    let searchResults: SearchResult[] = [];

    if (classification === 'MEDICAL') {
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
            { 
              role: 'user', 
              content: `Query: ${userQuery}\n\nTop 5 most relevant procedures found:\n${searchContext}\n\nPlease analyze these procedures and provide insights relevant to the user's query. Ignore any procedures that don't seem relevant. Do not number or enumerate the procedures in your response - just refer to them directly.` 
            }
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
    } else if (classification === 'SQL') {
      // Generate SQL query with minimal context (just the last question)
      const sqlGenResponse = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SQL_GENERATION_PROMPT },
          { role: 'user', content: userQuery }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 500,
      });

      const rawSqlQuery = sqlGenResponse.choices[0]?.message?.content?.trim() || '';
      console.log('Generated SQL Query:', rawSqlQuery);
      
      const validationResult = validateSqlResponse(rawSqlQuery);
      
      if (!validationResult.isValid) {
        console.error('Invalid SQL query:', rawSqlQuery);
        aiResponse = "I apologize, but I couldn't generate a valid SQL query for your question. Please try rephrasing your question.";
      } else if (!validationResult.query) {
        aiResponse = "I apologize, but I don't have access to the data needed to answer your question. The information you're looking for is not available in our database.";
      } else {
        const sqlQuery = sanitizeSqlQuery(validationResult.query);
        console.log('\n-------- Generated SQL Query --------');
        console.log(sqlQuery);
        console.log('----------------------------------\n');

        // Return just the SQL query without any extra text
        aiResponse = `Generated SQL Query:
${sqlQuery}`;
      }
    } else {
      // For non-medical queries, respond with limited conversation history
      console.log('Handling general query without search:', userQuery);
      
      const generalCompletion = await groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful assistant. You can answer general questions, but for medical procedure pricing in California hospitals, you'll need specific information which isn't available for this type of query.` 
          },
          { 
            role: 'user', 
            content: userQuery 
          }
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