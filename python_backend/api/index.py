from app.main import app
from mangum import Mangum

# Create ASGI handler
asgi_handler = Mangum(app, lifespan="off")

# Create handler for Vercel
def handler(event, context):
    return asgi_handler(event, context) 