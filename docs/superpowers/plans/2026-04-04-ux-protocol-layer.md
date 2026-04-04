# UX Protocol Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the backend domain model, SSE events, and frontend store from FEAT-001's flat importance scores to the four-dimensional UX protocol (salience, organization, tempo, agency) — transported via AG-UI adapter.

**Architecture:** Standalone UX protocol types (framework-agnostic) define state and events. An AG-UI transport adapter maps UX events to AG-UI SSE events. The backend domain model evolves: `ManifestItem.importance` → `Item.salience` + `Item.group`. Two new global dimensions: `tempo` and `agency`. The frontend store and stream hook consume the new shape. Canvas renders a basic walking-skeleton interpretation (salience → opacity).

**Tech Stack:** Python 3.13, Pydantic 2.11, FastAPI, TypeScript 5.8, Zustand, vitest, pytest

**Ref:** Protocol spec at `.claude/plans/functional-growing-cascade.md`. ADR-0003 at `docs/adrs/0003-agent-interaction-protocol.md`.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `backend/src/app/domain/ux.py` | UX state model: `UXGlobals(tempo, agency)`, `UXItem(id, salience, group, molecule, data)`, `UXState(ux, items)` |
| `backend/src/app/adapters/api/ux_events.py` | AG-UI transport adapter: format UX events as SSE |
| `frontend/src/store/ux-store.ts` | Zustand store for `UXGlobals` + `UXItem[]` |
| `frontend/src/hooks/ux-parsers.ts` | Type guards for UX SSE events |
| `backend/tests/test_ux_model.py` | Domain model tests |
| `backend/tests/test_ux_events.py` | SSE adapter tests |
| `frontend/src/__tests__/ux-store.test.ts` | Store tests |
| `frontend/src/__tests__/ux-parsers.test.ts` | Parser tests |

### Modified files

| File | Change |
|------|--------|
| `backend/content/catalog.yaml` | Add `default_salience` and `default_group` per item (replace `default_importance`) |
| `backend/src/app/domain/content.py` | `ContentItem` evolves: `default_importance` → `default_salience`, add `default_group` |
| `backend/src/app/domain/agent.py` | Return `UXState` instead of `Manifest` |
| `backend/src/app/ports/llm.py` | Port returns `UXState` |
| `backend/src/app/adapters/llm/provider.py` | New system prompt for salience + group + tempo + agency |
| `backend/src/app/adapters/api/stream_route.py` | Use UX event formatters |
| `backend/src/app/adapters/api/command_route.py` | Use UX event formatters |
| `frontend/src/hooks/use-agent-stream.ts` | Consume UX events → write to ux-store |
| `frontend/src/components/canvas/Canvas.tsx` | Read from ux-store, basic salience → opacity interpretation |
| `frontend/src/store/manifest-store.ts` | Deprecated (replaced by ux-store) |
| `frontend/src/hooks/sse-parsers.ts` | Deprecated (replaced by ux-parsers) |

---

## Task 1: Backend UX Domain Model

**Files:**
- Create: `backend/src/app/domain/ux.py`
- Test: `backend/tests/test_ux_model.py`

- [ ] **Step 1: Write failing tests for UXGlobals**

```python
"""Tests for UX protocol domain models."""

import pytest
from pydantic import ValidationError

from app.domain.ux import UXGlobals


class TestUXGlobals:
    def test_valid_defaults(self) -> None:
        ux = UXGlobals()
        assert ux.tempo == 0.5
        assert ux.agency == 0.5

    def test_custom_values(self) -> None:
        ux = UXGlobals(tempo=0.2, agency=0.8)
        assert ux.tempo == 0.2
        assert ux.agency == 0.8

    def test_tempo_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(tempo=-0.1)

    def test_tempo_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(tempo=1.1)

    def test_agency_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(agency=-0.1)

    def test_agency_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(agency=1.1)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_ux_model.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.domain.ux'`

- [ ] **Step 3: Implement UXGlobals**

```python
"""UX protocol domain models — four fundamental dimensions."""

from typing import Any

from pydantic import BaseModel, Field


class UXGlobals(BaseModel):
    """Global UX dimensions: tempo and agency."""

    tempo: float = Field(default=0.5, ge=0.0, le=1.0)
    agency: float = Field(default=0.5, ge=0.0, le=1.0)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_ux_model.py::TestUXGlobals -v`
Expected: All 6 PASS

- [ ] **Step 5: Write failing tests for UXItem**

Append to `backend/tests/test_ux_model.py`:

```python
from app.domain.ux import UXItem


class TestUXItem:
    def test_valid_item(self) -> None:
        item = UXItem(
            id="hero",
            salience=0.95,
            group="identity",
            molecule="identity",
            data={"name": "Firaaz"},
        )
        assert item.id == "hero"
        assert item.salience == 0.95
        assert item.group == "identity"

    def test_salience_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=-0.1, group="g", molecule="m", data={})

    def test_salience_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=1.1, group="g", molecule="m", data={})

    def test_group_required(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=0.5, molecule="m", data={})
```

- [ ] **Step 6: Run to verify they fail**

Run: `cd backend && uv run pytest tests/test_ux_model.py::TestUXItem -v`
Expected: FAIL — `ImportError: cannot import name 'UXItem'`

- [ ] **Step 7: Implement UXItem**

Add to `backend/src/app/domain/ux.py`:

```python
class UXItem(BaseModel):
    """A content item with UX dimensions: salience and group."""

    id: str
    salience: float = Field(ge=0.0, le=1.0)
    group: str
    molecule: str
    data: dict[str, Any]
```

- [ ] **Step 8: Run to verify they pass**

Run: `cd backend && uv run pytest tests/test_ux_model.py::TestUXItem -v`
Expected: All 4 PASS

- [ ] **Step 9: Write failing tests for UXState**

Append to `backend/tests/test_ux_model.py`:

```python
from app.domain.ux import UXState


class TestUXState:
    def test_valid_state(self) -> None:
        state = UXState(
            ux=UXGlobals(tempo=0.3, agency=0.7),
            items=[
                UXItem(id="hero", salience=0.95, group="identity", molecule="hero", data={"name": "F"}),
            ],
        )
        assert state.ux.tempo == 0.3
        assert len(state.items) == 1

    def test_empty_items_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXState(ux=UXGlobals(), items=[])

    def test_default_globals(self) -> None:
        state = UXState(
            items=[
                UXItem(id="a", salience=0.5, group="g", molecule="m", data={}),
            ],
        )
        assert state.ux.tempo == 0.5
        assert state.ux.agency == 0.5
```

- [ ] **Step 10: Run to verify they fail**

Run: `cd backend && uv run pytest tests/test_ux_model.py::TestUXState -v`
Expected: FAIL — `ImportError: cannot import name 'UXState'`

- [ ] **Step 11: Implement UXState**

Add to `backend/src/app/domain/ux.py`:

```python
class UXState(BaseModel):
    """Full UX protocol state: globals + items."""

    ux: UXGlobals = Field(default_factory=UXGlobals)
    items: list[UXItem] = Field(min_length=1)
```

- [ ] **Step 12: Run all model tests**

Run: `cd backend && uv run pytest tests/test_ux_model.py -v`
Expected: All 13 PASS

- [ ] **Step 13: Commit**

```bash
git add backend/src/app/domain/ux.py backend/tests/test_ux_model.py
git commit -m "feat(domain): add UX protocol models — UXGlobals, UXItem, UXState"
```

---

## Task 2: Evolve Content Catalog

**Files:**
- Modify: `backend/content/catalog.yaml`
- Modify: `backend/src/app/domain/content.py:66-96`
- Test: `backend/tests/test_content_models.py` (update existing)

- [ ] **Step 1: Write failing test for new ContentItem fields**

Add to `backend/tests/test_content_models.py`:

```python
class TestContentItemUXFields:
    def test_default_salience_and_group(self) -> None:
        item = ContentItem(
            id="hero",
            molecule="hero",
            default_salience=0.95,
            default_group="identity",
            data={"name": "F", "title": "T", "subtitle": "S", "summary": "Sum"},
        )
        assert item.default_salience == 0.95
        assert item.default_group == "identity"

    def test_salience_bounds(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="x", molecule="hero", default_salience=1.5, default_group="g",
                data={"name": "F", "title": "T", "subtitle": "S", "summary": "Sum"},
            )

    def test_backward_compat_importance_alias(self) -> None:
        """default_importance still works as alias during migration."""
        item = ContentItem(
            id="hero",
            molecule="hero",
            default_importance=0.9,
            default_group="identity",
            data={"name": "F", "title": "T", "subtitle": "S", "summary": "Sum"},
        )
        assert item.default_salience == 0.9
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && uv run pytest tests/test_content_models.py::TestContentItemUXFields -v`
Expected: FAIL

- [ ] **Step 3: Evolve ContentItem model**

In `backend/src/app/domain/content.py`, replace the `ContentItem` class:

```python
class ContentItem(BaseModel):
    """A content catalog entry with molecule-specific data validation."""

    id: str
    molecule: str
    default_salience: float = Field(ge=0.0, le=1.0, alias="default_importance")
    default_group: str = "default"
    data: dict[str, Any]

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def _validate_data_shape(self) -> "ContentItem":
        model = _DATA_MODELS.get(self.molecule)
        if model is None:
            msg = f"Unknown molecule: {self.molecule}"
            raise ValueError(msg)
        model(**self.data)
        return self
```

- [ ] **Step 4: Update content_to_manifest to produce UXState**

Replace the `content_to_manifest` function:

```python
from app.domain.ux import UXGlobals, UXItem, UXState


def content_to_ux_state(items: list[ContentItem]) -> UXState:
    """Convert content catalog items to a UXState with default salience."""
    return UXState(
        ux=UXGlobals(),
        items=[
            UXItem(
                id=item.id,
                salience=item.default_salience,
                group=item.default_group,
                molecule=item.molecule,
                data=item.data,
            )
            for item in items
        ],
    )
```

Keep the old `content_to_manifest` function temporarily for backward compatibility during migration.

- [ ] **Step 5: Run new tests**

Run: `cd backend && uv run pytest tests/test_content_models.py -v`
Expected: All PASS (new + existing)

- [ ] **Step 6: Update catalog.yaml with groups**

Replace `backend/content/catalog.yaml`:

```yaml
items:
  - id: hero
    molecule: hero
    default_importance: 1.0
    default_group: identity
    data:
      name: Firaaz Farook
      title: Senior Software Engineer
      subtitle: AI Systems & Agentic Platforms
      summary: >-
        6+ years building production AI systems.
        Currently shipping agentic platforms at scale.

  - id: project-salama
    molecule: project
    default_importance: 0.75
    default_group: work
    data:
      title: Salama AI Platform
      description: LangGraph-powered agentic platform serving 25K+ queries/month
      tech:
        - LangGraph
        - Python
        - FastAPI

  - id: project-genai-migration
    molecule: project
    default_importance: 0.65
    default_group: work
    data:
      title: GenAI Code Migration
      description: Led 4-6 engineers on large-scale code migration using LLMs
      tech:
        - Python
        - LLMs
        - AST

  - id: experience-deloitte
    molecule: experience
    default_importance: 0.7
    default_group: work
    data:
      company: Deloitte
      role: Senior Consultant
      duration: 4 years
      description: Led GenAI initiatives across enterprise clients

  - id: experience-current
    molecule: experience
    default_importance: 0.7
    default_group: work
    data:
      company: Emaratech
      role: Senior Software Engineer
      duration: Current
      description: Building AI systems and agentic platforms

  - id: contact
    molecule: contact
    default_importance: 0.6
    default_group: background
    data:
      email: firaazfarook19@gmail.com
      cta: Let's talk

  - id: skill-python
    molecule: skill
    default_importance: 0.3
    default_group: background
    data:
      name: Python

  - id: skill-typescript
    molecule: skill
    default_importance: 0.3
    default_group: background
    data:
      name: TypeScript

  - id: skill-langgraph
    molecule: skill
    default_importance: 0.3
    default_group: background
    data:
      name: LangGraph

  - id: skill-docker
    molecule: skill
    default_importance: 0.25
    default_group: background
    data:
      name: Docker

  - id: skill-kubernetes
    molecule: skill
    default_importance: 0.25
    default_group: background
    data:
      name: Kubernetes

  - id: skill-aws
    molecule: skill
    default_importance: 0.25
    default_group: background
    data:
      name: AWS ML

  - id: education-be
    molecule: education
    default_importance: 0.2
    default_group: background
    data:
      degree: B.E. Computer Science
      institution: University of Peradeniya
```

- [ ] **Step 7: Run full test suite**

Run: `cd backend && uv run pytest -v`
Expected: All PASS (catalog still uses `default_importance` key which is aliased)

- [ ] **Step 8: Commit**

```bash
git add backend/src/app/domain/content.py backend/content/catalog.yaml backend/tests/test_content_models.py
git commit -m "feat(domain): evolve ContentItem with default_salience and default_group"
```

---

## Task 3: UX SSE Event Formatters (AG-UI Adapter)

**Files:**
- Create: `backend/src/app/adapters/api/ux_events.py`
- Test: `backend/tests/test_ux_events.py`

- [ ] **Step 1: Write failing tests**

```python
"""Tests for UX protocol AG-UI transport adapter."""

import json

from app.adapters.api.ux_events import ux_snapshot_event, ux_salience_event, ux_tempo_event, ux_agency_event
from app.domain.ux import UXGlobals, UXItem, UXState


class TestUXSnapshotEvent:
    def test_format(self) -> None:
        state = UXState(
            ux=UXGlobals(tempo=0.3, agency=0.7),
            items=[UXItem(id="hero", salience=0.95, group="identity", molecule="hero", data={"name": "F"})],
        )
        raw = ux_snapshot_event(state)
        assert raw.startswith("data: ")
        assert raw.endswith("\n\n")
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "STATE_SNAPSHOT"
        assert payload["snapshot"]["ux"]["tempo"] == 0.3
        assert payload["snapshot"]["ux"]["agency"] == 0.7
        assert payload["snapshot"]["items"][0]["salience"] == 0.95
        assert payload["snapshot"]["items"][0]["group"] == "identity"


class TestUXSalienceEvent:
    def test_format(self) -> None:
        raw = ux_salience_event([{"id": "hero", "salience": 0.9}])
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:salience"
        assert payload["custom"]["items"][0]["salience"] == 0.9


class TestUXTempoEvent:
    def test_format(self) -> None:
        raw = ux_tempo_event(0.7)
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:tempo"
        assert payload["custom"]["value"] == 0.7


class TestUXAgencyEvent:
    def test_format(self) -> None:
        raw = ux_agency_event(0.8)
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:agency"
        assert payload["custom"]["value"] == 0.8
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && uv run pytest tests/test_ux_events.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement UX event formatters**

```python
"""UX protocol AG-UI transport adapter — formats UX events as SSE."""

import json
from typing import Any

from app.domain.ux import UXState


def ux_snapshot_event(state: UXState) -> str:
    """Format a UXState as an AG-UI StateSnapshot SSE event."""
    payload = {
        "type": "STATE_SNAPSHOT",
        "snapshot": state.model_dump(),
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_salience_event(items: list[dict[str, Any]]) -> str:
    """Format salience changes as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:salience", "items": items},
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_tempo_event(value: float) -> str:
    """Format tempo change as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:tempo", "value": value},
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_agency_event(value: float) -> str:
    """Format agency change as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:agency", "value": value},
    }
    return f"data: {json.dumps(payload)}\n\n"
```

- [ ] **Step 4: Run tests**

Run: `cd backend && uv run pytest tests/test_ux_events.py -v`
Expected: All 4 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/ux_events.py backend/tests/test_ux_events.py
git commit -m "feat(api): add UX protocol AG-UI transport adapter"
```

---

## Task 4: Evolve LLM Port and Agent

**Files:**
- Modify: `backend/src/app/ports/llm.py`
- Modify: `backend/src/app/domain/agent.py`
- Modify: `backend/src/app/adapters/llm/provider.py`

- [ ] **Step 1: Write failing test for agent returning UXState**

Add `backend/tests/test_agent_ux.py`:

```python
"""Tests for agent UX state assembly."""

from unittest.mock import AsyncMock

from app.domain.agent import assemble_ux_state
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.ux import UXGlobals, UXItem, UXState


class TestAssembleUXState:
    async def test_calls_llm_and_returns_ux_state(self) -> None:
        catalog = [
            ContentItem(
                id="hero", molecule="hero", default_importance=1.0, default_group="identity",
                data={"name": "F", "title": "T", "subtitle": "S", "summary": "Sum"},
            ),
        ]
        expected = UXState(
            ux=UXGlobals(tempo=0.4, agency=0.6),
            items=[UXItem(id="hero", salience=0.95, group="identity", molecule="hero", data=catalog[0].data)],
        )
        mock_llm = AsyncMock()
        mock_llm.assemble_ux_state.return_value = expected
        context = VisitorContext(referrer=None, referrer_type="direct")

        result = await assemble_ux_state(context, catalog, mock_llm)

        assert result.ux.tempo == 0.4
        assert result.items[0].salience == 0.95

    async def test_falls_back_to_defaults_on_error(self) -> None:
        catalog = [
            ContentItem(
                id="hero", molecule="hero", default_importance=1.0, default_group="identity",
                data={"name": "F", "title": "T", "subtitle": "S", "summary": "Sum"},
            ),
        ]
        mock_llm = AsyncMock()
        mock_llm.assemble_ux_state.side_effect = RuntimeError("LLM down")
        context = VisitorContext(referrer=None, referrer_type="direct")

        result = await assemble_ux_state(context, catalog, mock_llm)

        assert result.ux.tempo == 0.5
        assert result.items[0].salience == 1.0
        assert result.items[0].group == "identity"
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && uv run pytest tests/test_agent_ux.py -v`
Expected: FAIL — `ImportError: cannot import name 'assemble_ux_state'`

- [ ] **Step 3: Update LLM port**

Replace `backend/src/app/ports/llm.py`:

```python
"""Port for LLM-based manifest/UX assembly."""

from typing import Protocol

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest
from app.domain.ux import UXState


class LLMPort(Protocol):
    """Protocol for LLM adapter — assembles manifest or UX state from context."""

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
```

- [ ] **Step 4: Add assemble_ux_state to agent**

Add to `backend/src/app/domain/agent.py`:

```python
from app.domain.content import ContentItem, content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.ux import UXState


async def assemble_ux_state(
    context: VisitorContext,
    catalog: list[ContentItem],
    llm: object,
) -> UXState:
    """Ask the LLM to build a UX state. Fall back to defaults on error."""
    try:
        return await llm.assemble_ux_state(context, catalog)
    except Exception:
        return content_to_ux_state(catalog)
```

- [ ] **Step 5: Run tests**

Run: `cd backend && uv run pytest tests/test_agent_ux.py -v`
Expected: All 2 PASS

- [ ] **Step 6: Update LLM provider with UX system prompt**

Add `assemble_ux_state` method to `LLMProvider` in `backend/src/app/adapters/llm/provider.py`:

```python
_UX_SYSTEM_PROMPT = """\
You are a portfolio UX agent. Given a visitor context and content catalog, \
decide the experience for this visitor.

Output a JSON object with:
1. "ux": {"tempo": 0.0-1.0, "agency": 0.0-1.0}
   - tempo: how fast the experience adapts (0.2=calm, 0.5=moderate, 0.8=direct)
   - agency: who drives (0.3=agent-led, 0.5=collaborative, 0.7=visitor-led)
2. "items": array of {"id": string, "salience": 0.0-1.0, "group": string}
   - salience: contextual relevance for THIS visitor
   - group: semantic cluster ("identity", "work", "background")

Rules:
- The "hero" item MUST have salience >= 0.9
- LinkedIn visitors: tempo 0.4 (patient), agency 0.4 (agent guides toward contact)
- GitHub visitors: tempo 0.6, agency 0.6 (let them explore code)
- Direct/unknown: tempo 0.5, agency 0.5 (balanced)
- ALL catalog item IDs must appear — no more, no fewer
- Keep existing groups unless context demands a change

Output ONLY valid JSON, no explanation, no markdown fences.
"""


def _parse_ux_scores(
    raw: str,
    catalog: list[ContentItem],
) -> "UXState":
    """Parse LLM JSON response into a UXState."""
    from app.domain.ux import UXGlobals, UXItem, UXState

    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    parsed = json.loads(cleaned)
    catalog_map = {item.id: item for item in catalog}

    ux = UXGlobals(
        tempo=float(parsed["ux"]["tempo"]),
        agency=float(parsed["ux"]["agency"]),
    )
    items = []
    for entry in parsed["items"]:
        item_id = str(entry["id"])
        source = catalog_map[item_id]
        items.append(
            UXItem(
                id=item_id,
                salience=float(entry["salience"]),
                group=str(entry.get("group", source.default_group)),
                molecule=source.molecule,
                data=source.data,
            ),
        )
    return UXState(ux=ux, items=items)
```

Add the method to the `LLMProvider` class:

```python
    async def assemble_ux_state(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> "UXState":
        """Call the LLM with UX prompt and parse into UXState."""
        user_prompt = _build_user_prompt(context, catalog)
        for attempt in range(_MAX_RETRIES):
            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": _UX_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=2048,
                )
                raw = response.choices[0].message.content or ""
                return _parse_ux_scores(raw, catalog)
            except RateLimitError:
                if attempt == _MAX_RETRIES - 1:
                    raise
                wait = 2 ** (attempt + 1)
                _log.warning("Rate limited, retrying in %ds", wait)
                await asyncio.sleep(wait)
        msg = "Unreachable"
        raise RuntimeError(msg)
```

- [ ] **Step 7: Run full backend tests**

Run: `cd backend && uv run pytest -v`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/app/ports/llm.py backend/src/app/domain/agent.py backend/src/app/adapters/llm/provider.py backend/tests/test_agent_ux.py
git commit -m "feat(domain): add assemble_ux_state with UX-aware LLM prompt"
```

---

## Task 5: Wire UX Events into Stream Routes

**Files:**
- Modify: `backend/src/app/adapters/api/stream_route.py`
- Modify: `backend/src/app/adapters/api/command_route.py`

- [ ] **Step 1: Write failing test for UX snapshot in stream**

Add `backend/tests/test_stream_ux.py`:

```python
"""Tests for UX protocol SSE stream."""

import json

from starlette.testclient import TestClient

from app.main import app


class TestStreamUX:
    def test_stream_returns_ux_snapshot(self) -> None:
        client = TestClient(app)
        response = client.get("/api/agent/stream")
        events = response.text.strip().split("\n\n")
        first = json.loads(events[0].removeprefix("data: "))
        assert first["type"] == "STATE_SNAPSHOT"
        assert "ux" in first["snapshot"]
        assert "tempo" in first["snapshot"]["ux"]
        assert "agency" in first["snapshot"]["ux"]
        items = first["snapshot"]["items"]
        assert len(items) == 13
        assert "salience" in items[0]
        assert "group" in items[0]
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && uv run pytest tests/test_stream_ux.py -v`
Expected: FAIL — snapshot has old `manifest` shape, no `ux` key

- [ ] **Step 3: Update stream_route to use UX events**

In `backend/src/app/adapters/api/stream_route.py`, update the generator to use `ux_snapshot_event` and `assemble_ux_state`:

Replace the import of `state_snapshot_event`, `state_delta_event` with `ux_snapshot_event`, `ux_salience_event`. Replace `content_to_manifest` with `content_to_ux_state`. Replace `assemble_manifest` with `assemble_ux_state`. The snapshot event sends full UXState. The delta event sends salience changes.

Keep the old routes working by using the new UX formatters for the same endpoint paths.

- [ ] **Step 4: Update command_route similarly**

Same changes as stream_route — use `assemble_ux_state` and `ux_snapshot_event`.

- [ ] **Step 5: Run new + old tests**

Run: `cd backend && uv run pytest -v`
Expected: New UX tests PASS. Some old tests may need updating (they check for old `manifest` shape). Update them to check for `ux` + `items` shape.

- [ ] **Step 6: Update existing stream tests for new shape**

Update `test_stream.py`, `test_stream_with_content.py`, `test_stream_delta.py`, `test_transparency_stream.py` to expect the new snapshot shape (`snapshot.ux` + `snapshot.items` instead of `snapshot.manifest.items`). Update field checks from `importance` to `salience`.

- [ ] **Step 7: Run full backend suite**

Run: `cd backend && uv run pytest -v`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/app/adapters/api/stream_route.py backend/src/app/adapters/api/command_route.py backend/tests/
git commit -m "feat(api): wire UX protocol events into SSE stream routes"
```

---

## Task 6: Frontend UX Store

**Files:**
- Create: `frontend/src/store/ux-store.ts`
- Test: `frontend/src/__tests__/ux-store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { afterEach, describe, expect, it } from "vitest";
import { useUXStore, peakSalienceGroup } from "../store/ux-store";

afterEach(() => {
  useUXStore.setState({
    ux: { tempo: 0.5, agency: 0.5 },
    items: [],
  });
});

describe("useUXStore", () => {
  it("initializes with default globals", () => {
    const state = useUXStore.getState();
    expect(state.ux.tempo).toBe(0.5);
    expect(state.ux.agency).toBe(0.5);
    expect(state.items).toEqual([]);
  });

  it("setSnapshot replaces full state", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.3, agency: 0.7 },
      items: [
        { id: "hero", salience: 0.95, group: "identity", molecule: "hero", data: { name: "F" } },
      ],
    });
    const state = useUXStore.getState();
    expect(state.ux.tempo).toBe(0.3);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].salience).toBe(0.95);
  });

  it("applySalience updates item salience", () => {
    useUXStore.getState().setSnapshot({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        { id: "hero", salience: 0.95, group: "identity", molecule: "hero", data: {} },
        { id: "contact", salience: 0.6, group: "background", molecule: "contact", data: {} },
      ],
    });
    useUXStore.getState().applySalience([{ id: "contact", salience: 0.85 }]);
    const contact = useUXStore.getState().items.find((i) => i.id === "contact");
    expect(contact?.salience).toBe(0.85);
  });

  it("setTempo updates tempo", () => {
    useUXStore.getState().setTempo(0.8);
    expect(useUXStore.getState().ux.tempo).toBe(0.8);
  });

  it("setAgency updates agency", () => {
    useUXStore.getState().setAgency(0.3);
    expect(useUXStore.getState().ux.agency).toBe(0.3);
  });
});

describe("peakSalienceGroup", () => {
  it("returns group with highest salience item", () => {
    useUXStore.setState({
      ux: { tempo: 0.5, agency: 0.5 },
      items: [
        { id: "hero", salience: 0.95, group: "identity", molecule: "hero", data: {} },
        { id: "project", salience: 0.85, group: "work", molecule: "project", data: {} },
      ],
    });
    expect(peakSalienceGroup(useUXStore.getState())).toBe("identity");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && pnpm test -- src/__tests__/ux-store.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ux-store**

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
}

export interface SalienceUpdate {
  id: string;
  salience: number;
}

interface UXState {
  ux: UXGlobals;
  items: UXItem[];
  setSnapshot: (snapshot: { ux: UXGlobals; items: UXItem[] }) => void;
  applySalience: (updates: SalienceUpdate[]) => void;
  setTempo: (tempo: number) => void;
  setAgency: (agency: number) => void;
}

export const useUXStore = create<UXState>((set) => ({
  ux: { tempo: 0.5, agency: 0.5 },
  items: [],
  setSnapshot: (snapshot) => set({ ux: snapshot.ux, items: snapshot.items }),
  applySalience: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.salience]));
      return {
        items: state.items.map((item) => {
          const newSalience = updateMap.get(item.id);
          return newSalience !== undefined ? { ...item, salience: newSalience } : item;
        }),
      };
    }),
  setTempo: (tempo) => set((state) => ({ ux: { ...state.ux, tempo } })),
  setAgency: (agency) => set((state) => ({ ux: { ...state.ux, agency } })),
}));

export function peakSalienceGroup(state: UXState): string | undefined {
  if (state.items.length === 0) return undefined;
  const peak = state.items.reduce((best, item) =>
    item.salience > best.salience ? item : best,
  );
  return peak.group;
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && pnpm test -- src/__tests__/ux-store.test.ts`
Expected: All 6 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/ux-store.ts frontend/src/__tests__/ux-store.test.ts
git commit -m "feat(frontend): add UX protocol Zustand store"
```

---

## Task 7: Frontend UX Event Parsers

**Files:**
- Create: `frontend/src/hooks/ux-parsers.ts`
- Test: `frontend/src/__tests__/ux-parsers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, expect, it } from "vitest";
import {
  isUXSnapshot,
  isUXSalience,
  isUXTempo,
  isUXAgency,
} from "../hooks/ux-parsers";

describe("isUXSnapshot", () => {
  it("matches valid snapshot", () => {
    const data = {
      type: "STATE_SNAPSHOT",
      snapshot: { ux: { tempo: 0.5, agency: 0.5 }, items: [] },
    };
    expect(isUXSnapshot(data)).toBe(true);
  });

  it("rejects old manifest snapshot", () => {
    const data = {
      type: "STATE_SNAPSHOT",
      snapshot: { manifest: { items: [] } },
    };
    expect(isUXSnapshot(data)).toBe(false);
  });
});

describe("isUXSalience", () => {
  it("matches salience event", () => {
    const data = {
      type: "CUSTOM",
      custom: { eventType: "ux:salience", items: [{ id: "hero", salience: 0.9 }] },
    };
    expect(isUXSalience(data)).toBe(true);
  });

  it("rejects decision event", () => {
    const data = {
      type: "CUSTOM",
      custom: { eventType: "DECISION" },
    };
    expect(isUXSalience(data)).toBe(false);
  });
});

describe("isUXTempo", () => {
  it("matches tempo event", () => {
    const data = { type: "CUSTOM", custom: { eventType: "ux:tempo", value: 0.7 } };
    expect(isUXTempo(data)).toBe(true);
  });
});

describe("isUXAgency", () => {
  it("matches agency event", () => {
    const data = { type: "CUSTOM", custom: { eventType: "ux:agency", value: 0.8 } };
    expect(isUXAgency(data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && pnpm test -- src/__tests__/ux-parsers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement parsers**

```typescript
/**
 * Type guards for UX protocol SSE events (AG-UI adapter).
 */
import type { UXGlobals, UXItem, SalienceUpdate } from "../store/ux-store";

export interface UXSnapshotEvent {
  type: "STATE_SNAPSHOT";
  snapshot: {
    ux: UXGlobals;
    items: UXItem[];
  };
}

export interface UXSalienceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:salience";
    items: SalienceUpdate[];
  };
}

export interface UXTempoEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:tempo";
    value: number;
  };
}

export interface UXAgencyEvent {
  type: "CUSTOM";
  custom: {
    eventType: "ux:agency";
    value: number;
  };
}

function hasCustomEventType(data: unknown, eventType: string): boolean {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  const obj = data as Record<string, unknown>;
  if (obj.type !== "CUSTOM" || typeof obj.custom !== "object" || obj.custom === null) return false;
  return (obj.custom as Record<string, unknown>).eventType === eventType;
}

export function isUXSnapshot(data: unknown): data is UXSnapshotEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  const obj = data as Record<string, unknown>;
  if (obj.type !== "STATE_SNAPSHOT") return false;
  const snapshot = obj.snapshot as Record<string, unknown> | undefined;
  return snapshot !== undefined && "ux" in snapshot && "items" in snapshot;
}

export function isUXSalience(data: unknown): data is UXSalienceEvent {
  return hasCustomEventType(data, "ux:salience");
}

export function isUXTempo(data: unknown): data is UXTempoEvent {
  return hasCustomEventType(data, "ux:tempo");
}

export function isUXAgency(data: unknown): data is UXAgencyEvent {
  return hasCustomEventType(data, "ux:agency");
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && pnpm test -- src/__tests__/ux-parsers.test.ts`
Expected: All 5 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/ux-parsers.ts frontend/src/__tests__/ux-parsers.test.ts
git commit -m "feat(frontend): add UX protocol event parsers"
```

---

## Task 8: Wire Frontend Stream Hook to UX Store

**Files:**
- Modify: `frontend/src/hooks/use-agent-stream.ts`
- Modify: `frontend/src/components/canvas/Canvas.tsx`

- [ ] **Step 1: Update use-agent-stream to consume UX events**

Replace `frontend/src/hooks/use-agent-stream.ts`:

```typescript
import { useEffect } from "react";
import { useUXStore } from "../store/ux-store";
import { isUXSnapshot, isUXSalience, isUXTempo, isUXAgency } from "./ux-parsers";

export function useAgentStream(url = "/api/agent/stream") {
  const setSnapshot = useUXStore((s) => s.setSnapshot);
  const applySalience = useUXStore((s) => s.applySalience);
  const setTempo = useUXStore((s) => s.setTempo);
  const setAgency = useUXStore((s) => s.setAgency);

  useEffect(() => {
    const source = new EventSource(url);

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (isUXSnapshot(data)) {
          setSnapshot(data.snapshot);
        } else if (isUXSalience(data)) {
          applySalience(data.custom.items);
        } else if (isUXTempo(data)) {
          setTempo(data.custom.value);
        } else if (isUXAgency(data)) {
          setAgency(data.custom.value);
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [url, setSnapshot, applySalience, setTempo, setAgency]);
}
```

- [ ] **Step 2: Update Canvas for basic UX interpretation**

In `frontend/src/components/canvas/Canvas.tsx`, change the import from `useManifestStore` to `useUXStore`. Map items using `salience` instead of `importance`, and group items by `group` instead of hardcoded thresholds. For the walking skeleton, render a simple list grouped by group with opacity derived from salience:

```typescript
import { useUXStore } from "../../store/ux-store";
import type { UXItem } from "../../store/ux-store";
import { useAgentStream } from "../../hooks/use-agent-stream";
import { MoleculeResolver } from "../molecules/MoleculeResolver";

export function Canvas() {
  useAgentStream();
  const items = useUXStore((s) => s.items);

  const groups = new Map<string, UXItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {[...groups.entries()].map(([group, groupItems]) => (
        <section key={group} data-zone={group} className="mb-8">
          {groupItems.map((item) => (
            <div
              key={item.id}
              style={{ opacity: item.salience }}
              className="transition-opacity duration-500 ease-out mb-4"
            >
              <MoleculeResolver molecule={item.molecule} data={item.data} />
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Run full frontend tests**

Run: `cd frontend && pnpm test`
Expected: Some existing tests may fail due to old store imports. Update them to use the new UX store or skip deprecated tests.

- [ ] **Step 4: Run typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-agent-stream.ts frontend/src/components/canvas/Canvas.tsx
git commit -m "feat(frontend): wire UX protocol stream to canvas rendering"
```

---

## Task 9: End-to-End Verification

- [ ] **Step 1: Run full backend tests**

Run: `cd backend && uv run pytest -v`
Expected: All PASS

- [ ] **Step 2: Run full frontend tests**

Run: `cd frontend && pnpm test`
Expected: All PASS

- [ ] **Step 3: Run both dev servers and verify SSE**

Run: `make dev` (or `cd backend && uv run uvicorn app.main:app --port 8000` + `cd frontend && pnpm dev`)

In another terminal: `curl -N http://127.0.0.1:8000/api/agent/stream`

Expected: First event is `STATE_SNAPSHOT` with `snapshot.ux.tempo`, `snapshot.ux.agency`, and `snapshot.items[].salience` + `snapshot.items[].group`.

- [ ] **Step 4: Verify frontend renders**

Open `http://localhost:5173` in browser. Items should render grouped by group, with opacity proportional to salience. The walking skeleton is visually basic — The Surface scope will add the Iron-Gall Ink design language.

- [ ] **Step 5: Run lint**

Run: `make lint`
Expected: No errors from ruff or biome

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete UX protocol layer — four dimensions flowing end-to-end"
```

---

## Verification Summary

| Check | Command | Expected |
|-------|---------|----------|
| Backend unit tests | `cd backend && uv run pytest -v` | All PASS |
| Frontend unit tests | `cd frontend && pnpm test` | All PASS |
| TypeScript strict | `cd frontend && pnpm typecheck` | No errors |
| Lint | `make lint` | Clean |
| SSE shape | `curl -N http://127.0.0.1:8000/api/agent/stream` | `STATE_SNAPSHOT` with `ux` + `items[].salience` + `items[].group` |
| Browser render | `http://localhost:5173` | Items grouped, opacity from salience |
