from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from http.client import HTTPException as ClientHTTPException
from mangum import Mangum

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index = pc.Index("procedures-index")

class SearchQuery(BaseModel):
    query: str
    
@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/api/search")
async def search(search_query: SearchQuery):
    """
    Search for healthcare procedures based on the query.
    """
    try:
        results = index.search(
            namespace="unique_descriptions",
            query={
                "top_k": 10,
                "inputs": {
                    'text': search_query.query
                }
            }
        )
        
        # Format results
        formatted_results = [
            {
                "id": hit["_id"],
                "score": round(hit["_score"], 2),
                "text": hit["fields"]["chunk_text"]
            }
            for hit in results["result"]["hits"]
        ]
        
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create handler for AWS Lambda / Vercel
handler = Mangum(app) 