import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.websocket import ws_router

app = FastAPI(title="Meridian Risk Intelligence")

allowed_origin = os.getenv("ALLOWED_ORIGIN", "*")
origins = [
    allowed_origin,
    "https://ai-project-risk-intelligence-system.vercel.app",
    "https://meridian-risk.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if allowed_origin != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(ws_router)
