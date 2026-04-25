"""Persona protocol domain types — PROTOCOL-001 (see ADR-0010)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SignalRef(BaseModel):
    """Reference to a signal, observation, or item by id."""

    kind: Literal["signal", "observation", "item"]
    id: str


class Observation(BaseModel):
    """One agent observation about the visitor along an open-vocabulary dimension."""

    dimension: str
    value: str
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    source_signals: list[SignalRef] = Field(min_length=1)
    ts: datetime


class Persona(BaseModel):
    """Agent's cumulative read of the visitor — append-only multi-valued."""

    rationale: str
    observations: list[Observation] = Field(default_factory=list)
    trust: float = Field(ge=0.0, le=1.0)
