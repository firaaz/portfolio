# Agent Content Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-tier progressive intelligence pipeline (Select → Adapt → Compose) that makes the portfolio agent generate, connect, and personalize content — not just rerank it.

**Architecture:** Strategy-driven evaluation via PydanticAI. One `LLMPort.evaluate(strategy, profile, catalog)` method, three pluggable strategies (`SelectStrategy`, `AdaptStrategy`, `ComposeStrategy`). Behavioral signals flow from frontend → backend via POST, agent adapts via existing SSE stream. Five-verb AG-UI events (ADR-0003) with staggered dispatch.

**Tech Stack:** Python 3.13, FastAPI, PydanticAI, Pydantic 2.11, Zustand, React 19, Vite, vitest, pytest, DeepEval.

**Spec:** `specs/002-agent-intelligence/spec.md`

---

## File Map

### New files (backend)

| File | Responsibility |
|------|---------------|
| `backend/src/app/domain/intelligence.py` | `IntelligenceResult`, `ItemResult`, `BridgeAnnotation` result models |
| `backend/src/app/domain/session.py` | `BehavioralSignal`, `SignalBatch`, `VisitorProfile` models |
| `backend/src/app/domain/strategy.py` | `EvaluationStrategy` protocol, `ModelConfig`, `ValidationResult` |
| `backend/src/app/domain/strategies/__init__.py` | Package init |
| `backend/src/app/domain/strategies/select.py` | `SelectStrategy` — referrer-based scoring + emphasis |
| `backend/src/app/domain/strategies/adapt.py` | `AdaptStrategy` — behavioral re-scoring + generation |
| `backend/src/app/domain/strategies/compose.py` | `ComposeStrategy` — command bar synthesis |
| `backend/src/app/ports/session.py` | `SessionPort` protocol |
| `backend/src/app/adapters/session/memory_session.py` | In-memory session store with TTL |
| `backend/src/app/adapters/llm/pydantic_ai_provider.py` | PydanticAI adapter implementing new LLMPort |
| `backend/src/app/adapters/api/signal_route.py` | POST `/api/agent/signal` endpoint |
| `backend/src/app/adapters/api/dispatch.py` | Staggered dispatch utility (400-800ms gaps) |
| `backend/src/app/domain/validation.py` | Post-generation catalog validation |

### New files (frontend)

| File | Responsibility |
|------|---------------|
| `frontend/src/hooks/use-signal-collector.ts` | Batches dwell/click/skip signals, POSTs every 3-5s |

### Modified files

| File | Changes |
|------|---------|
| `backend/pyproject.toml` | Add `pydantic-ai` dependency |
| `backend/src/app/domain/ux.py` | Add `emphasis`, `generated` to `UXItem` |
| `backend/src/app/ports/llm.py` | Add `evaluate()` method to `LLMPort` |
| `backend/src/app/adapters/api/ux_events.py` | Five-verb event formatters (`ux:focus`, `ux:recede`, `ux:bridge`, `ux:surface`, `ux:signal`) |
| `backend/src/app/adapters/api/stream_route.py` | Session creation, tiered evaluation |
| `backend/src/app/adapters/api/command_route.py` | Use `ComposeStrategy` |
| `backend/src/app/main.py` | Register signal route |
| `frontend/src/store/ux-store.ts` | Add `emphasis`, `generated`, `bridges` to state |
| `frontend/src/hooks/ux-parsers.ts` | Five-verb event type guards |
| `frontend/src/hooks/use-agent-stream.ts` | Handle five-verb events |
| `frontend/src/molecules/ProjectCard.tsx` | Render emphasis/generated content |
| `frontend/src/molecules/ExperienceCard.tsx` | Render emphasis/generated content |
| `frontend/src/canvas/Canvas.tsx` | Wire signal collector, render bridges |

---

## Task 0: Spike — PydanticAI Validation

**Branch:** `feat/002-spike-pydantic-ai`

**Goal:** Validate PydanticAI structured outputs work for our use case before committing. Go/no-go decision.

**Files:**
- Create: `backend/spike/test_pydantic_ai.py`
- Modify: `backend/pyproject.toml`

- [ ] **Step 0.1: Add PydanticAI dependency**

```bash
cd backend && uv add pydantic-ai
```

Verify it installs cleanly:
```bash
uv run python -c "import pydantic_ai; print(pydantic_ai.__version__)"
```

- [ ] **Step 0.2: Write spike script testing structured output**

Create `backend/spike/test_pydantic_ai.py`:

```python
"""Spike: Validate PydanticAI structured outputs for portfolio intelligence."""

import asyncio
import os
import time

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from app.adapters.content.yaml_loader import load_catalog


class ItemScore(BaseModel):
    """One item's importance score + emphasis directives."""

    id: str
    importance: float = Field(ge=0.0, le=1.0)
    emphasis: list[str] = Field(default_factory=list)


class SelectResult(BaseModel):
    """Structured output for Select strategy."""

    items: list[ItemScore]


# --- Test 1: Schema compliance ---

async def test_schema_compliance() -> None:
    """Does PydanticAI return valid structured output?"""
    catalog = load_catalog()
    catalog_desc = "\n".join(
        f"- {item.id} ({item.molecule}): {item.data.get('title') or item.data.get('name')}"
        for item in catalog
    )

    agent = Agent(
        os.environ.get("LLM_MODEL", "openai:gpt-4o-mini"),
        result_type=SelectResult,
        system_prompt=(
            "You are a portfolio layout agent. Score each catalog item's importance "
            "(0.0-1.0) for a LinkedIn recruiter visitor. Include emphasis: a list of "
            "data field names to highlight (e.g., ['description', 'tech'] for projects). "
            "ALL catalog item IDs must appear."
        ),
    )

    result = await agent.run(f"Visitor: LinkedIn recruiter\n\nCatalog:\n{catalog_desc}")
    output = result.output

    assert isinstance(output, SelectResult), f"Expected SelectResult, got {type(output)}"
    assert len(output.items) == len(catalog), (
        f"Expected {len(catalog)} items, got {len(output.items)}"
    )
    returned_ids = {item.id for item in output.items}
    expected_ids = {item.id for item in catalog}
    assert returned_ids == expected_ids, f"ID mismatch: {returned_ids ^ expected_ids}"
    print(f"  PASS: Schema compliance ({len(output.items)} items)")
    return output


# --- Test 2: Latency ---

async def test_latency(runs: int = 3) -> None:
    """Measure p50/p95 latency for structured output."""
    catalog = load_catalog()
    catalog_desc = "\n".join(
        f"- {item.id} ({item.molecule})" for item in catalog
    )

    agent = Agent(
        os.environ.get("LLM_MODEL", "openai:gpt-4o-mini"),
        result_type=SelectResult,
        system_prompt="Score each item 0.0-1.0 for a LinkedIn recruiter. ALL IDs must appear.",
    )

    latencies: list[float] = []
    for i in range(runs):
        start = time.monotonic()
        await agent.run(f"Visitor: LinkedIn\n\nCatalog:\n{catalog_desc}")
        elapsed = (time.monotonic() - start) * 1000
        latencies.append(elapsed)
        print(f"  Run {i + 1}: {elapsed:.0f}ms")

    latencies.sort()
    p50 = latencies[len(latencies) // 2]
    p95 = latencies[int(len(latencies) * 0.95)]
    print(f"  RESULT: p50={p50:.0f}ms, p95={p95:.0f}ms")


# --- Test 3: Grounding ---

async def test_grounding() -> None:
    """Does the LLM stay in catalog bounds?"""

    class GenerateResult(BaseModel):
        items: list[ItemScore]
        generated_description: str = Field(
            description="Rewrite the Salama AI project description for a recruiter"
        )

    catalog = load_catalog()
    salama = next(i for i in catalog if i.id == "project-salama")
    catalog_desc = "\n".join(f"- {i.id} ({i.molecule})" for i in catalog)

    agent = Agent(
        os.environ.get("LLM_MODEL", "openai:gpt-4o-mini"),
        result_type=GenerateResult,
        system_prompt=(
            "Score items AND rewrite the Salama project description for a recruiter. "
            "You may ONLY use facts from the catalog. Do not invent metrics or technologies. "
            f"Salama facts: {salama.data}"
        ),
    )

    result = await agent.run(f"Visitor: LinkedIn recruiter\n\nCatalog:\n{catalog_desc}")
    output = result.output
    desc = output.generated_description.lower()

    # Check for known facts
    known_techs = [t.lower() for t in salama.data.get("tech", [])]
    found = [t for t in known_techs if t in desc]
    print(f"  Grounded techs in output: {found}/{len(known_techs)}")
    print(f"  Generated: {output.generated_description[:200]}...")
    print(f"  PASS: Grounding check (manual review above)")


async def main() -> None:
    print("\n=== SPIKE: PydanticAI Structured Outputs ===\n")

    print("1. Schema compliance:")
    await test_schema_compliance()

    print("\n2. Latency (3 runs):")
    await test_latency()

    print("\n3. Grounding:")
    await test_grounding()

    print("\n=== SPIKE COMPLETE — review results above ===")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 0.3: Run the spike**

```bash
cd backend && uv run python -m spike.test_pydantic_ai
```

Expected: All three tests produce output. Review:
- Schema compliance: all 13 item IDs present, valid scores
- Latency: p50 < 2000ms for scoring (acceptable for first load)
- Grounding: generated description uses real catalog facts

- [ ] **Step 0.4: Document results and decide go/no-go**

If PydanticAI works: proceed with plan. Delete spike directory.
If PydanticAI fails: fall back to raw OpenAI calls with Pydantic `model_validate()` post-hoc. Adjust adapter code in subsequent tasks accordingly.

- [ ] **Step 0.5: Commit spike results**

```bash
git add -A && git commit -m "spike(agent): validate PydanticAI structured outputs — go/no-go"
```

---

## Task 1: Domain Models — Intelligence Result + Session

**Branch:** `feat/002-intelligence-models`

**Goal:** Define the core domain models for the intelligence pipeline: results, signals, sessions, strategies.

**Files:**
- Create: `backend/src/app/domain/intelligence.py`
- Create: `backend/src/app/domain/session.py`
- Create: `backend/src/app/domain/strategy.py`
- Create: `backend/src/app/domain/validation.py`
- Test: `backend/tests/test_intelligence_models.py`
- Test: `backend/tests/test_session_models.py`
- Test: `backend/tests/test_validation.py`

### Task 1a: IntelligenceResult models

- [ ] **Step 1a.1: Write failing tests for IntelligenceResult**

Create `backend/tests/test_intelligence_models.py`:

```python
"""Tests for intelligence result domain models."""

import pytest
from pydantic import ValidationError


class TestItemResult:
    def test_valid_item(self):
        from app.domain.intelligence import ItemResult

        item = ItemResult(id="hero", importance=0.95, emphasis=["name", "title"])
        assert item.id == "hero"
        assert item.importance == 0.95
        assert item.emphasis == ["name", "title"]

    def test_importance_bounds(self):
        from app.domain.intelligence import ItemResult

        with pytest.raises(ValidationError):
            ItemResult(id="x", importance=1.5)
        with pytest.raises(ValidationError):
            ItemResult(id="x", importance=-0.1)

    def test_optional_fields_default_none(self):
        from app.domain.intelligence import ItemResult

        item = ItemResult(id="hero", importance=0.9)
        assert item.emphasis is None
        assert item.generated is None


class TestBridgeAnnotation:
    def test_valid_bridge(self):
        from app.domain.intelligence import BridgeAnnotation

        bridge = BridgeAnnotation(
            source_id="project-salama",
            target_id="experience-current",
            text="Your interest in architecture connects to this role.",
            grounding=["LangGraph", "event-driven"],
        )
        assert bridge.source_id == "project-salama"
        assert len(bridge.grounding) == 2

    def test_grounding_required(self):
        from app.domain.intelligence import BridgeAnnotation

        bridge = BridgeAnnotation(
            source_id="a", target_id="b", text="t", grounding=[]
        )
        assert bridge.grounding == []


class TestIntelligenceResult:
    def test_valid_result(self):
        from app.domain.intelligence import IntelligenceResult, ItemResult

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.95)]
        )
        assert len(result.items) == 1
        assert result.bridges is None

    def test_requires_items(self):
        from app.domain.intelligence import IntelligenceResult

        with pytest.raises(ValidationError):
            IntelligenceResult(items=[])
```

- [ ] **Step 1a.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_intelligence_models.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.intelligence'`

- [ ] **Step 1a.3: Implement IntelligenceResult models**

Create `backend/src/app/domain/intelligence.py`:

```python
"""Intelligence result models — unified output for all evaluation strategies."""

from typing import Any

from pydantic import BaseModel, Field


class ItemResult(BaseModel):
    """One item's evaluation: importance + optional emphasis and generated content."""

    id: str
    importance: float = Field(ge=0.0, le=1.0)
    emphasis: list[str] | None = None
    generated: dict[str, str] | None = None


class BridgeAnnotation(BaseModel):
    """A connection between two content items, grounded in catalog facts."""

    source_id: str
    target_id: str
    text: str
    grounding: list[str]


class IntelligenceResult(BaseModel):
    """Unified result from any evaluation strategy."""

    items: list[ItemResult] = Field(min_length=1)
    bridges: list[BridgeAnnotation] | None = None
```

- [ ] **Step 1a.4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_intelligence_models.py -v
```
Expected: all PASS

- [ ] **Step 1a.5: Commit**

```bash
git add backend/src/app/domain/intelligence.py backend/tests/test_intelligence_models.py
git commit -m "feat(domain): add IntelligenceResult, ItemResult, BridgeAnnotation models"
```

### Task 1b: Session and signal models

- [ ] **Step 1b.1: Write failing tests for session models**

Create `backend/tests/test_session_models.py`:

```python
"""Tests for behavioral signal and visitor profile models."""

import pytest
from pydantic import ValidationError


class TestBehavioralSignal:
    def test_valid_dwell(self):
        from app.domain.session import BehavioralSignal

        sig = BehavioralSignal(type="dwell", zone="skills", duration_ms=3200, timestamp=1000.0)
        assert sig.type == "dwell"
        assert sig.zone == "skills"

    def test_valid_types(self):
        from app.domain.session import BehavioralSignal

        for t in ("dwell", "skip", "click", "hover"):
            sig = BehavioralSignal(type=t, zone="featured", duration_ms=100, timestamp=0.0)
            assert sig.type == t

    def test_invalid_type_rejected(self):
        from app.domain.session import BehavioralSignal

        with pytest.raises(ValidationError):
            BehavioralSignal(type="scroll", zone="x", duration_ms=0, timestamp=0.0)


class TestSignalBatch:
    def test_valid_batch(self):
        from app.domain.session import BehavioralSignal, SignalBatch

        batch = SignalBatch(
            session_id="abc-123",
            signals=[BehavioralSignal(type="dwell", zone="skills", duration_ms=2000, timestamp=0.0)],
        )
        assert batch.session_id == "abc-123"
        assert len(batch.signals) == 1


class TestVisitorProfile:
    def test_default_tier_is_one(self):
        from app.domain.context import VisitorContext
        from app.domain.session import VisitorProfile

        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(referrer="https://linkedin.com/in/test"),
        )
        assert profile.tier == 1
        assert profile.confidence == 0.0
        assert profile.dwell_map == {}
        assert profile.interests == []

    def test_accumulate_signal(self):
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(),
        )
        sig = BehavioralSignal(type="dwell", zone="skills", duration_ms=3000, timestamp=1.0)
        profile.accumulate(sig)
        assert profile.dwell_map["skills"] == 3.0
        assert len(profile.signals) == 1

    def test_confidence_grows_with_signals(self):
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        for i in range(5):
            sig = BehavioralSignal(type="dwell", zone="skills", duration_ms=2000, timestamp=float(i))
            profile.accumulate(sig)
        assert profile.confidence > 0.0
        assert profile.confidence <= 1.0

    def test_tier_escalates_with_confidence(self):
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        # Fewer than 3 signals: tier stays at 1
        for i in range(2):
            profile.accumulate(
                BehavioralSignal(type="dwell", zone="featured", duration_ms=5000, timestamp=float(i))
            )
        assert profile.tier == 1
        # 3+ signals: tier escalates to 2
        profile.accumulate(
            BehavioralSignal(type="dwell", zone="featured", duration_ms=5000, timestamp=3.0)
        )
        assert profile.tier >= 2
```

- [ ] **Step 1b.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_session_models.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.session'`

- [ ] **Step 1b.3: Implement session models**

Create `backend/src/app/domain/session.py`:

```python
"""Behavioral signal and visitor profile models — session-lived state."""

from typing import Literal

from pydantic import BaseModel, Field

from app.domain.context import VisitorContext

_TIER2_MIN_SIGNALS = 3
_TIER3_CONFIDENCE = 0.7
_CONFIDENCE_PER_SIGNAL = 0.12  # ~6 signals to reach 0.7


class BehavioralSignal(BaseModel):
    """A single behavioral event from the frontend."""

    type: Literal["dwell", "skip", "click", "hover"]
    zone: str
    duration_ms: int = Field(ge=0)
    timestamp: float


class SignalBatch(BaseModel):
    """A batch of signals sent from the frontend."""

    session_id: str
    signals: list[BehavioralSignal]


class VisitorProfile(BaseModel):
    """Accumulated visitor state within a session."""

    session_id: str
    context: VisitorContext
    signals: list[BehavioralSignal] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    tier: int = Field(default=1, ge=1, le=3)
    dwell_map: dict[str, float] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)

    def accumulate(self, signal: BehavioralSignal) -> None:
        """Add a signal and update derived state."""
        self.signals.append(signal)

        if signal.type == "dwell":
            seconds = signal.duration_ms / 1000.0
            self.dwell_map[signal.zone] = self.dwell_map.get(signal.zone, 0.0) + seconds

        self.confidence = min(1.0, len(self.signals) * _CONFIDENCE_PER_SIGNAL)
        self._update_tier()
        self._infer_interests()

    def _update_tier(self) -> None:
        """Escalate tier based on signal count and confidence."""
        if len(self.signals) >= _TIER2_MIN_SIGNALS:
            self.tier = max(self.tier, 2)
        if self.confidence >= _TIER3_CONFIDENCE:
            self.tier = 3

    def _infer_interests(self) -> None:
        """Derive interest tags from top-dwelled zones."""
        zone_interest_map = {
            "featured": "architecture",
            "other-work": "projects",
            "skills": "technical-depth",
            "experience": "leadership",
            "contact": "hiring",
        }
        sorted_zones = sorted(self.dwell_map, key=self.dwell_map.get, reverse=True)  # type: ignore[arg-type]
        self.interests = [
            zone_interest_map[z] for z in sorted_zones[:3] if z in zone_interest_map
        ]
```

- [ ] **Step 1b.4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_session_models.py -v
```
Expected: all PASS

- [ ] **Step 1b.5: Commit**

```bash
git add backend/src/app/domain/session.py backend/tests/test_session_models.py
git commit -m "feat(domain): add BehavioralSignal, SignalBatch, VisitorProfile models"
```

### Task 1c: EvaluationStrategy protocol + validation

- [ ] **Step 1c.1: Write failing tests for validation**

Create `backend/tests/test_validation.py`:

```python
"""Tests for post-generation catalog validation."""

import pytest


class TestValidateIntelligenceResult:
    def test_valid_result_passes(self):
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        catalog_ids = {"hero", "contact", "project-salama"}
        result = IntelligenceResult(
            items=[
                ItemResult(id="hero", importance=0.95),
                ItemResult(id="contact", importance=0.8),
                ItemResult(id="project-salama", importance=0.7, emphasis=["title", "description"]),
            ]
        )
        errors = validate_result(result, catalog_ids, item_fields={"project-salama": {"title", "description", "tech"}})
        assert errors == []

    def test_unknown_item_id_flagged(self):
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="nonexistent", importance=0.5)]
        )
        errors = validate_result(result, {"hero"}, item_fields={})
        assert any("nonexistent" in e for e in errors)

    def test_invalid_emphasis_field_flagged(self):
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9, emphasis=["nonexistent_field"])]
        )
        errors = validate_result(
            result, {"hero"}, item_fields={"hero": {"name", "title", "subtitle", "summary"}}
        )
        assert any("nonexistent_field" in e for e in errors)

    def test_invalid_bridge_target_flagged(self):
        from app.domain.intelligence import BridgeAnnotation, IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9)],
            bridges=[
                BridgeAnnotation(
                    source_id="hero", target_id="fake", text="t", grounding=["x"]
                )
            ],
        )
        errors = validate_result(result, {"hero"}, item_fields={})
        assert any("fake" in e for e in errors)
```

- [ ] **Step 1c.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_validation.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.validation'`

- [ ] **Step 1c.3: Implement validation + strategy protocol**

Create `backend/src/app/domain/strategy.py`:

```python
"""Evaluation strategy protocol — pluggable intelligence strategies."""

from typing import Protocol

from pydantic import BaseModel, Field

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile


class ModelConfig(BaseModel):
    """LLM configuration per strategy."""

    model: str = "openai:gpt-4o-mini"
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1024, ge=1)


class EvaluationStrategy(Protocol):
    """Protocol for pluggable intelligence strategies."""

    name: str

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str: ...

    def result_schema(self) -> type[BaseModel]: ...

    def model_config(self) -> ModelConfig: ...
```

Create `backend/src/app/domain/validation.py`:

```python
"""Post-generation catalog validation — ensures LLM output is grounded."""

from app.domain.intelligence import IntelligenceResult


def validate_result(
    result: IntelligenceResult,
    catalog_ids: set[str],
    item_fields: dict[str, set[str]],
) -> list[str]:
    """Validate an IntelligenceResult against the catalog. Returns error strings."""
    errors: list[str] = []

    for item in result.items:
        if item.id not in catalog_ids:
            errors.append(f"Unknown item ID: {item.id}")
        if item.emphasis:
            valid_fields = item_fields.get(item.id, set())
            for field in item.emphasis:
                if valid_fields and field not in valid_fields:
                    errors.append(f"Invalid emphasis field '{field}' for {item.id}")

    if result.bridges:
        for bridge in result.bridges:
            if bridge.source_id not in catalog_ids:
                errors.append(f"Bridge source unknown: {bridge.source_id}")
            if bridge.target_id not in catalog_ids:
                errors.append(f"Bridge target unknown: {bridge.target_id}")

    return errors
```

- [ ] **Step 1c.4: Run tests**

```bash
cd backend && uv run pytest tests/test_validation.py -v
```
Expected: all PASS

- [ ] **Step 1c.5: Commit**

```bash
git add backend/src/app/domain/strategy.py backend/src/app/domain/validation.py backend/tests/test_validation.py
git commit -m "feat(domain): add EvaluationStrategy protocol and post-generation validation"
```

---

## Task 2: Session Port + Signal Route

**Branch:** `feat/002-session-signals`

**Goal:** Session storage and the behavioral signal ingestion endpoint.

**Files:**
- Create: `backend/src/app/ports/session.py`
- Create: `backend/src/app/adapters/session/memory_session.py`
- Create: `backend/src/app/adapters/api/signal_route.py`
- Modify: `backend/src/app/main.py`
- Test: `backend/tests/test_memory_session.py`
- Test: `backend/tests/test_signal_route.py`

### Task 2a: SessionPort + InMemorySession

- [ ] **Step 2a.1: Write failing tests**

Create `backend/tests/test_memory_session.py`:

```python
"""Tests for in-memory session store."""

import time

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


class TestInMemorySession:
    def test_get_missing_returns_none(self):
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        assert store.get("nonexistent") is None

    def test_upsert_and_get(self):
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        assert store.get("s1") is not None
        assert store.get("s1").session_id == "s1"

    def test_expired_entry_returns_none(self):
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=0)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        time.sleep(0.01)
        assert store.get("s1") is None

    def test_delete(self):
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        store.delete("s1")
        assert store.get("s1") is None

    def test_capacity_evicts_oldest(self):
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60, capacity=2)
        for i in range(3):
            store.upsert(VisitorProfile(session_id=f"s{i}", context=VisitorContext()))
        assert store.get("s0") is None  # evicted
        assert store.get("s2") is not None
```

- [ ] **Step 2a.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_memory_session.py -v
```
Expected: FAIL

- [ ] **Step 2a.3: Implement SessionPort + InMemorySession**

Create `backend/src/app/ports/session.py`:

```python
"""Session port — protocol for visitor session storage."""

from typing import Protocol

from app.domain.session import VisitorProfile


class SessionPort(Protocol):
    """Port for storing and retrieving visitor profiles."""

    def get(self, session_id: str) -> VisitorProfile | None: ...

    def upsert(self, profile: VisitorProfile) -> None: ...

    def delete(self, session_id: str) -> None: ...
```

Create `backend/src/app/adapters/session/__init__.py` (empty).

Create `backend/src/app/adapters/session/memory_session.py`:

```python
"""In-memory session store with TTL — same pattern as MemoryCache."""

import threading
import time
from collections import OrderedDict

from app.domain.session import VisitorProfile

_Entry = tuple[VisitorProfile, float]  # (profile, expires_at)


class InMemorySession:
    """LRU session store with per-entry TTL."""

    def __init__(self, ttl_seconds: int = 1800, capacity: int = 256) -> None:
        self._ttl = ttl_seconds
        self._capacity = capacity
        self._store: OrderedDict[str, _Entry] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, session_id: str) -> VisitorProfile | None:
        with self._lock:
            entry = self._store.get(session_id)
            if entry is None:
                return None
            profile, expires_at = entry
            if time.monotonic() >= expires_at:
                del self._store[session_id]
                return None
            self._store.move_to_end(session_id)
            return profile

    def upsert(self, profile: VisitorProfile) -> None:
        expires_at = time.monotonic() + self._ttl
        with self._lock:
            if profile.session_id in self._store:
                del self._store[profile.session_id]
            elif len(self._store) >= self._capacity:
                self._store.popitem(last=False)
            self._store[profile.session_id] = (profile, expires_at)

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._store.pop(session_id, None)
```

- [ ] **Step 2a.4: Run tests**

```bash
cd backend && uv run pytest tests/test_memory_session.py -v
```
Expected: all PASS

- [ ] **Step 2a.5: Commit**

```bash
git add backend/src/app/ports/session.py backend/src/app/adapters/session/ backend/tests/test_memory_session.py
git commit -m "feat(session): add SessionPort and InMemorySession adapter"
```

### Task 2b: Signal route

- [ ] **Step 2b.1: Write failing tests**

Create `backend/tests/test_signal_route.py`:

```python
"""Tests for the behavioral signal ingestion endpoint."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestSignalRoute:
    def test_post_signals_returns_200(self):
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session",
                "signals": [
                    {"type": "dwell", "zone": "skills", "duration_ms": 3000, "timestamp": 1.0}
                ],
            },
        )
        assert response.status_code == 200

    def test_post_signals_returns_profile_summary(self):
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session-2",
                "signals": [
                    {"type": "dwell", "zone": "featured", "duration_ms": 5000, "timestamp": 1.0},
                    {"type": "click", "zone": "featured", "duration_ms": 0, "timestamp": 2.0},
                ],
            },
        )
        data = response.json()
        assert "session_id" in data
        assert "tier" in data
        assert "confidence" in data

    def test_rejects_invalid_signal_type(self):
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "s",
                "signals": [{"type": "scroll", "zone": "x", "duration_ms": 0, "timestamp": 0}],
            },
        )
        assert response.status_code == 422

    def test_empty_signals_accepted(self):
        response = client.post(
            "/api/agent/signal",
            json={"session_id": "s", "signals": []},
        )
        assert response.status_code == 200
```

- [ ] **Step 2b.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_signal_route.py -v
```
Expected: FAIL — 404 (route doesn't exist)

- [ ] **Step 2b.3: Implement signal route**

Create `backend/src/app/adapters/api/signal_route.py`:

```python
"""Signal route — ingests behavioral signals and updates visitor profiles."""

import os

from fastapi import APIRouter
from pydantic import BaseModel

from app.adapters.session.memory_session import InMemorySession
from app.domain.context import VisitorContext
from app.domain.session import SignalBatch, VisitorProfile

router = APIRouter(prefix="/api/agent")

_session_store: InMemorySession | None = None


def _get_session_store() -> InMemorySession:
    """Return the module-level session store singleton."""
    global _session_store
    if _session_store is None:
        ttl = int(os.environ.get("SESSION_TTL_SECONDS", "1800"))
        capacity = int(os.environ.get("SESSION_CAPACITY", "256"))
        _session_store = InMemorySession(ttl_seconds=ttl, capacity=capacity)
    return _session_store


class SignalResponse(BaseModel):
    """Response after processing signals."""

    session_id: str
    tier: int
    confidence: float
    signal_count: int


@router.post("/signal")
async def ingest_signals(batch: SignalBatch) -> SignalResponse:
    """Process a batch of behavioral signals and return updated profile state."""
    store = _get_session_store()
    profile = store.get(batch.session_id)

    if profile is None:
        profile = VisitorProfile(
            session_id=batch.session_id,
            context=VisitorContext(),
        )

    for signal in batch.signals:
        profile.accumulate(signal)

    store.upsert(profile)

    return SignalResponse(
        session_id=profile.session_id,
        tier=profile.tier,
        confidence=profile.confidence,
        signal_count=len(profile.signals),
    )
```

Register the route in the API barrel. Read `backend/src/app/adapters/api/__init__.py` and add the signal router import:

Add to `backend/src/app/adapters/api/__init__.py`:

```python
from app.adapters.api.signal_route import router as signal_router

api_router.include_router(signal_router)
```

- [ ] **Step 2b.4: Run tests**

```bash
cd backend && uv run pytest tests/test_signal_route.py -v
```
Expected: all PASS

- [ ] **Step 2b.5: Commit**

```bash
git add backend/src/app/adapters/api/signal_route.py backend/src/app/adapters/api/__init__.py backend/tests/test_signal_route.py
git commit -m "feat(api): add POST /api/agent/signal endpoint for behavioral signals"
```

---

## Task 3: Select Strategy + PydanticAI Adapter

**Branch:** `feat/002-select-strategy`

**Goal:** First intelligence strategy replacing raw LLM calls. PydanticAI structured outputs for referrer-based scoring + emphasis.

**Files:**
- Create: `backend/src/app/domain/strategies/__init__.py`
- Create: `backend/src/app/domain/strategies/select.py`
- Create: `backend/src/app/adapters/llm/pydantic_ai_provider.py`
- Modify: `backend/src/app/ports/llm.py`
- Test: `backend/tests/test_select_strategy.py`
- Eval: `backend/evals/test_select_relevancy.py`

### Task 3a: SelectStrategy

- [ ] **Step 3a.1: Write failing tests**

Create `backend/tests/test_select_strategy.py`:

```python
"""Tests for the Select evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


class TestSelectStrategy:
    def test_builds_prompt_with_referrer(self):
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(referrer="https://linkedin.com/in/test"),
        )
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "linkedin" in prompt.lower()
        assert "hero" in prompt  # catalog items listed

    def test_builds_prompt_for_direct(self):
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "direct" in prompt.lower()

    def test_result_schema_is_intelligence_result(self):
        from app.domain.intelligence import IntelligenceResult
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        assert strategy.result_schema() is IntelligenceResult

    def test_model_config_low_temperature(self):
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        config = strategy.model_config()
        assert config.temperature <= 0.2

    def test_name(self):
        from app.domain.strategies.select import SelectStrategy

        assert SelectStrategy().name == "select"


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog

    return load_catalog()
```

- [ ] **Step 3a.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_select_strategy.py -v
```
Expected: FAIL

- [ ] **Step 3a.3: Implement SelectStrategy**

Create `backend/src/app/domain/strategies/__init__.py` (empty file).

Create `backend/src/app/domain/strategies/select.py`:

```python
"""Select strategy — referrer-based scoring + emphasis directives."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

_SYSTEM_PROMPT = """\
You are a portfolio layout agent. Given a visitor context and content catalog, \
assign an importance score (0.0-1.0) and emphasis directives for each item.

Rules:
- "hero" item MUST have importance >= 0.9
- LinkedIn visitors: elevate contact and experience (>= 0.7), emphasize leadership fields \
(company, role, duration for experience; cta for contact)
- GitHub visitors: elevate projects and skills, emphasize technical fields \
(tech, description for projects)
- Direct/unknown: balanced defaults close to catalog defaults
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: list of data field names to highlight for this visitor (can be empty)
- Do NOT invent field names — only use fields that exist in the item's data

Output ONLY valid JSON matching the schema. No explanation.
"""


class SelectStrategy:
    """Referrer-based scoring + emphasis directives."""

    name: str = "select"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        lines = [
            f"Visitor referrer: {profile.context.referrer or 'direct'}",
            f"Referrer type: {profile.context.referrer_type}",
            "",
            "Catalog items (id, molecule, data fields):",
        ]
        for item in catalog:
            fields = ", ".join(item.data.keys())
            desc = item.data.get("title") or item.data.get("name") or item.id
            lines.append(f"- {item.id} ({item.molecule}): {desc} [fields: {fields}]")
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        return ModelConfig(temperature=0.1, max_tokens=1024)
```

- [ ] **Step 3a.4: Run tests**

```bash
cd backend && uv run pytest tests/test_select_strategy.py -v
```
Expected: all PASS

- [ ] **Step 3a.5: Commit**

```bash
git add backend/src/app/domain/strategies/ backend/tests/test_select_strategy.py
git commit -m "feat(strategy): add SelectStrategy with referrer-based scoring and emphasis"
```

### Task 3b: PydanticAI LLM adapter

- [ ] **Step 3b.1: Expand LLMPort with evaluate()**

Modify `backend/src/app/ports/llm.py` — add the `evaluate` method while keeping backward compatibility:

```python
"""LLM port — protocol for manifest, UX state, and strategy evaluation."""

from typing import Protocol

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.intelligence import IntelligenceResult
from app.domain.manifest import Manifest
from app.domain.session import VisitorProfile
from app.domain.ux import UXState


class LLMPort(Protocol):
    """Port for LLM-based intelligence evaluation."""

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest: ...

    async def assemble_ux_state(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> UXState: ...

    async def evaluate(
        self,
        strategy_name: str,
        system_prompt: str,
        user_prompt: str,
        result_type: type[BaseModel],
        temperature: float,
        max_tokens: int,
    ) -> BaseModel: ...
```

- [ ] **Step 3b.2: Implement PydanticAI adapter**

Create `backend/src/app/adapters/llm/pydantic_ai_provider.py`:

```python
"""PydanticAI LLM adapter — structured output via pydantic-ai agents."""

import logging
import os

from pydantic import BaseModel
from pydantic_ai import Agent

_log = logging.getLogger(__name__)


class PydanticAIProvider:
    """Stateless adapter: creates a fresh Agent per evaluate() call."""

    def __init__(self) -> None:
        self._model = os.environ.get("LLM_MODEL", "openai:gpt-4o-mini")

    async def evaluate(
        self,
        strategy_name: str,
        system_prompt: str,
        user_prompt: str,
        result_type: type[BaseModel],
        temperature: float,
        max_tokens: int,
    ) -> BaseModel:
        """Run a PydanticAI agent with structured output."""
        model = os.environ.get(
            f"LLM_MODEL_{strategy_name.upper()}", self._model
        )
        agent: Agent[None, BaseModel] = Agent(
            model,
            result_type=result_type,
            system_prompt=system_prompt,
        )
        result = await agent.run(user_prompt)
        return result.output
```

- [ ] **Step 3b.3: Commit**

```bash
git add backend/src/app/ports/llm.py backend/src/app/adapters/llm/pydantic_ai_provider.py
git commit -m "feat(llm): add PydanticAI adapter with strategy-driven evaluate()"
```

### Task 3c: EDD evals for Select

- [ ] **Step 3c.1: Write Select relevancy eval**

Create `backend/evals/test_select_relevancy.py`:

```python
"""EDD eval: Select strategy produces relevant emphasis for different referrers."""

import pytest

from app.adapters.content.yaml_loader import load_catalog
from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider
from app.domain.context import VisitorContext
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategies.select import SelectStrategy


@pytest.fixture(scope="session")
def provider():
    import os

    if not os.environ.get("LLM_API_KEY"):
        pytest.skip("LLM_API_KEY not set")
    return PydanticAIProvider()


@pytest.fixture(scope="session")
def catalog():
    return load_catalog()


def _score(result: IntelligenceResult, item_id: str) -> float:
    return next(i.importance for i in result.items if i.id == item_id)


def _emphasis(result: IntelligenceResult, item_id: str) -> list[str]:
    item = next(i for i in result.items if i.id == item_id)
    return item.emphasis or []


@pytest.mark.eval
class TestSelectRelevancy:
    async def test_linkedin_elevates_contact(self, provider, catalog):
        strategy = SelectStrategy()
        profile = VisitorProfile(
            session_id="eval", context=VisitorContext(referrer="https://linkedin.com/in/test")
        )
        result = await provider.evaluate(
            strategy_name=strategy.name,
            system_prompt=strategy.build_prompt.__doc__ or "",
            user_prompt=strategy.build_prompt(profile, catalog),
            result_type=strategy.result_schema(),
            temperature=strategy.model_config().temperature,
            max_tokens=strategy.model_config().max_tokens,
        )
        assert _score(result, "contact") >= 0.7

    async def test_linkedin_emphasizes_leadership(self, provider, catalog):
        strategy = SelectStrategy()
        profile = VisitorProfile(
            session_id="eval", context=VisitorContext(referrer="https://linkedin.com/in/test")
        )
        result = await provider.evaluate(
            strategy_name=strategy.name,
            system_prompt=strategy.build_prompt.__doc__ or "",
            user_prompt=strategy.build_prompt(profile, catalog),
            result_type=strategy.result_schema(),
            temperature=strategy.model_config().temperature,
            max_tokens=strategy.model_config().max_tokens,
        )
        exp_emphasis = _emphasis(result, "experience-current")
        assert any(f in exp_emphasis for f in ("role", "company", "duration"))

    async def test_all_catalog_ids_present(self, provider, catalog):
        strategy = SelectStrategy()
        profile = VisitorProfile(session_id="eval", context=VisitorContext())
        result = await provider.evaluate(
            strategy_name=strategy.name,
            system_prompt=strategy.build_prompt.__doc__ or "",
            user_prompt=strategy.build_prompt(profile, catalog),
            result_type=strategy.result_schema(),
            temperature=strategy.model_config().temperature,
            max_tokens=strategy.model_config().max_tokens,
        )
        result_ids = {item.id for item in result.items}
        catalog_ids = {item.id for item in catalog}
        assert result_ids == catalog_ids
```

- [ ] **Step 3c.2: Run evals (requires LLM_API_KEY)**

```bash
cd backend && uv run pytest evals/test_select_relevancy.py -m eval -v
```

- [ ] **Step 3c.3: Commit**

```bash
git add backend/evals/test_select_relevancy.py
git commit -m "test(edd): add Select strategy relevancy evals"
```

---

## Task 4: Adapt Strategy

**Branch:** `feat/002-adapt-strategy`

**Goal:** Behavioral adaptation + confidence-gated generation in a single LLM call.

**Files:**
- Create: `backend/src/app/domain/strategies/adapt.py`
- Test: `backend/tests/test_adapt_strategy.py`
- Eval: `backend/evals/test_adapt_relevancy.py`

- [ ] **Step 4.1: Write failing tests**

Create `backend/tests/test_adapt_strategy.py`:

```python
"""Tests for the Adapt evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import BehavioralSignal, VisitorProfile


class TestAdaptStrategy:
    def test_builds_prompt_with_behavioral_signals(self):
        from app.domain.strategies.adapt import AdaptStrategy

        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "skills" in prompt.lower()
        assert "dwell" in prompt.lower()

    def test_includes_interests(self):
        from app.domain.strategies.adapt import AdaptStrategy

        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "technical-depth" in prompt

    def test_includes_confidence(self):
        from app.domain.strategies.adapt import AdaptStrategy

        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert str(round(profile.confidence, 2)) in prompt

    def test_name(self):
        from app.domain.strategies.adapt import AdaptStrategy

        assert AdaptStrategy().name == "adapt"

    def test_model_config_moderate_temperature(self):
        from app.domain.strategies.adapt import AdaptStrategy

        config = AdaptStrategy().model_config()
        assert config.temperature <= 0.4
        assert config.max_tokens >= 2048


def _profile_with_signals() -> VisitorProfile:
    profile = VisitorProfile(
        session_id="s1",
        context=VisitorContext(referrer="https://linkedin.com/in/test"),
    )
    for i in range(5):
        profile.accumulate(
            BehavioralSignal(type="dwell", zone="skills", duration_ms=3000, timestamp=float(i))
        )
    return profile


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog
    return load_catalog()
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_adapt_strategy.py -v
```

- [ ] **Step 4.3: Implement AdaptStrategy**

Create `backend/src/app/domain/strategies/adapt.py`:

```python
"""Adapt strategy — behavioral re-scoring + confidence-gated generation."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

_SYSTEM_PROMPT = """\
You are a portfolio intelligence agent. Given a visitor's behavioral profile and \
content catalog, produce adapted importance scores, emphasis directives, and — if \
confidence is high (>= 0.7) — generated content and bridge annotations.

Rules:
- "hero" item MUST have importance >= 0.9
- Shift emphasis toward zones the visitor dwelled on
- Reduce importance of zones the visitor skipped
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: list of data field names to highlight (only real field names from item data)
- generated: dict of field_name -> rewritten text (ONLY if confidence >= 0.7)
  - You may ONLY use facts from the catalog. Do not invent metrics, technologies, or achievements
  - Reframe existing facts for the visitor's interests, do not add new facts
- bridges: connections between items (ONLY if confidence >= 0.7)
  - source_id and target_id must be real catalog item IDs
  - text: 1 sentence connecting the two items based on visitor interests
  - grounding: list of catalog facts the bridge is based on

If confidence < 0.7, omit generated fields and bridges entirely.

Output ONLY valid JSON matching the schema. No explanation.
"""


class AdaptStrategy:
    """Behavioral adaptation + confidence-gated generation."""

    name: str = "adapt"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        lines = [
            f"Visitor referrer: {profile.context.referrer or 'direct'}",
            f"Referrer type: {profile.context.referrer_type}",
            f"Confidence: {profile.confidence:.2f}",
            f"Tier: {profile.tier}",
            f"Interests: {', '.join(profile.interests) or 'none yet'}",
            "",
            "Dwell map (zone → cumulative seconds):",
        ]
        for zone, seconds in sorted(profile.dwell_map.items(), key=lambda x: -x[1]):
            lines.append(f"  {zone}: {seconds:.1f}s")

        lines += [
            "",
            f"Total signals: {len(profile.signals)}",
            "",
            "Catalog items (id, molecule, data fields):",
        ]
        for item in catalog:
            fields = ", ".join(item.data.keys())
            desc = item.data.get("title") or item.data.get("name") or item.id
            lines.append(f"- {item.id} ({item.molecule}): {desc} [fields: {fields}]")
            if profile.confidence >= 0.7:
                lines.append(f"  data: {item.data}")

        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        return ModelConfig(temperature=0.3, max_tokens=2048)
```

- [ ] **Step 4.4: Run tests**

```bash
cd backend && uv run pytest tests/test_adapt_strategy.py -v
```
Expected: all PASS

- [ ] **Step 4.5: Commit**

```bash
git add backend/src/app/domain/strategies/adapt.py backend/tests/test_adapt_strategy.py
git commit -m "feat(strategy): add AdaptStrategy with behavioral re-scoring and generation"
```

---

## Task 5: Compose Strategy

**Branch:** `feat/002-compose-strategy`

**Goal:** Command bar generative composition replacing the current re-scoring approach.

**Files:**
- Create: `backend/src/app/domain/strategies/compose.py`
- Test: `backend/tests/test_compose_strategy.py`

- [ ] **Step 5.1: Write failing tests**

Create `backend/tests/test_compose_strategy.py`:

```python
"""Tests for the Compose evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


class TestComposeStrategy:
    def test_builds_prompt_with_query(self):
        from app.domain.strategies.compose import ComposeStrategy

        strategy = ComposeStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(command="show me distributed systems experience"),
        )
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "distributed systems" in prompt.lower()

    def test_includes_full_catalog_data(self):
        from app.domain.strategies.compose import ComposeStrategy

        strategy = ComposeStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(command="AI projects"),
        )
        catalog = _load_catalog()
        prompt = strategy.build_prompt(profile, catalog)
        assert "LangGraph" in prompt or "langgraph" in prompt.lower()

    def test_name(self):
        from app.domain.strategies.compose import ComposeStrategy

        assert ComposeStrategy().name == "compose"

    def test_model_config_higher_temperature(self):
        from app.domain.strategies.compose import ComposeStrategy

        config = ComposeStrategy().model_config()
        assert config.temperature >= 0.3
        assert config.max_tokens >= 2048


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog
    return load_catalog()
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_compose_strategy.py -v
```

- [ ] **Step 5.3: Implement ComposeStrategy**

Create `backend/src/app/domain/strategies/compose.py`:

```python
"""Compose strategy — command bar cross-content synthesis."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

_SYSTEM_PROMPT = """\
You are a portfolio intelligence agent. The visitor asked a question via the \
command bar. Compose a response by scoring items and generating relevant content.

Rules:
- Score items by relevance to the query (0.0-1.0)
- "hero" item MUST have importance >= 0.9
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: highlight fields relevant to the query
- generated: rewrite descriptions of the most relevant items to directly address \
the query. Use ONLY facts from the catalog. Do not invent anything.
- bridges: connect items that together answer the query
  - grounding: list of catalog facts supporting the bridge

Output ONLY valid JSON matching the schema. No explanation.
"""


class ComposeStrategy:
    """Command bar cross-content synthesis."""

    name: str = "compose"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        command = profile.context.command or ""
        lines = [
            f"Visitor query: {command}",
            f"Referrer type: {profile.context.referrer_type}",
            "",
            "Catalog items (full data for composition):",
        ]
        for item in catalog:
            lines.append(f"- {item.id} ({item.molecule}): {item.data}")
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        return ModelConfig(temperature=0.5, max_tokens=2048)
```

- [ ] **Step 5.4: Run tests**

```bash
cd backend && uv run pytest tests/test_compose_strategy.py -v
```
Expected: all PASS

- [ ] **Step 5.5: Commit**

```bash
git add backend/src/app/domain/strategies/compose.py backend/tests/test_compose_strategy.py
git commit -m "feat(strategy): add ComposeStrategy for command bar synthesis"
```

---

## Task 6: Five-Verb AG-UI Events + Staggered Dispatch

**Branch:** `feat/002-five-verb-events`

**Goal:** Implement the five-verb protocol (ADR-0003) as AG-UI Custom events with staggered dispatch.

**Files:**
- Modify: `backend/src/app/adapters/api/ux_events.py`
- Create: `backend/src/app/adapters/api/dispatch.py`
- Modify: `backend/src/app/domain/ux.py`
- Test: `backend/tests/test_five_verb_events.py`
- Test: `backend/tests/test_dispatch.py`

### Task 6a: Five-verb event formatters

- [ ] **Step 6a.1: Write failing tests**

Create `backend/tests/test_five_verb_events.py`:

```python
"""Tests for five-verb AG-UI event formatters."""

import json


class TestFocusEvent:
    def test_format(self):
        from app.adapters.api.ux_events import ux_focus_event

        event = ux_focus_event("project-salama", 0.85, ["description", "tech"])
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["type"] == "CUSTOM"
        assert parsed["custom"]["eventType"] == "ux:focus"
        assert parsed["custom"]["item_id"] == "project-salama"
        assert parsed["custom"]["importance"] == 0.85
        assert parsed["custom"]["emphasis"] == ["description", "tech"]


class TestRecedeEvent:
    def test_format(self):
        from app.adapters.api.ux_events import ux_recede_event

        event = ux_recede_event("contact", 0.3)
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:recede"
        assert parsed["custom"]["item_id"] == "contact"
        assert parsed["custom"]["importance"] == 0.3


class TestBridgeEvent:
    def test_format(self):
        from app.adapters.api.ux_events import ux_bridge_event

        event = ux_bridge_event("project-salama", "experience-current", "Connected by architecture.")
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:bridge"
        assert parsed["custom"]["source_id"] == "project-salama"
        assert parsed["custom"]["target_id"] == "experience-current"
        assert parsed["custom"]["text"] == "Connected by architecture."


class TestSurfaceEvent:
    def test_format(self):
        from app.adapters.api.ux_events import ux_surface_event

        event = ux_surface_event("project-salama", {"description": "New text here."})
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:surface"
        assert parsed["custom"]["item_id"] == "project-salama"
        assert parsed["custom"]["generated"]["description"] == "New text here."


class TestSignalEvent:
    def test_format(self):
        from app.adapters.api.ux_events import ux_signal_event

        event = ux_signal_event(0.75, "Detected technical interest from dwell pattern.")
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:signal"
        assert parsed["custom"]["confidence"] == 0.75
        assert "technical" in parsed["custom"]["reasoning"]
```

- [ ] **Step 6a.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_five_verb_events.py -v
```

- [ ] **Step 6a.3: Implement five-verb event formatters**

Add to `backend/src/app/adapters/api/ux_events.py` (append after existing functions):

```python
def ux_focus_event(item_id: str, importance: float, emphasis: list[str]) -> str:
    """Format a FOCUS verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:focus",
            "item_id": item_id,
            "importance": importance,
            "emphasis": emphasis,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_recede_event(item_id: str, importance: float) -> str:
    """Format a RECEDE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:recede",
            "item_id": item_id,
            "importance": importance,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_bridge_event(source_id: str, target_id: str, text: str) -> str:
    """Format a BRIDGE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:bridge",
            "source_id": source_id,
            "target_id": target_id,
            "text": text,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_surface_event(item_id: str, generated: dict[str, str]) -> str:
    """Format a SURFACE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:surface",
            "item_id": item_id,
            "generated": generated,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_signal_event(confidence: float, reasoning: str) -> str:
    """Format a SIGNAL verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:signal",
            "confidence": confidence,
            "reasoning": reasoning,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"
```

- [ ] **Step 6a.4: Run tests**

```bash
cd backend && uv run pytest tests/test_five_verb_events.py -v
```
Expected: all PASS

- [ ] **Step 6a.5: Commit**

```bash
git add backend/src/app/adapters/api/ux_events.py backend/tests/test_five_verb_events.py
git commit -m "feat(api): add five-verb AG-UI event formatters (focus/recede/bridge/surface/signal)"
```

### Task 6b: Staggered dispatch

- [ ] **Step 6b.1: Write failing tests**

Create `backend/tests/test_dispatch.py`:

```python
"""Tests for staggered event dispatch."""

import asyncio
import time


class TestStaggeredDispatch:
    async def test_yields_events_with_gaps(self):
        from app.adapters.api.dispatch import staggered_dispatch

        events = ["event1\n\n", "event2\n\n", "event3\n\n"]
        results = []
        timestamps = []
        async for event in staggered_dispatch(events, min_gap_ms=100, max_gap_ms=100):
            results.append(event)
            timestamps.append(time.monotonic())

        assert results == events
        assert len(timestamps) == 3
        # Gaps between events should be ~100ms
        for i in range(1, len(timestamps)):
            gap = (timestamps[i] - timestamps[i - 1]) * 1000
            assert gap >= 80  # Allow some tolerance

    async def test_single_event_no_delay(self):
        from app.adapters.api.dispatch import staggered_dispatch

        events = ["only\n\n"]
        results = []
        async for event in staggered_dispatch(events, min_gap_ms=500, max_gap_ms=500):
            results.append(event)
        assert results == ["only\n\n"]

    async def test_empty_yields_nothing(self):
        from app.adapters.api.dispatch import staggered_dispatch

        results = []
        async for event in staggered_dispatch([], min_gap_ms=100, max_gap_ms=100):
            results.append(event)
        assert results == []
```

- [ ] **Step 6b.2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_dispatch.py -v
```

- [ ] **Step 6b.3: Implement staggered dispatch**

Create `backend/src/app/adapters/api/dispatch.py`:

```python
"""Staggered dispatch — emits SSE events with 400-800ms gaps (ADR-0003)."""

import asyncio
import random
from collections.abc import AsyncGenerator


async def staggered_dispatch(
    events: list[str],
    min_gap_ms: int = 400,
    max_gap_ms: int = 800,
) -> AsyncGenerator[str]:
    """Yield events with random gaps between min_gap_ms and max_gap_ms."""
    for i, event in enumerate(events):
        if i > 0:
            gap = random.randint(min_gap_ms, max_gap_ms) / 1000.0
            await asyncio.sleep(gap)
        yield event
```

- [ ] **Step 6b.4: Run tests**

```bash
cd backend && uv run pytest tests/test_dispatch.py -v
```
Expected: all PASS

- [ ] **Step 6b.5: Commit**

```bash
git add backend/src/app/adapters/api/dispatch.py backend/tests/test_dispatch.py
git commit -m "feat(api): add staggered dispatch utility for five-verb events (ADR-0003)"
```

---

## Task 7: Frontend — UX Store + Parsers + Signal Collector + Molecule Rendering

**Branch:** `feat/002-frontend-intelligence`

**Goal:** Frontend consumes five-verb events, renders emphasis/generated content, sends behavioral signals.

**Files:**
- Modify: `frontend/src/store/ux-store.ts`
- Modify: `frontend/src/hooks/ux-parsers.ts`
- Modify: `frontend/src/hooks/use-agent-stream.ts`
- Create: `frontend/src/hooks/use-signal-collector.ts`
- Modify: `frontend/src/molecules/ProjectCard.tsx`
- Modify: `frontend/src/molecules/ExperienceCard.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Test: `frontend/src/__tests__/ux-store-intelligence.test.ts`
- Test: `frontend/src/__tests__/use-signal-collector.test.ts`

This task is large — decompose into sub-slices during implementation. Key changes:

### Task 7a: Extend UX store with emphasis/generated/bridges

- [ ] **Step 7a.1: Write failing tests**

Create `frontend/src/__tests__/ux-store-intelligence.test.ts`:

```typescript
import { afterEach, describe, expect, it } from "vitest";
import { useUXStore } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({ ux: { tempo: 0.5, agency: 0.5 }, items: [], bridges: [] });
});

describe("intelligence extensions", () => {
  it("applyFocus updates importance and emphasis", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        { id: "project-salama", salience: 0.7, group: "work", molecule: "project", data: {} },
      ],
    });
    useUXStore.getState().applyFocus("project-salama", 0.9, ["description", "tech"]);
    const item = useUXStore.getState().items.find((i) => i.id === "project-salama");
    expect(item?.salience).toBe(0.9);
    expect(item?.emphasis).toEqual(["description", "tech"]);
  });

  it("applyRecede reduces importance", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        { id: "contact", salience: 0.6, group: "background", molecule: "contact", data: {} },
      ],
    });
    useUXStore.getState().applyRecede("contact", 0.3);
    const item = useUXStore.getState().items.find((i) => i.id === "contact");
    expect(item?.salience).toBe(0.3);
  });

  it("applySurface sets generated content", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        { id: "project-salama", salience: 0.7, group: "work", molecule: "project", data: {} },
      ],
    });
    useUXStore.getState().applySurface("project-salama", { description: "Custom text." });
    const item = useUXStore.getState().items.find((i) => i.id === "project-salama");
    expect(item?.generated).toEqual({ description: "Custom text." });
  });

  it("addBridge stores bridge annotation", () => {
    useUXStore.getState().addBridge("project-salama", "experience-current", "Connected.");
    const bridges = useUXStore.getState().bridges;
    expect(bridges).toHaveLength(1);
    expect(bridges[0].text).toBe("Connected.");
  });
});
```

- [ ] **Step 7a.2: Run test to verify it fails**

```bash
cd frontend && pnpm test -- --run src/__tests__/ux-store-intelligence.test.ts
```

- [ ] **Step 7a.3: Extend UX store**

Modify `frontend/src/store/ux-store.ts` — add `emphasis`, `generated` to `UXItem`, add `bridges` to state, add new actions:

```typescript
import { create } from "zustand";

export interface UXGlobals {
  tempo: number;
  agency: number;
}

export interface UXItem {
  id: string;
  salience: number;
  group: string;
  molecule: string;
  data: Record<string, unknown>;
  emphasis?: string[];
  generated?: Record<string, string>;
}

export interface SalienceUpdate {
  id: string;
  salience: number;
}

export interface BridgeEntry {
  source_id: string;
  target_id: string;
  text: string;
}

interface UXState {
  ux: UXGlobals;
  items: UXItem[];
  bridges: BridgeEntry[];
  setSnapshot: (snapshot: { ux: UXGlobals; items: UXItem[] }) => void;
  applySalience: (updates: SalienceUpdate[]) => void;
  setTempo: (tempo: number) => void;
  setAgency: (agency: number) => void;
  applyFocus: (itemId: string, importance: number, emphasis: string[]) => void;
  applyRecede: (itemId: string, importance: number) => void;
  applySurface: (itemId: string, generated: Record<string, string>) => void;
  addBridge: (sourceId: string, targetId: string, text: string) => void;
}

export const useUXStore = create<UXState>((set) => ({
  ux: { tempo: 0.5, agency: 0.5 },
  items: [],
  bridges: [],
  setSnapshot: (snapshot) => set({ ux: snapshot.ux, items: snapshot.items }),
  applySalience: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.salience]));
      return {
        items: state.items.map((item) => {
          const newSalience = updateMap.get(item.id);
          return newSalience !== undefined
            ? { ...item, salience: newSalience }
            : item;
        }),
      };
    }),
  setTempo: (tempo) => set((state) => ({ ux: { ...state.ux, tempo } })),
  setAgency: (agency) => set((state) => ({ ux: { ...state.ux, agency } })),
  applyFocus: (itemId, importance, emphasis) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, salience: importance, emphasis } : item,
      ),
    })),
  applyRecede: (itemId, importance) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, salience: importance } : item,
      ),
    })),
  applySurface: (itemId, generated) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, generated } : item,
      ),
    })),
  addBridge: (sourceId, targetId, text) =>
    set((state) => ({
      bridges: [...state.bridges, { source_id: sourceId, target_id: targetId, text }],
    })),
}));

export function peakSalienceGroup(state: UXState): string | undefined {
  if (state.items.length === 0) return undefined;
  const peak = state.items.reduce((best, item) =>
    item.salience > best.salience ? item : best,
  );
  return peak.group;
}
```

- [ ] **Step 7a.4: Run tests**

```bash
cd frontend && pnpm test -- --run src/__tests__/ux-store-intelligence.test.ts
```
Expected: all PASS

- [ ] **Step 7a.5: Fix existing tests that reference old store shape**

Run full test suite and fix any tests that break due to the new `bridges` field:

```bash
cd frontend && pnpm test -- --run
```

- [ ] **Step 7a.6: Commit**

```bash
git add frontend/src/store/ux-store.ts frontend/src/__tests__/ux-store-intelligence.test.ts
git commit -m "feat(store): extend UX store with emphasis, generated, bridges for intelligence"
```

### Task 7b: Five-verb event parsers + stream handler

- [ ] **Step 7b.1: Add type guards for five-verb events to `ux-parsers.ts`**

Add these interfaces and guards to `frontend/src/hooks/ux-parsers.ts`:

```typescript
export interface UXFocusEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:focus";
    item_id: string;
    importance: number;
    emphasis: string[];
  };
}

export interface UXRecedeEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:recede";
    item_id: string;
    importance: number;
  };
}

export interface UXBridgeEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:bridge";
    source_id: string;
    target_id: string;
    text: string;
  };
}

export interface UXSurfaceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:surface";
    item_id: string;
    generated: Record<string, string>;
  };
}

export interface UXSignalEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:signal";
    confidence: number;
    reasoning: string;
  };
}

export function isUXFocus(data: unknown): data is UXFocusEvent {
  return hasCustomEventType(data, "ux:focus");
}

export function isUXRecede(data: unknown): data is UXRecedeEvent {
  return hasCustomEventType(data, "ux:recede");
}

export function isUXBridge(data: unknown): data is UXBridgeEvent {
  return hasCustomEventType(data, "ux:bridge");
}

export function isUXSurface(data: unknown): data is UXSurfaceEvent {
  return hasCustomEventType(data, "ux:surface");
}

export function isUXSignal(data: unknown): data is UXSignalEvent {
  return hasCustomEventType(data, "ux:signal");
}
```

- [ ] **Step 7b.2: Wire new events into use-agent-stream.ts**

Add imports and handlers in `frontend/src/hooks/use-agent-stream.ts`:

```typescript
import {
  isUXAgency,
  isUXBridge,
  isUXFocus,
  isUXRecede,
  isUXSalience,
  isUXSignal,
  isUXSnapshot,
  isUXSurface,
  isUXTempo,
} from "./ux-parsers";

// Inside the onmessage handler, after existing cases:
} else if (isUXFocus(data)) {
  applyFocus(data.custom.item_id, data.custom.importance, data.custom.emphasis);
} else if (isUXRecede(data)) {
  applyRecede(data.custom.item_id, data.custom.importance);
} else if (isUXBridge(data)) {
  addBridge(data.custom.source_id, data.custom.target_id, data.custom.text);
} else if (isUXSurface(data)) {
  applySurface(data.custom.item_id, data.custom.generated);
} else if (isUXSignal(data)) {
  // Signal events feed the transparency panel (existing audit store)
}
```

- [ ] **Step 7b.3: Commit**

```bash
git add frontend/src/hooks/ux-parsers.ts frontend/src/hooks/use-agent-stream.ts
git commit -m "feat(hooks): add five-verb event parsers and stream handler wiring"
```

### Task 7c: Signal collector hook

- [ ] **Step 7c.1: Implement signal collector**

Create `frontend/src/hooks/use-signal-collector.ts`:

```typescript
/**
 * Collects behavioral signals (dwell, click, skip) and POSTs them in batches.
 */
import { useCallback, useEffect, useRef } from "react";

interface Signal {
  type: "dwell" | "skip" | "click" | "hover";
  zone: string;
  duration_ms: number;
  timestamp: number;
}

const BATCH_INTERVAL_MS = 4000;

export function useSignalCollector(sessionId: string | null) {
  const bufferRef = useRef<Signal[]>([]);

  const addSignal = useCallback((signal: Signal) => {
    bufferRef.current.push(signal);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const signals = bufferRef.current;
      if (signals.length === 0) return;
      bufferRef.current = [];

      fetch("/api/agent/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, signals }),
      }).catch(() => {
        /* fire-and-forget */
      });
    }, BATCH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

  return { addSignal };
}
```

- [ ] **Step 7c.2: Commit**

```bash
git add frontend/src/hooks/use-signal-collector.ts
git commit -m "feat(hooks): add use-signal-collector for behavioral signal batching"
```

### Task 7d: Molecule emphasis/generated rendering

- [ ] **Step 7d.1: Update ProjectCard to use emphasis/generated**

Modify `frontend/src/molecules/ProjectCard.tsx` to accept optional `emphasis` and `generated` props, preferring generated text over static data:

```typescript
export function ProjectCard({
  title,
  description,
  tech,
  emphasis,
  generated,
}: {
  title: string;
  description: string;
  tech: string[];
  emphasis?: string[];
  generated?: Record<string, string>;
}) {
  const displayTitle = generated?.title ?? title;
  const displayDesc = generated?.description ?? description;
  const showDescription = !emphasis || emphasis.includes("description");
  const showTech = !emphasis || emphasis.includes("tech");

  return (
    <article className="space-y-2">
      <h3
        className="font-heading font-light italic text-ink"
        style={{ fontSize: "clamp(16px, 2vw, 22px)" }}
      >
        {displayTitle}
      </h3>
      {showDescription && (
        <p className="text-xs font-sans text-ink-65 leading-relaxed">
          {displayDesc}
        </p>
      )}
      {showTech && (
        <ul className="flex flex-wrap gap-1.5">
          {tech.map((t) => (
            <li
              key={t}
              className="text-[8px] font-sans uppercase tracking-[0.1em] bg-ink-06 text-ink-50 px-2.5 py-0.5"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      <div className="breathing-extra opacity-0 max-h-0 overflow-hidden" />
    </article>
  );
}
```

- [ ] **Step 7d.2: Update MoleculeResolver to pass emphasis/generated**

Modify `frontend/src/molecules/MoleculeResolver.tsx` to forward `emphasis` and `generated` from UXItem:

```typescript
export function MoleculeResolver({
  molecule,
  data,
  emphasis,
  generated,
}: {
  molecule: string;
  data: Record<string, unknown>;
  emphasis?: string[];
  generated?: Record<string, string>;
}) {
  const Component = registry[molecule];

  if (!Component) {
    return <div>{molecule}</div>;
  }

  return <Component {...data} emphasis={emphasis} generated={generated} />;
}
```

Update `Canvas.tsx` to pass these through:

```typescript
<MoleculeResolver
  molecule={item.molecule}
  data={item.data}
  emphasis={item.emphasis}
  generated={item.generated}
/>
```

- [ ] **Step 7d.3: Run full frontend tests**

```bash
cd frontend && pnpm test -- --run
```

- [ ] **Step 7d.4: Commit**

```bash
git add frontend/src/molecules/ frontend/src/canvas/Canvas.tsx
git commit -m "feat(molecules): render emphasis directives and generated content from agent"
```

---

## Verification

After all tasks are complete:

1. **Backend tests:** `cd backend && uv run pytest -v` — all pass
2. **Frontend tests:** `cd frontend && pnpm test -- --run` — all pass
3. **Typecheck:** `cd frontend && pnpm typecheck` — clean
4. **Lint:** `make lint` — clean
5. **EDD evals:** `cd backend && uv run pytest evals/ -m eval -v` — pass (requires LLM_API_KEY)
6. **Manual test:** `make dev` → visit with different referrer headers → observe emphasis changes → dwell on zones → observe adaptation → use ⌘K → observe generative composition
