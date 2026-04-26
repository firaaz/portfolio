"""Visitor context model — parses referrer URLs into known types."""

from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, model_validator

_REFERRER_MAP: dict[str, str] = {
    "linkedin.com": "linkedin",
    "www.linkedin.com": "linkedin",
    "github.com": "github",
    "www.github.com": "github",
}


def _parse_referrer_type(referrer: str | None) -> str:
    """Map a referrer URL to a known type, defaulting to 'direct'."""
    if not referrer:
        return "direct"
    try:
        hostname = urlparse(referrer).hostname or ""
    except ValueError:
        return "direct"
    return _REFERRER_MAP.get(hostname, "direct")


class Viewport(BaseModel):
    """First-paint viewport snapshot — sent once per session."""

    width: int = Field(ge=0)
    height: int = Field(ge=0)
    pointer_type: Literal["mouse", "touch", "pen", "unknown"] = "unknown"
    prefers_reduced_motion: bool = False


class UserAgentSummary(BaseModel):
    """Aggregated UA — family + platform only. No fingerprintable detail."""

    family: str
    platform: str


class VisitorContext(BaseModel):
    """Visitor context derived from HTTP request signals."""

    referrer: str | None = None
    referrer_type: str = ""
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    command: str | None = None
    viewport: Viewport | None = None
    landing_path: str | None = None
    user_agent_summary: UserAgentSummary | None = None

    @model_validator(mode="after")
    def _set_referrer_type(self) -> "VisitorContext":
        """Derive referrer_type from raw referrer URL."""
        self.referrer_type = _parse_referrer_type(self.referrer)
        return self
