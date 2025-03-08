from pinecone import Pinecone
import os
from dotenv import load_dotenv
from typing import List
from .models import SearchResult

class PineconeService:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
        self.index = self.pc.Index("procedures-index")

    async def search(self, query: str) -> List[SearchResult]:
        """
        Search for procedures in Pinecone index.
        """
        results = self.index.search(
            namespace="unique_descriptions",
            query={
                "top_k": 10,
                "inputs": {
                    'text': query
                }
            },
            rerank={
                "model": "bge-reranker-v2-m3",
                "top_n": 10,
                "rank_fields": ["chunk_text"]
            }   
        )
        
        
        
        # Format results
        formatted_results = [
            SearchResult(
                id=hit["_id"],
                score=round(hit["_score"], 2),
                text=hit["fields"]["chunk_text"]
            )
            for hit in results["result"]["hits"]
        ]
        
        return formatted_results 