from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, questionnaire, analysis, privacy

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Career-Advice App for Flight Crew — UAE MVP",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(questionnaire.router)
app.include_router(analysis.router)
app.include_router(privacy.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
