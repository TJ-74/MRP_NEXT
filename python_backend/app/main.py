from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import SearchQuery
from .services import PineconeService

app = FastAPI(title="Healthcare Procedures API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow your Next.js development server
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