from pydantic import BaseModel

class SearchQuery(BaseModel):
    query: str

class SearchResult(BaseModel):
    id: str
    score: float
    text: str 