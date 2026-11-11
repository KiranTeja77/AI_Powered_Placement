"""HTTP layer. Internal only: the Spring Boot API calls this service, browsers never do.

Privacy: resume text is never logged. Pydantic's default 422 body repeats the offending input, so
validation errors are rewritten to carry only the field and the rule that failed.
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.data import load_data
from app.pipeline.analyze import analyze, compare_skills
from app.pipeline.compare import UnknownRoleError
from app.pipeline.revise import InvalidEditsError, revise
from app.pipeline.skills import default_matcher
from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompareRequest,
    CompareResponse,
    ReviseRequest,
    ReviseResponse,
)

log = logging.getLogger("ai-service")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    load_data()  # refuse to start with a broken taxonomy or role file
    default_matcher()  # build the matcher now rather than on the first request
    yield


app = FastAPI(title="PlaceWise AI service", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Deliberately drops "input" and "ctx": they can contain the resume text.
    detail = [
        {"loc": list(e["loc"]), "msg": str(e["msg"]), "type": str(e["type"])} for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(UnknownRoleError)
async def unknown_role(_: Request, exc: UnknownRoleError) -> JSONResponse:
    detail = [{"loc": ["body", "target_roles"], "msg": str(exc), "type": "unknown_role"}]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(InvalidEditsError)
async def invalid_edits(_: Request, exc: InvalidEditsError) -> JSONResponse:
    # Skill ids only: they are taxonomy ids, never resume text.
    detail = [
        {
            "loc": ["body", field],
            "msg": f"Not valid for this analysis: {', '.join(ids)}",
            "type": "invalid_edit",
        }
        for field, ids in exc.errors.items()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(Exception)
async def unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    log.error("request failed: %s", type(exc).__name__)  # the type only, never the message
    return JSONResponse(status_code=500, content={"detail": "The analysis could not be completed."})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze_resume(request: AnalyzeRequest) -> AnalyzeResponse:
    return analyze(request.text, request.target_roles)


@app.post("/compare")
def compare(request: CompareRequest) -> CompareResponse:
    return compare_skills(request.skills, request.target_roles)


@app.post("/revise")
def revise_analysis(request: ReviseRequest) -> ReviseResponse:
    """Re-read the text and apply the student's edits; scores and suggestions are rebuilt."""
    return revise(
        request.text,
        request.target_roles,
        request.confirmed_skill_ids,
        request.removed_skill_ids,
        request.added_skill_ids,
    )
