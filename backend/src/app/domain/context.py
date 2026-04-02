"""Visitor context model — parses referrer URLs into known types."""

from urllib.parse import urlparse

from pydantic import BaseModel, model_validator

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


class VisitorContext(BaseModel):
    """Visitor context derived from HTTP request signals."""

    referrer: str | None = None
    referrer_type: str = ""

    @model_validator(mode="after")
    def _set_referrer_type(self) -> "VisitorContext":
        self.referrer_type = _parse_referrer_type(self.referrer)
        return self
