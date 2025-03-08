from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import SearchQuery
from .services import PineconeService
import os

app = FastAPI(title="Healthcare Procedures API")

# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://*.vercel.app").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Pinecone service
pinecone_service = PineconeService()

@app.post("/search")
async def search(search_query: SearchQuery):
    """
    Search for healthcare procedures based on the query.
    """
    try:
        results = await pinecone_service.search(search_query.query)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 