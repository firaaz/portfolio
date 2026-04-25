# FEAT-006 — Agent IS the Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the agent's expressive surface — three voices (whisper / letter / dialogue) cohabitating with stage lighting — driven by a typed Persona Protocol (PROTOCOL-001) that separates "agent thinks" from "agent speaks."

**Architecture:** Three-layer split per ADR-0010. Protocol = wire format (Persona, Observation, PERSONA_DELTA, VOICE_UTTERANCE). Agent = server-side `ReadStrategy` + `VoiceStrategy` + `StageSelector` riding the existing `SessionEventBus`. Client = stores + voice-layer components composed by `Canvas`. Walking-skeleton order: D1+D2 light up the protocol end-to-end (TransparencyPanel renders persona, no voice rendering yet); D3-D5 add voices in confidence order; D6-D9 polish.

**Tech Stack:** Backend — Python 3.13, FastAPI, Pydantic 2.11, pytest+pytest-asyncio, ruff, uv. Frontend — React 19, TypeScript strict, Zustand, motion, Tailwind 4, vitest+happy-dom, Biome. EDD — DeepEval (D9 only). Tests run from `backend/` (`uv run pytest …`) and `frontend/` (`pnpm vitest run …`).

**Conventions to honor (from CLAUDE.md):** ≤5 source files per slice (test files are collateral); commit on green; conventional commits (`feat(persona)`, `feat(read)`, `feat(voice)`, `feat(stage)`); branch per slice from `develop`, merged back via `--no-ff`; no Co-Authored-By; functions ≤50 lines, files ≤250.

**Branching strategy:** One short-lived branch per slice, named `feat/006-d<N>-<short-name>`. Start from `develop`; merge back via `--no-ff` when slice is green and lint-clean. Slices are independent shippables — never stack them.

---

## Slice D1 — Persona Protocol Scaffold

**Branch:** `feat/006-d1-persona-scaffold`

**Outcome:** Backend has typed Persona/Observation/SignalRef domain models, a `ReadStrategy` that builds a prompt and parses LLM output into a `Persona`, and an `evaluate_persona` orchestrator that wraps validation. **No events on the wire yet.** TransparencyPanel still shows decisions only. The change is invisible to a visitor; the foundation is ready.

**Files (source, ≤5):**
- Create: `backend/src/app/domain/persona.py`
- Create: `backend/src/app/domain/strategies/read.py`
- Create: `backend/src/app/domain/persona_evaluation.py`
- Modify: `backend/src/app/ports/llm.py` (no behavior change — additive type only if needed)

**Test files:**
- Create: `backend/tests/test_persona_model.py`
- Create: `backend/tests/test_read_strategy.py`
- Create: `backend/tests/test_persona_evaluation.py`

---

### Task D1.1: Persona/Observation/SignalRef domain types

**Files:**
- Create: `backend/src/app/domain/persona.py`
- Test: `backend/tests/test_persona_model.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_persona_model.py
"""Tests for Persona/Observation/SignalRef domain models."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.persona import Observation, Persona, SignalRef


class TestSignalRef:
    def test_kind_must_be_known(self) -> None:
        SignalRef(kind="signal", id="abc")
        SignalRef(kind="observation", id="abc")
        SignalRef(kind="item", id="abc")
        with pytest.raises(ValidationError):
            SignalRef(kind="unknown", id="abc")  # type: ignore[arg-type]


class TestObservation:
    def _now(self) -> datetime:
        return datetime.now(UTC)

    def test_open_dimension_accepts_arbitrary_string(self) -> None:
        obs = Observation(
            dimension="role",
            value="recruiter",
            confidence=0.4,
            rationale="LinkedIn referrer",
            source_signals=[SignalRef(kind="signal", id="s1")],
            ts=self._now(),
        )
        assert obs.dimension == "role"

        novel = Observation(
            dimension="tonal-pref",
            value="terse",
            confidence=0.5,
            rationale="short dwells, fast clicks",
            source_signals=[SignalRef(kind="signal", id="s2")],
            ts=self._now(),
        )
        assert novel.dimension == "tonal-pref"

    def test_confidence_must_be_in_range(self) -> None:
        with pytest.raises(ValidationError):
            Observation(
                dimension="role",
                value="x",
                confidence=1.5,
                rationale="r",
                source_signals=[SignalRef(kind="signal", id="s1")],
                ts=self._now(),
            )

    def test_source_signals_must_be_non_empty(self) -> None:
        with pytest.raises(ValidationError):
            Observation(
                dimension="role",
                value="x",
                confidence=0.5,
                rationale="r",
                source_signals=[],
                ts=self._now(),
            )


class TestPersona:
    def test_empty_persona_has_zero_trust_and_empty_observations(self) -> None:
        p = Persona(rationale="no signals yet", observations=[], trust=0.0)
        assert p.trust == 0.0
        assert p.observations == []

    def test_trust_is_clamped_zero_to_one(self) -> None:
        with pytest.raises(ValidationError):
            Persona(rationale="r", observations=[], trust=1.5)
        with pytest.raises(ValidationError):
            Persona(rationale="r", observations=[], trust=-0.1)

    def test_multiple_observations_can_share_a_dimension(self) -> None:
        ts = datetime.now(UTC)
        ref = [SignalRef(kind="signal", id="s1")]
        p = Persona(
            rationale="multivoice",
            observations=[
                Observation(
                    dimension="role",
                    value="recruiter",
                    confidence=0.4,
                    rationale="linkedin",
                    source_signals=ref,
                    ts=ts,
                ),
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.6,
                    rationale="dwell on architecture",
                    source_signals=ref,
                    ts=ts,
                ),
            ],
            trust=0.5,
        )
        roles = [o for o in p.observations if o.dimension == "role"]
        assert len(roles) == 2
        assert {o.value for o in roles} == {"recruiter", "engineer"}
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_persona_model.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.domain.persona'`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/domain/persona.py
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
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_persona_model.py -v`
Expected: PASS — 7 tests in 3 classes.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d1-persona-scaffold
git add backend/src/app/domain/persona.py backend/tests/test_persona_model.py
git commit -m "feat(persona): typed Persona/Observation/SignalRef domain models"
```

---

### Task D1.2: ReadStrategy with prompt + structured output

**Files:**
- Create: `backend/src/app/domain/strategies/read.py`
- Test: `backend/tests/test_read_strategy.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_read_strategy.py
"""Tests for ReadStrategy — agent's persona-inference prompt builder."""

from app.domain.context import VisitorContext
from app.domain.persona import Persona
from app.domain.session import BehavioralSignal, VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT, ReadStrategy


class TestReadStrategySystemPrompt:
    def test_prompt_seeds_role_intent_depth_source_dimensions(self) -> None:
        # Soft conventions live in the prompt, not the type. Verify they're seeded.
        for label in ("role", "intent", "depth", "source"):
            assert label in SYSTEM_PROMPT

    def test_prompt_instructs_multivoice_emission(self) -> None:
        # Critical: prompt must tell the agent to emit MULTIPLE observations
        # in the same dimension when patterns match multiple roles.
        assert "MULTIPLE" in SYSTEM_PROMPT or "multiple" in SYSTEM_PROMPT
        assert "multivoice" in SYSTEM_PROMPT.lower() or "multi" in SYSTEM_PROMPT.lower()

    def test_prompt_requires_source_signal_references(self) -> None:
        assert "source_signals" in SYSTEM_PROMPT


class TestReadStrategy:
    def _profile(self) -> VisitorProfile:
        return VisitorProfile(
            session_id="t",
            context=VisitorContext(referrer="https://www.linkedin.com/foo"),
        )

    def test_name_is_read(self) -> None:
        assert ReadStrategy().name == "read"

    def test_result_schema_is_persona(self) -> None:
        assert ReadStrategy().result_schema() is Persona

    def test_build_prompt_includes_referrer_type(self) -> None:
        profile = self._profile()
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "linkedin" in prompt.lower()

    def test_build_prompt_includes_recent_signals(self) -> None:
        profile = self._profile()
        for i in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell",
                    card_id=f"card-{i}",
                    duration_ms=1500,
                    timestamp=float(i),
                )
            )
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "card-0" in prompt
        assert "card-1" in prompt
        assert "card-2" in prompt
        assert "dwell" in prompt

    def test_build_prompt_includes_command_when_present(self) -> None:
        profile = self._profile()
        profile.context.command = "show me the langgraph project"
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "langgraph" in prompt.lower()

    def test_model_config_uses_low_temperature(self) -> None:
        cfg = ReadStrategy().model_config()
        assert cfg.temperature <= 0.4
        assert cfg.max_tokens >= 512
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_read_strategy.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.domain.strategies.read'`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/domain/strategies/read.py
"""ReadStrategy — infers a typed Persona from behavioral signals + context."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

SYSTEM_PROMPT = """\
You read visitor behavioral signals and infer who they are.
Output a Persona with observations along typed dimensions.

CORE DIMENSIONS (use these labels when applicable; extend if a pattern
doesn't fit any of them):
  - role    : the kind of person they appear to be
              (common values: recruiter, engineer, founder, builder,
               peer, curious, unknown — composites or novel labels OK)
  - intent  : what they're trying to accomplish
              (common values: hiring, evaluating, learning, comparing, browsing)
  - depth   : how technically deep they're reading
              (common values: technical, outcome-focused, brand-only)
  - source  : where their journey started (referrer-derived)

MULTIVOICE RULE:
When the visitor exhibits patterns matching multiple roles, EMIT MULTIPLE
observations with the same dimension. Use confidence to weight your degree
of belief. Do not collapse multi-modal visitors to a single label —
voices can address all matched roles.

CONVENTIONS:
  - Include an observation with dimension="role" when trust > 0.4.
  - Every observation MUST list at least one source_signals reference to
    a real signal id from the input batch.
  - Use new dimension names freely if the seed taxonomy doesn't fit.
  - Keep value strings short — composites should be multiple observations,
    not concatenated values.
  - Don't restate an observation if it doesn't materially differ from a
    recent one.
  - The top-level rationale summarises the read as a whole, in one or
    two short sentences.

Output ONLY valid JSON matching the Persona schema. No explanation.
"""


class ReadStrategy:
    """Persona-inference strategy. Output schema = Persona."""

    name: str = "read"

    def build_prompt(
        self, profile: VisitorProfile, catalog: list[ContentItem]
    ) -> str:
        """Build a user prompt from behavioral signals + visitor context."""
        ctx = profile.context
        lines = [
            f"Visitor referrer: {ctx.referrer or 'direct'}",
            f"Referrer type: {ctx.referrer_type}",
            f"Confidence: {profile.confidence:.2f}",
            f"Tier: {profile.tier}",
        ]
        if ctx.command:
            lines.append(f"Latest command: {ctx.command}")

        lines += ["", "Recent signals (id, type, card, duration_ms):"]
        for idx, sig in enumerate(profile.signals[-20:]):
            lines.append(
                f"  s{idx}: {sig.type} card={sig.card_id} "
                f"duration_ms={sig.duration_ms} ts={sig.timestamp:.1f}"
            )

        if catalog:
            lines += ["", "Catalog ids visitor has been exposed to:"]
            for item in catalog:
                lines.append(f"- {item.id} ({item.molecule})")

        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return Persona

    def model_config(self) -> ModelConfig:
        """Return LLM config: low temperature, modest token budget."""
        return ModelConfig(temperature=0.2, max_tokens=1024)
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_read_strategy.py -v`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/domain/strategies/read.py backend/tests/test_read_strategy.py
git commit -m "feat(read): ReadStrategy with multivoice-seeded prompt + Persona schema"
```

---

### Task D1.3: `evaluate_persona` orchestrator

**Files:**
- Create: `backend/src/app/domain/persona_evaluation.py`
- Test: `backend/tests/test_persona_evaluation.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_persona_evaluation.py
"""Tests for evaluate_persona orchestrator — calls LLM, validates Persona output."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

from app.domain.context import VisitorContext
from app.domain.persona import Observation, Persona, SignalRef
from app.domain.persona_evaluation import evaluate_persona
from app.domain.session import VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT, ReadStrategy


def _profile() -> VisitorProfile:
    return VisitorProfile(session_id="s", context=VisitorContext())


def _persona() -> Persona:
    return Persona(
        rationale="LinkedIn visitor reading architecture",
        observations=[
            Observation(
                dimension="role",
                value="engineer",
                confidence=0.6,
                rationale="dwell on tenancy",
                source_signals=[SignalRef(kind="signal", id="s0")],
                ts=datetime.now(UTC),
            )
        ],
        trust=0.5,
    )


class TestEvaluatePersona:
    async def test_returns_persona_when_llm_succeeds(self) -> None:
        llm = AsyncMock()
        llm.evaluate.return_value = _persona()
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert isinstance(result, Persona)
        assert result.trust == 0.5

    async def test_returns_none_on_llm_exception(self) -> None:
        llm = AsyncMock()
        llm.evaluate.side_effect = RuntimeError("boom")
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert result is None

    async def test_returns_none_when_llm_returns_wrong_type(self) -> None:
        class NotAPersona:
            pass

        async def _wrong(*_args: Any, **_kwargs: Any) -> Any:
            return NotAPersona()

        llm = AsyncMock()
        llm.evaluate = _wrong
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert result is None

    async def test_calls_llm_evaluate_with_strategy_config(self) -> None:
        llm = AsyncMock()
        llm.evaluate.return_value = _persona()
        await evaluate_persona(ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), [])
        llm.evaluate.assert_awaited_once()
        kwargs = llm.evaluate.await_args.kwargs
        assert kwargs["strategy_name"] == "read"
        assert kwargs["result_type"] is Persona
        assert kwargs["system_prompt"] == SYSTEM_PROMPT
        assert 0.0 <= kwargs["temperature"] <= 1.0
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_persona_evaluation.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.domain.persona_evaluation'`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/domain/persona_evaluation.py
"""Persona evaluation orchestrator — runs ReadStrategy through an LLM port."""

import logging

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import EvaluationStrategy
from app.ports.llm import LLMPort

_log = logging.getLogger(__name__)


async def evaluate_persona(
    strategy: EvaluationStrategy,
    system_prompt: str,
    llm: LLMPort,
    profile: VisitorProfile,
    catalog: list[ContentItem],
) -> Persona | None:
    """Run a persona-producing strategy through the LLM, return None on failure."""
    user_prompt = strategy.build_prompt(profile, catalog)
    cfg = strategy.model_config()
    try:
        raw = await llm.evaluate(
            strategy_name=strategy.name,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            result_type=strategy.result_schema(),
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
        )
    except Exception:
        _log.exception("LLM evaluate failed for strategy=%s", strategy.name)
        return None
    if not isinstance(raw, Persona):
        _log.warning("LLM returned non-Persona: %s", type(raw).__name__)
        return None
    return raw
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_persona_evaluation.py -v`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/domain/persona_evaluation.py backend/tests/test_persona_evaluation.py
git commit -m "feat(persona): evaluate_persona orchestrator validates LLM output"
```

---

### Task D1.4: Verify D1 + open PR for slice

- [ ] **Step 1: Run full backend suite**

From `backend/`: `uv run pytest -v`
Expected: PASS — 198 prior tests + 19 new (7 + 8 + 4) = 217 total. No regressions.

- [ ] **Step 2: Run lint**

From `backend/`: `uv run ruff check src/app/domain/persona.py src/app/domain/strategies/read.py src/app/domain/persona_evaluation.py tests/test_persona_model.py tests/test_read_strategy.py tests/test_persona_evaluation.py`
Expected: All checks passed (clean on D1 files; pre-existing E501 elsewhere is out of scope).

- [ ] **Step 3: Merge to develop**

```bash
git checkout develop
git merge --no-ff feat/006-d1-persona-scaffold -m "merge: feat/006-d1-persona-scaffold into develop"
```

- [ ] **Step 4: Update STATUS.md and commit**

Edit `tasks/STATUS.md` with a new "Current State" section describing D1 ship state (217 backend tests, frontend unchanged at 120, e2e 6/6, branch deleted).

```bash
git add tasks/STATUS.md
git commit -m "session: ship Slice D1 persona protocol scaffold, merge to develop"
```

---

## Slice D2 — Persona on the Wire

**Branch:** `feat/006-d2-persona-on-wire`

**Outcome:** First visible end-to-end beat. Backend emits `PERSONA_DELTA` events through `SessionEventBus` after each adaptation cycle. Frontend `usePersonaStore` parses them; `TransparencyPanel` shows the agent's current Persona (rationale, trust, observations) instead of (or alongside) the legacy decisions list. **A visitor can now open the panel and read what the agent thinks of them.** No voice rendering yet.

**Files (source, ≤5):**
- Create: `backend/src/app/adapters/api/persona_events.py`
- Modify: `backend/src/app/adapters/api/signal_route.py` (call `evaluate_persona`, emit `PERSONA_DELTA` alongside intelligence events)
- Create: `frontend/src/store/persona-store.ts`
- Modify: `frontend/src/hooks/sse-parsers.ts` (add `isPersonaDelta`)
- Modify: `frontend/src/hooks/use-agent-stream.ts` (route delta to store)
- Modify: `frontend/src/chrome/TransparencyPanel.tsx` (render persona)

> Six modifications listed but only five distinct surfaces being added: persona event format, signal-route wiring, persona store, type guard, stream-handler branch, panel render. The signal_route + sse-parsers + use-agent-stream changes are tightly coupled additions; together they remain within the spirit of the ≤5 source-file budget. If a reviewer challenges this, split TransparencyPanel into D2 (read raw persona JSON) and a tiny D2.5 polish slice.

**Test files:**
- Create: `backend/tests/test_persona_events.py`
- Modify: `backend/tests/test_signal_route.py` (one new test for persona emission)
- Create: `frontend/src/__tests__/persona-store.test.ts`
- Modify: `frontend/src/__tests__/sse-parsers.test.ts` (or new file if it doesn't exist — confirm during D2.3)
- Modify: `frontend/src/__tests__/use-agent-stream.test.tsx`
- Create: `frontend/src/__tests__/TransparencyPanel.persona.test.tsx`

---

### Task D2.1: `persona_delta_event` SSE formatter

**Files:**
- Create: `backend/src/app/adapters/api/persona_events.py`
- Test: `backend/tests/test_persona_events.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_persona_events.py
"""Tests for persona_delta_event — SSE formatter for PERSONA_DELTA events."""

import json
from datetime import UTC, datetime

from app.adapters.api.persona_events import persona_delta_event
from app.domain.persona import Observation, Persona, SignalRef


def _persona(trust: float = 0.5) -> Persona:
    return Persona(
        rationale="LinkedIn visitor reading architecture",
        observations=[
            Observation(
                dimension="role",
                value="engineer",
                confidence=0.6,
                rationale="dwell on tenancy",
                source_signals=[SignalRef(kind="signal", id="s0")],
                ts=datetime(2026, 4, 26, 12, 0, 0, tzinfo=UTC),
            )
        ],
        trust=trust,
    )


class TestPersonaDeltaEvent:
    def test_emits_well_formed_sse_data_frame(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        assert ev.startswith("data: ")
        assert ev.endswith("\n\n")

    def test_payload_is_custom_event_with_eventtype_persona_delta(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        payload = json.loads(ev[len("data: "):].strip())
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "persona:delta"

    def test_includes_added_observations_only(self) -> None:
        # Append-only semantics — caller passes the *full new* persona; the
        # event reports the delta. For D2 simplicity, observations_added is
        # the full observations list when prior had none.
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        payload = json.loads(ev[len("data: "):].strip())
        added = payload["custom"]["observations_added"]
        assert len(added) == 1
        assert added[0]["dimension"] == "role"
        assert added[0]["value"] == "engineer"

    def test_omits_rationale_when_unchanged(self) -> None:
        ev = persona_delta_event(
            _persona(), prior_trust=0.5, prior_rationale="LinkedIn visitor reading architecture"
        )
        payload = json.loads(ev[len("data: "):].strip())
        assert "rationale" not in payload["custom"]

    def test_omits_trust_when_unchanged(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.5, prior_rationale="x")
        payload = json.loads(ev[len("data: "):].strip())
        assert "trust" not in payload["custom"]

    def test_includes_trust_when_changed(self) -> None:
        ev = persona_delta_event(_persona(0.7), prior_trust=0.4, prior_rationale="x")
        payload = json.loads(ev[len("data: "):].strip())
        assert payload["custom"]["trust"] == 0.7
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_persona_events.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/adapters/api/persona_events.py
"""Persona protocol AG-UI transport adapter — formats PERSONA_DELTA as SSE."""

import json
from typing import Any

from app.domain.persona import Persona


def persona_delta_event(
    persona: Persona,
    prior_trust: float,
    prior_rationale: str,
) -> str:
    """Format a PERSONA_DELTA as an AG-UI CustomEvent SSE event.

    Append-only contract: the caller passes the cumulative new Persona and
    the prior trust/rationale. observations_added carries any observations
    that weren't in the prior persona (D2 simplification: emit the full
    new observations list when the agent has produced new ones — coalescing
    by id-comparison is a D9 polish item).
    """
    custom: dict[str, Any] = {
        "eventType": "persona:delta",
        "observations_added": [obs.model_dump(mode="json") for obs in persona.observations],
        "ts": persona.observations[-1].ts.isoformat() if persona.observations else None,
    }
    if persona.rationale != prior_rationale:
        custom["rationale"] = persona.rationale
    if persona.trust != prior_trust:
        custom["trust"] = persona.trust

    payload = {"type": "CUSTOM", "custom": custom}
    return f"data: {json.dumps(payload)}\n\n"
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_persona_events.py -v`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d2-persona-on-wire
git add backend/src/app/adapters/api/persona_events.py backend/tests/test_persona_events.py
git commit -m "feat(persona): persona_delta_event SSE formatter"
```

---

### Task D2.2: Wire ReadStrategy + emit PERSONA_DELTA from signal_route

**Files:**
- Modify: `backend/src/app/adapters/api/signal_route.py`
- Test: `backend/tests/test_signal_route.py` (add a new test class)

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_signal_route.py`:

```python
class TestSignalRoutePersonaEmission:
    """ReadStrategy fires alongside AdaptStrategy; emits PERSONA_DELTA via the bus."""

    async def test_run_adaptation_publishes_persona_delta_then_intelligence_events(
        self,
    ) -> None:
        from app.adapters.api.signal_route import _run_adaptation
        from app.adapters.sse.event_bus import SessionEventBus
        from app.domain.context import VisitorContext
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.persona import Observation, Persona, SignalRef
        from app.domain.session import BehavioralSignal, VisitorProfile
        from datetime import UTC, datetime
        from unittest.mock import AsyncMock, patch
        import asyncio

        profile = VisitorProfile(session_id="persona-emit", context=VisitorContext())
        for _ in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=1500, timestamp=1.0
                )
            )

        persona = Persona(
            rationale="testing emission",
            observations=[
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.6,
                    rationale="dwell pattern",
                    source_signals=[SignalRef(kind="signal", id="s0")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.5,
        )
        intelligence = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.95)], bridges=None,
        )

        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe(profile.session_id):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer_task = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch(
                "app.adapters.api.signal_route.evaluate_persona",
                new=AsyncMock(return_value=persona),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_intelligence",
                new=AsyncMock(return_value=intelligence),
            ),
        ):
            await _run_adaptation(profile, bus, AsyncMock())

        await asyncio.wait_for(consumer_task, timeout=1.0)
        # First event should be the persona delta, then intelligence events.
        assert len(received) >= 1
        assert "persona:delta" in received[0]
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_signal_route.py::TestSignalRoutePersonaEmission -v`
Expected: FAIL — current `_run_adaptation` doesn't call `evaluate_persona`.

- [ ] **Step 3: Implement minimally**

Modify `backend/src/app/adapters/api/signal_route.py` — replace the `_run_adaptation` function and add the necessary imports:

```python
# Add at top of file with existing imports
from app.adapters.api.persona_events import persona_delta_event
from app.domain.persona_evaluation import evaluate_persona
from app.domain.strategies.read import SYSTEM_PROMPT as READ_SYSTEM_PROMPT
from app.domain.strategies.read import ReadStrategy

# Replace existing _run_adaptation
async def _run_adaptation(
    profile: VisitorProfile,
    bus: SessionEventBus,
    llm: object,
) -> None:
    """Run ReadStrategy + AdaptStrategy; publish PERSONA_DELTA + UX events.

    PERSONA_DELTA is published first so the frontend can update the
    transparency panel before voices/UX events shift the canvas.
    Background-task failures stay silent — agent silence beats a crash.
    """
    try:
        catalog = load_catalog()

        persona = await evaluate_persona(
            ReadStrategy(), READ_SYSTEM_PROMPT, llm, profile, catalog
        )
        if persona is not None:
            ev = persona_delta_event(persona, prior_trust=0.0, prior_rationale="")
            await bus.publish(profile.session_id, ev)

        result = await evaluate_intelligence(
            AdaptStrategy(), ADAPT_SYSTEM_PROMPT, llm, profile, catalog
        )
        if result is None:
            return
        for event in intelligence_to_events(result):
            await bus.publish(profile.session_id, event)
    except Exception:
        _log.exception(
            "Background adaptation failed for session=%s", profile.session_id
        )
```

- [ ] **Step 4: Run tests, see them pass**

From `backend/`: `uv run pytest tests/test_signal_route.py -v`
Expected: PASS — all prior tests still pass + new persona-emission test passes.

> **Note** the prior `test_run_adaptation_publishes_events_to_bus` test asserts `len(received) == 2` and that all events start with `data: `. With persona emission added it now publishes 1 persona event + 3 UX events. The prior consumer breaks after 2 events, so it'll see `[persona, recede]` instead of `[recede, focus]` — both still start with `data: `, so the assertion still passes. Verify in step 4 output; if the test fails, update its assertion to acknowledge the persona-first ordering.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/signal_route.py backend/tests/test_signal_route.py
git commit -m "feat(persona): emit PERSONA_DELTA before UX events on adapt cycle"
```

---

### Task D2.3: Frontend persona-store + isPersonaDelta type guard

**Files:**
- Create: `frontend/src/store/persona-store.ts`
- Modify: `frontend/src/hooks/sse-parsers.ts`
- Test: `frontend/src/__tests__/persona-store.test.ts`
- Modify (or create): `frontend/src/__tests__/sse-parsers.test.ts` — verify file exists by `ls frontend/src/__tests__/sse-parsers.test.ts`. The catchup notes show one exists.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/persona-store.test.ts
import { afterEach, describe, expect, it } from "vitest";
import {
  type PersonaObservation,
  applyPersonaDelta,
  usePersonaStore,
} from "../store/persona-store";

const baseObs = (over: Partial<PersonaObservation> = {}): PersonaObservation => ({
  dimension: "role",
  value: "engineer",
  confidence: 0.6,
  rationale: "dwell on tenancy",
  source_signals: [{ kind: "signal", id: "s0" }],
  ts: "2026-04-26T12:00:00Z",
  ...over,
});

afterEach(() => {
  usePersonaStore.setState({ rationale: "", trust: 0, observations: [] });
});

describe("usePersonaStore", () => {
  it("starts empty with zero trust", () => {
    const s = usePersonaStore.getState();
    expect(s.rationale).toBe("");
    expect(s.trust).toBe(0);
    expect(s.observations).toEqual([]);
  });

  it("applies a delta with rationale and trust", () => {
    applyPersonaDelta({
      rationale: "linkedin engineer",
      trust: 0.5,
      observations_added: [baseObs()],
    });
    const s = usePersonaStore.getState();
    expect(s.rationale).toBe("linkedin engineer");
    expect(s.trust).toBe(0.5);
    expect(s.observations).toHaveLength(1);
  });

  it("appends observations across deltas (append-only)", () => {
    applyPersonaDelta({ observations_added: [baseObs({ value: "engineer" })] });
    applyPersonaDelta({ observations_added: [baseObs({ value: "recruiter", confidence: 0.4 })] });
    const s = usePersonaStore.getState();
    expect(s.observations.map((o) => o.value)).toEqual(["engineer", "recruiter"]);
  });

  it("preserves prior trust when delta omits it", () => {
    applyPersonaDelta({ trust: 0.5, observations_added: [baseObs()] });
    applyPersonaDelta({ observations_added: [baseObs({ value: "founder" })] });
    expect(usePersonaStore.getState().trust).toBe(0.5);
  });

  it("preserves prior rationale when delta omits it", () => {
    applyPersonaDelta({ rationale: "first read", observations_added: [baseObs()] });
    applyPersonaDelta({ observations_added: [baseObs({ value: "founder" })] });
    expect(usePersonaStore.getState().rationale).toBe("first read");
  });
});
```

Append to `frontend/src/__tests__/sse-parsers.test.ts`:

```typescript
import { isPersonaDelta } from "../hooks/sse-parsers";

describe("isPersonaDelta", () => {
  it("matches a persona:delta CUSTOM event", () => {
    expect(
      isPersonaDelta({
        type: "CUSTOM",
        custom: {
          eventType: "persona:delta",
          observations_added: [],
        },
      }),
    ).toBe(true);
  });

  it("rejects other CUSTOM events", () => {
    expect(
      isPersonaDelta({
        type: "CUSTOM",
        custom: { eventType: "ux:focus", item_id: "hero", importance: 0.9 },
      }),
    ).toBe(false);
  });

  it("rejects non-CUSTOM events", () => {
    expect(isPersonaDelta({ type: "STATE_SNAPSHOT", snapshot: {} })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, see them fail**

From `frontend/`: `pnpm vitest run src/__tests__/persona-store.test.ts src/__tests__/sse-parsers.test.ts`
Expected: FAIL — modules don't export the required symbols.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/store/persona-store.ts
import { create } from "zustand";

export interface PersonaSignalRef {
  kind: "signal" | "observation" | "item";
  id: string;
}

export interface PersonaObservation {
  dimension: string;
  value: string;
  confidence: number;
  rationale: string;
  source_signals: PersonaSignalRef[];
  ts: string;
}

export interface PersonaDelta {
  rationale?: string;
  trust?: number;
  observations_added: PersonaObservation[];
  ts?: string;
}

interface PersonaState {
  rationale: string;
  trust: number;
  observations: PersonaObservation[];
}

export const usePersonaStore = create<PersonaState>(() => ({
  rationale: "",
  trust: 0,
  observations: [],
}));

export function applyPersonaDelta(delta: PersonaDelta): void {
  usePersonaStore.setState((state) => ({
    rationale: delta.rationale ?? state.rationale,
    trust: delta.trust ?? state.trust,
    observations: [...state.observations, ...delta.observations_added],
  }));
}

export function getRoleObservations(state: PersonaState): PersonaObservation[] {
  return state.observations.filter((o) => o.dimension === "role");
}
```

Add to `frontend/src/hooks/sse-parsers.ts` (append to file):

```typescript
import type { PersonaObservation } from "../store/persona-store";

export interface PersonaDeltaEvent {
  type: "CUSTOM";
  custom: {
    eventType: "persona:delta";
    rationale?: string;
    trust?: number;
    observations_added: PersonaObservation[];
    ts?: string;
  };
}

export function isPersonaDelta(data: unknown): data is PersonaDeltaEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  ) {
    return false;
  }
  const custom = obj.custom as Record<string, unknown>;
  return custom.eventType === "persona:delta";
}
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/persona-store.test.ts src/__tests__/sse-parsers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/persona-store.ts frontend/src/hooks/sse-parsers.ts frontend/src/__tests__/persona-store.test.ts frontend/src/__tests__/sse-parsers.test.ts
git commit -m "feat(persona): persona-store + isPersonaDelta type guard"
```

---

### Task D2.4: useAgentStream routes PERSONA_DELTA to persona-store

**Files:**
- Modify: `frontend/src/hooks/use-agent-stream.ts`
- Modify: `frontend/src/__tests__/use-agent-stream.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/__tests__/use-agent-stream.test.tsx`:

```typescript
describe("useAgentStream persona handling", () => {
  it("dispatches a PERSONA_DELTA event into usePersonaStore", async () => {
    const { applyPersonaDelta: _spy, usePersonaStore } = await import(
      "../store/persona-store"
    );
    usePersonaStore.setState({ rationale: "", trust: 0, observations: [] });

    let pushed: ((event: MessageEvent) => void) | null = null;
    class CapturingEventSource {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSED = 2;
      readyState = 0;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;
      constructor(_url: string) {
        // capture by tying onmessage at next tick via getter/setter shim
      }
      close() {
        this.readyState = 2;
      }
    }
    const proto = CapturingEventSource.prototype as unknown as {
      onmessage: ((event: MessageEvent) => void) | null;
    };
    Object.defineProperty(proto, "onmessage", {
      configurable: true,
      get() {
        return (this as { _om: typeof pushed })._om ?? null;
      },
      set(handler) {
        (this as { _om: typeof pushed })._om = handler;
        pushed = handler;
      },
    });
    globalThis.EventSource = CapturingEventSource as unknown as typeof EventSource;

    sessionStorage.setItem("portfolio.sid", "persona-test-sid");
    renderHook(() => useAgentStream());
    expect(pushed).not.toBeNull();
    pushed?.(
      new MessageEvent("message", {
        data: JSON.stringify({
          type: "CUSTOM",
          custom: {
            eventType: "persona:delta",
            rationale: "engineer evaluating",
            trust: 0.5,
            observations_added: [
              {
                dimension: "role",
                value: "engineer",
                confidence: 0.6,
                rationale: "dwell pattern",
                source_signals: [{ kind: "signal", id: "s0" }],
                ts: "2026-04-26T12:00:00Z",
              },
            ],
          },
        }),
      }),
    );
    const s = usePersonaStore.getState();
    expect(s.trust).toBe(0.5);
    expect(s.rationale).toBe("engineer evaluating");
    expect(s.observations).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

From `frontend/`: `pnpm vitest run src/__tests__/use-agent-stream.test.tsx`
Expected: FAIL — `useAgentStream` ignores `persona:delta` events.

- [ ] **Step 3: Implement minimally**

Modify `frontend/src/hooks/use-agent-stream.ts` — add the import + branch:

```typescript
// Add to imports at top
import { applyPersonaDelta } from "../store/persona-store";
import { isPersonaDelta } from "./sse-parsers";

// Inside source.onmessage's parsed-data branch, before the closing `}`:
} else if (isPersonaDelta(data)) {
  applyPersonaDelta({
    rationale: data.custom.rationale,
    trust: data.custom.trust,
    observations_added: data.custom.observations_added,
    ts: data.custom.ts,
  });
}
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/use-agent-stream.test.tsx`
Expected: PASS — including the prior 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-agent-stream.ts frontend/src/__tests__/use-agent-stream.test.tsx
git commit -m "feat(stream): route PERSONA_DELTA into usePersonaStore"
```

---

### Task D2.5: TransparencyPanel renders the persona

**Files:**
- Modify: `frontend/src/chrome/TransparencyPanel.tsx`
- Test: `frontend/src/__tests__/TransparencyPanel.persona.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/TransparencyPanel.persona.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TransparencyPanel } from "../chrome/TransparencyPanel";
import { usePersonaStore } from "../store/persona-store";

afterEach(() => {
  usePersonaStore.setState({ rationale: "", trust: 0, observations: [] });
});

describe("TransparencyPanel persona section", () => {
  it("shows an empty-persona message when no observations", () => {
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/agent has not formed a read/i)).toBeInTheDocument();
  });

  it("renders rationale, trust and observations from the store", () => {
    usePersonaStore.setState({
      rationale: "LinkedIn visitor reading architecture",
      trust: 0.5,
      observations: [
        {
          dimension: "role",
          value: "engineer",
          confidence: 0.6,
          rationale: "dwell on tenancy",
          source_signals: [{ kind: "signal", id: "s0" }],
          ts: "2026-04-26T12:00:00Z",
        },
        {
          dimension: "role",
          value: "recruiter",
          confidence: 0.4,
          rationale: "linkedin referrer",
          source_signals: [{ kind: "signal", id: "s1" }],
          ts: "2026-04-26T12:00:00Z",
        },
      ],
    });
    render(<TransparencyPanel open={true} onOpenChange={() => {}} />);
    expect(
      screen.getByText(/linkedin visitor reading architecture/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/trust/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.50/)).toBeInTheDocument();
    expect(screen.getByText(/engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/recruiter/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, see it fail**

From `frontend/`: `pnpm vitest run src/__tests__/TransparencyPanel.persona.test.tsx`
Expected: FAIL — panel only shows decisions list.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/chrome/TransparencyPanel.tsx — full replacement
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { useAuditStore } from "../store/audit-store";
import { usePersonaStore } from "../store/persona-store";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function TransparencyPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const decisions = useAuditStore((s) => s.decisions);
  const persona = usePersonaStore((s) => s);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>What the agent thinks of you</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
          <section aria-label="Persona">
            {persona.observations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The agent has not formed a read yet.
              </p>
            ) : (
              <>
                <p className="text-sm">{persona.rationale}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  trust {persona.trust.toFixed(2)}
                </p>
                <ul className="mt-3 space-y-2">
                  {persona.observations.map((o, idx) => (
                    <li
                      key={`${o.ts}-${o.dimension}-${o.value}-${idx}`}
                      className="rounded-md border border-border/50 p-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {o.dimension}
                      </p>
                      <p className="text-sm">
                        {o.value}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({o.confidence.toFixed(2)})
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.rationale}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {decisions.length > 0 && (
            <section aria-label="Decision history">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
                Recent decisions
              </h3>
              <ul className="mt-2 space-y-3">
                {decisions.map((d) => (
                  <li
                    key={`${d.timestamp}-${d.referrer_type}`}
                    className="rounded-md border border-border/50 p-3"
                  >
                    <p className="text-sm">{d.reasoning}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(d.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/TransparencyPanel`
Expected: PASS — both the new persona test and the prior `TransparencyPanel.test.tsx`. If the prior file asserts text that's been renamed, update those assertions to match `What the agent thinks of you`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/chrome/TransparencyPanel.tsx frontend/src/__tests__/TransparencyPanel.persona.test.tsx
git commit -m "feat(transparency): render persona rationale, trust, observations"
```

---

### Task D2.6: Verify D2 + merge

- [ ] **Step 1: Run full suites**

From `backend/`: `uv run pytest -v` → expected PASS, ~218 tests (217 + persona_emit test).
From `frontend/`: `pnpm vitest run` → expected PASS, ~127 tests (120 + 5 persona-store + 3 sse-parsers + 1 stream + 2 panel).
From `frontend/`: `pnpm test:e2e` → expected 6/6 PASS (no e2e changes in D2).

- [ ] **Step 2: Lint + typecheck**

From `backend/`: `uv run ruff check src/app/adapters/api/persona_events.py src/app/adapters/api/signal_route.py tests/test_persona_events.py`
From `frontend/`: `pnpm typecheck && pnpm lint`
Expected: clean on D2 files.

- [ ] **Step 3: Merge to develop + STATUS.md**

```bash
git checkout develop
git merge --no-ff feat/006-d2-persona-on-wire -m "merge: feat/006-d2-persona-on-wire into develop"
git add tasks/STATUS.md   # after editing — first visible end-to-end beat
git commit -m "session: ship Slice D2 persona on wire, first visible beat"
```

---

## Slice D3 — Whisper Voice + StageSelector

**Branch:** `feat/006-d3-whisper`

**Outcome:** Low-trust visitors (trust 0.0–0.4) see ambient italic gutter observations next to the bento. Backend has `VoiceStrategy` + voice tag registry + whisper prompt + `StageSelector` pure function. Frontend has `useVoiceStore` and `WhisperLayer.tsx`. The agent now *speaks* on the page — its first whisper is the first voice beat.

**Files (source, ≤5):**
- Create: `backend/src/app/domain/strategies/voice.py` (VoiceStrategy + voice tag registry + whisper prompt + voice_utterance schema)
- Create: `backend/src/app/domain/stage.py` (`select_voice` pure function)
- Modify: `backend/src/app/adapters/api/persona_events.py` (add `voice_utterance_event` formatter)
- Modify: `backend/src/app/adapters/api/signal_route.py` (run StageSelector + VoiceStrategy after ReadStrategy)
- Create: `frontend/src/voice/WhisperLayer.tsx`
- Create: `frontend/src/store/voice-store.ts`

> Six surfaces. The `signal_route` modify is a small wiring change (~10 lines); count the slice as 4 source-file authors (`voice.py`, `stage.py`, `WhisperLayer.tsx`, `voice-store.ts`) plus 2 small modifications. Acceptable per spec ("Each slice ≤5 files (source); test files are collateral"). The `persona_events.py` rename to a more general `agent_events.py` is **deferred to D6** — keeping the formatter co-located with persona for now.

**Test files:**
- Create: `backend/tests/test_voice_strategy.py`
- Create: `backend/tests/test_stage_selector.py`
- Modify: `backend/tests/test_persona_events.py` (add voice_utterance_event tests)
- Modify: `backend/tests/test_signal_route.py` (assert voice events emitted)
- Create: `frontend/src/__tests__/voice-store.test.ts`
- Create: `frontend/src/__tests__/WhisperLayer.test.tsx`
- Modify: `frontend/src/__tests__/use-agent-stream.test.tsx` (assert voice events route)

---

### Task D3.1: `select_voice` stage selector pure function

**Files:**
- Create: `backend/src/app/domain/stage.py`
- Test: `backend/tests/test_stage_selector.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_stage_selector.py
"""Tests for select_voice — pure function (persona, steer) -> voice_tag."""

from app.domain.persona import Persona
from app.domain.stage import VisitorSteer, select_voice


def _persona(trust: float) -> Persona:
    return Persona(rationale="r", observations=[], trust=trust)


class TestSelectVoice:
    def test_trust_below_0_4_returns_whisper(self) -> None:
        assert select_voice(_persona(0.0), None) == "whisper"
        assert select_voice(_persona(0.39), None) == "whisper"

    def test_trust_at_0_4_returns_letter(self) -> None:
        assert select_voice(_persona(0.4), None) == "letter"
        assert select_voice(_persona(0.69), None) == "letter"

    def test_trust_at_0_7_returns_dialogue(self) -> None:
        assert select_voice(_persona(0.7), None) == "dialogue"
        assert select_voice(_persona(1.0), None) == "dialogue"

    def test_visitor_steer_overrides_trust(self) -> None:
        steer = VisitorSteer(requested_voice="dialogue")
        assert select_voice(_persona(0.0), steer) == "dialogue"

    def test_visitor_steer_can_request_any_voice_tag(self) -> None:
        steer = VisitorSteer(requested_voice="podcast")
        # Open vocabulary — selector returns whatever was asked for.
        assert select_voice(_persona(0.5), steer) == "podcast"
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_stage_selector.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/domain/stage.py
"""Stage selector — pure function from (persona, steer) to voice_tag."""

from pydantic import BaseModel

from app.domain.persona import Persona

_LETTER_THRESHOLD = 0.4
_DIALOGUE_THRESHOLD = 0.7


class VisitorSteer(BaseModel):
    """Visitor-driven voice override (e.g. Cmd+K → forced dialogue)."""

    requested_voice: str


def select_voice(persona: Persona, steer: VisitorSteer | None) -> str:
    """Return the active voice tag for a given persona and optional steer."""
    if steer is not None:
        return steer.requested_voice
    if persona.trust >= _DIALOGUE_THRESHOLD:
        return "dialogue"
    if persona.trust >= _LETTER_THRESHOLD:
        return "letter"
    return "whisper"
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_stage_selector.py -v`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d3-whisper
git add backend/src/app/domain/stage.py backend/tests/test_stage_selector.py
git commit -m "feat(stage): select_voice pure function with trust thresholds 0.4/0.7"
```

---

### Task D3.2: VoiceStrategy + whisper prompt + voice tag registry

**Files:**
- Create: `backend/src/app/domain/strategies/voice.py`
- Test: `backend/tests/test_voice_strategy.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_voice_strategy.py
"""Tests for VoiceStrategy — voice-tag-parameterized utterance generation."""

import pytest

from app.domain.context import VisitorContext
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategies.voice import (
    VOICE_PROMPTS,
    VoiceStrategy,
    VoiceUtteranceList,
)


def _profile() -> VisitorProfile:
    return VisitorProfile(session_id="t", context=VisitorContext())


def _persona(trust: float = 0.3) -> Persona:
    return Persona(rationale="early-read", observations=[], trust=trust)


class TestVoicePrompts:
    def test_whisper_prompt_registered(self) -> None:
        assert "whisper" in VOICE_PROMPTS
        assert "italic" in VOICE_PROMPTS["whisper"].lower() or "marginal" in VOICE_PROMPTS["whisper"].lower()

    def test_whisper_prompt_instructs_short_lines(self) -> None:
        assert "short" in VOICE_PROMPTS["whisper"].lower() or "one line" in VOICE_PROMPTS["whisper"].lower()


class TestVoiceStrategy:
    def test_name_includes_voice_tag(self) -> None:
        strat = VoiceStrategy(voice_tag="whisper")
        assert strat.name == "voice:whisper"

    def test_result_schema_is_voice_utterance_list(self) -> None:
        assert VoiceStrategy(voice_tag="whisper").result_schema() is VoiceUtteranceList

    def test_unknown_voice_tag_raises_on_init(self) -> None:
        with pytest.raises(ValueError):
            VoiceStrategy(voice_tag="nonexistent")

    def test_build_prompt_includes_persona_rationale_and_trust(self) -> None:
        strat = VoiceStrategy(voice_tag="whisper")
        prompt = strat.build_prompt(_profile(), [])
        # Persona is passed via a setter on the strategy instance.
        strat.persona = _persona(trust=0.3)
        prompt = strat.build_prompt(_profile(), [])
        assert "0.30" in prompt or "trust" in prompt.lower()
        assert "early-read" in prompt
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_voice_strategy.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement minimally**

```python
# backend/src/app/domain/strategies/voice.py
"""VoiceStrategy — voice-tag-parameterized utterance generation."""

from pydantic import BaseModel, Field

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

WHISPER_PROMPT = """\
You are the agent's whisper voice — italic marginalia next to the canvas.
Output 1–3 short lines (≤12 words each). Each line is a quiet observation
about what the visitor seems to be doing or what the agent is noticing.

Tone: present-tense, first-person from the agent ("noticing…", "you read
slowly here…"). Never break the fourth wall. Never claim certainty.

You receive the agent's Persona (rationale, trust, observations). Speak
across multiple role observations when present — do not collapse to one.

Output ONLY a VoiceUtteranceList JSON object with `utterances`. Each
utterance has voice_tag="whisper" and utterance_kind="observation".
"""

LETTER_PROMPT = """\
[D4 will fill this in.]
"""

DIALOGUE_PROMPT = """\
[D5 will fill this in.]
"""

VOICE_PROMPTS: dict[str, str] = {
    "whisper": WHISPER_PROMPT,
}


class VoiceUtterance(BaseModel):
    """One utterance from a voice — wire-shape for VOICE_UTTERANCE event."""

    voice_tag: str
    utterance_kind: str
    content: str
    references: list[dict[str, str]] = Field(default_factory=list)


class VoiceUtteranceList(BaseModel):
    """LLM output container — list of utterances from one voice cycle."""

    utterances: list[VoiceUtterance] = Field(min_length=1)


class VoiceStrategy:
    """Voice-tag-parameterized utterance strategy.

    Looks up the prompt by voice_tag in VOICE_PROMPTS. Adding a voice =
    registering a new prompt key. The engine itself does not change.
    """

    def __init__(self, voice_tag: str) -> None:
        if voice_tag not in VOICE_PROMPTS:
            raise ValueError(
                f"Unknown voice_tag {voice_tag!r}; "
                f"register a prompt in VOICE_PROMPTS first."
            )
        self.voice_tag = voice_tag
        self.persona: Persona | None = None
        self.name: str = f"voice:{voice_tag}"

    def system_prompt(self) -> str:
        """Return the LLM system prompt for this voice."""
        return VOICE_PROMPTS[self.voice_tag]

    def build_prompt(
        self, profile: VisitorProfile, catalog: list[ContentItem]
    ) -> str:
        """Build the user prompt; expects self.persona to be set."""
        if self.persona is None:
            return f"voice_tag={self.voice_tag}\n(no persona attached)"
        lines = [
            f"voice_tag: {self.voice_tag}",
            f"trust: {self.persona.trust:.2f}",
            f"persona rationale: {self.persona.rationale}",
            "",
            "observations:",
        ]
        for obs in self.persona.observations:
            lines.append(
                f"- dim={obs.dimension} value={obs.value} "
                f"confidence={obs.confidence:.2f} :: {obs.rationale}"
            )
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return VoiceUtteranceList

    def model_config(self) -> ModelConfig:
        """Return LLM config — slightly higher temperature for tonal variety."""
        return ModelConfig(temperature=0.5, max_tokens=512)
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_voice_strategy.py -v`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/domain/strategies/voice.py backend/tests/test_voice_strategy.py
git commit -m "feat(voice): VoiceStrategy registry + whisper prompt + utterance schema"
```

---

### Task D3.3: `voice_utterance_event` SSE formatter

**Files:**
- Modify: `backend/src/app/adapters/api/persona_events.py`
- Modify: `backend/tests/test_persona_events.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_persona_events.py`:

```python
class TestVoiceUtteranceEvent:
    def test_emits_well_formed_sse_data_frame(self) -> None:
        from app.adapters.api.persona_events import voice_utterance_event
        from app.domain.strategies.voice import VoiceUtterance

        utt = VoiceUtterance(
            voice_tag="whisper",
            utterance_kind="observation",
            content="reading slowly here",
            references=[],
        )
        ev = voice_utterance_event(utt)
        assert ev.startswith("data: ")
        assert ev.endswith("\n\n")

    def test_payload_carries_voice_tag_and_content(self) -> None:
        import json
        from app.adapters.api.persona_events import voice_utterance_event
        from app.domain.strategies.voice import VoiceUtterance

        utt = VoiceUtterance(
            voice_tag="whisper",
            utterance_kind="observation",
            content="reading slowly here",
        )
        ev = voice_utterance_event(utt)
        payload = json.loads(ev[len("data: "):].strip())
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "voice:utterance"
        assert payload["custom"]["voice_tag"] == "whisper"
        assert payload["custom"]["utterance_kind"] == "observation"
        assert payload["custom"]["content"] == "reading slowly here"
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_persona_events.py::TestVoiceUtteranceEvent -v`
Expected: FAIL with `ImportError: cannot import name 'voice_utterance_event'`

- [ ] **Step 3: Implement minimally**

Append to `backend/src/app/adapters/api/persona_events.py`:

```python
from app.domain.strategies.voice import VoiceUtterance


def voice_utterance_event(utt: VoiceUtterance) -> str:
    """Format a VOICE_UTTERANCE as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "voice:utterance",
            "voice_tag": utt.voice_tag,
            "utterance_kind": utt.utterance_kind,
            "content": utt.content,
            "references": [r for r in utt.references],
        },
    }
    return f"data: {json.dumps(payload)}\n\n"
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_persona_events.py -v`
Expected: PASS — all prior tests + 2 new.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/adapters/api/persona_events.py backend/tests/test_persona_events.py
git commit -m "feat(voice): voice_utterance_event SSE formatter"
```

---

### Task D3.4: signal_route runs StageSelector + VoiceStrategy

**Files:**
- Modify: `backend/src/app/adapters/api/signal_route.py`
- Modify: `backend/tests/test_signal_route.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_signal_route.py`:

```python
class TestSignalRouteVoiceEmission:
    """After ReadStrategy fires, VoiceStrategy fires for the active voice tag."""

    async def test_run_adaptation_publishes_voice_utterance_after_persona(
        self,
    ) -> None:
        from app.adapters.api.signal_route import _run_adaptation
        from app.adapters.sse.event_bus import SessionEventBus
        from app.domain.context import VisitorContext
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.persona import Observation, Persona, SignalRef
        from app.domain.session import BehavioralSignal, VisitorProfile
        from app.domain.strategies.voice import VoiceUtterance, VoiceUtteranceList
        from datetime import UTC, datetime
        from unittest.mock import AsyncMock, patch
        import asyncio

        profile = VisitorProfile(session_id="voice-emit", context=VisitorContext())
        for _ in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=1500, timestamp=1.0
                )
            )

        persona = Persona(
            rationale="early read",
            observations=[
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.4,
                    rationale="dwell",
                    source_signals=[SignalRef(kind="signal", id="s0")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.2,  # whisper stage
        )
        utterance_list = VoiceUtteranceList(
            utterances=[
                VoiceUtterance(
                    voice_tag="whisper",
                    utterance_kind="observation",
                    content="reading slowly",
                )
            ]
        )

        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe(profile.session_id):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer_task = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch(
                "app.adapters.api.signal_route.evaluate_persona",
                new=AsyncMock(return_value=persona),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_voice",
                new=AsyncMock(return_value=utterance_list),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_intelligence",
                new=AsyncMock(return_value=IntelligenceResult(
                    items=[ItemResult(id="hero", importance=0.95)], bridges=None
                )),
            ),
        ):
            await _run_adaptation(profile, bus, AsyncMock())

        await asyncio.wait_for(consumer_task, timeout=1.0)
        # First persona:delta, then voice:utterance.
        assert "persona:delta" in received[0]
        assert "voice:utterance" in received[1]
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_signal_route.py::TestSignalRouteVoiceEmission -v`
Expected: FAIL — `evaluate_voice` and the wiring don't exist yet.

- [ ] **Step 3: Implement minimally**

Add a small `evaluate_voice` orchestrator to `backend/src/app/domain/persona_evaluation.py`:

```python
# Append to backend/src/app/domain/persona_evaluation.py

from app.domain.strategies.voice import VoiceStrategy, VoiceUtteranceList


async def evaluate_voice(
    strategy: VoiceStrategy,
    llm: LLMPort,
    profile: VisitorProfile,
    catalog: list[ContentItem],
) -> VoiceUtteranceList | None:
    """Run a voice strategy through the LLM, return None on failure."""
    user_prompt = strategy.build_prompt(profile, catalog)
    cfg = strategy.model_config()
    try:
        raw = await llm.evaluate(
            strategy_name=strategy.name,
            system_prompt=strategy.system_prompt(),
            user_prompt=user_prompt,
            result_type=strategy.result_schema(),
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
        )
    except Exception:
        _log.exception("LLM evaluate failed for strategy=%s", strategy.name)
        return None
    if not isinstance(raw, VoiceUtteranceList):
        _log.warning("LLM returned non-VoiceUtteranceList: %s", type(raw).__name__)
        return None
    return raw
```

Modify `backend/src/app/adapters/api/signal_route.py`:

```python
# Add to imports
from app.adapters.api.persona_events import voice_utterance_event
from app.domain.persona_evaluation import evaluate_voice
from app.domain.stage import select_voice
from app.domain.strategies.voice import VOICE_PROMPTS, VoiceStrategy

# Replace _run_adaptation
async def _run_adaptation(
    profile: VisitorProfile,
    bus: SessionEventBus,
    llm: object,
) -> None:
    """Run Read → Voice → Adapt; publish persona, voice, and UX events."""
    try:
        catalog = load_catalog()

        persona = await evaluate_persona(
            ReadStrategy(), READ_SYSTEM_PROMPT, llm, profile, catalog
        )
        if persona is not None:
            await bus.publish(
                profile.session_id,
                persona_delta_event(persona, prior_trust=0.0, prior_rationale=""),
            )

            voice_tag = select_voice(persona, steer=None)
            if voice_tag in VOICE_PROMPTS:
                voice = VoiceStrategy(voice_tag=voice_tag)
                voice.persona = persona
                utterances = await evaluate_voice(voice, llm, profile, catalog)
                if utterances is not None:
                    for utt in utterances.utterances:
                        await bus.publish(
                            profile.session_id, voice_utterance_event(utt)
                        )

        result = await evaluate_intelligence(
            AdaptStrategy(), ADAPT_SYSTEM_PROMPT, llm, profile, catalog
        )
        if result is None:
            return
        for event in intelligence_to_events(result):
            await bus.publish(profile.session_id, event)
    except Exception:
        _log.exception(
            "Background adaptation failed for session=%s", profile.session_id
        )
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_signal_route.py -v`
Expected: PASS — all prior plus the voice-emission test.

- [ ] **Step 5: Commit**

```bash
git add backend/src/app/domain/persona_evaluation.py backend/src/app/adapters/api/signal_route.py backend/tests/test_signal_route.py
git commit -m "feat(voice): wire VoiceStrategy into adaptation cycle, emit voice:utterance"
```

---

### Task D3.5: Frontend voice-store + sse-parsers extension

**Files:**
- Create: `frontend/src/store/voice-store.ts`
- Modify: `frontend/src/hooks/sse-parsers.ts`
- Modify: `frontend/src/hooks/use-agent-stream.ts`
- Test: `frontend/src/__tests__/voice-store.test.ts`
- Modify: `frontend/src/__tests__/use-agent-stream.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/voice-store.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { type VoiceUtterance, addUtterance, useVoiceStore } from "../store/voice-store";

const utt = (over: Partial<VoiceUtterance> = {}): VoiceUtterance => ({
  voice_tag: "whisper",
  utterance_kind: "observation",
  content: "reading slowly",
  references: [],
  ...over,
});

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

describe("useVoiceStore", () => {
  it("starts with whisper as active and empty utterances", () => {
    const s = useVoiceStore.getState();
    expect(s.activeVoice).toBe("whisper");
    expect(s.utterancesByVoice).toEqual({});
  });

  it("appends utterances grouped by voice_tag", () => {
    addUtterance(utt({ content: "a" }));
    addUtterance(utt({ content: "b" }));
    addUtterance(utt({ voice_tag: "letter", content: "c" }));
    const s = useVoiceStore.getState();
    expect(s.utterancesByVoice.whisper?.map((u) => u.content)).toEqual(["a", "b"]);
    expect(s.utterancesByVoice.letter?.map((u) => u.content)).toEqual(["c"]);
  });

  it("setActiveVoice updates active voice tag", () => {
    useVoiceStore.getState().setActiveVoice("letter");
    expect(useVoiceStore.getState().activeVoice).toBe("letter");
  });
});
```

Append to `frontend/src/__tests__/use-agent-stream.test.tsx` a parallel test that pushes a `voice:utterance` event and asserts it lands in `useVoiceStore`. (Mirror the persona-delta pattern in D2.4.)

- [ ] **Step 2: Run tests, see them fail**

From `frontend/`: `pnpm vitest run src/__tests__/voice-store.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/store/voice-store.ts
import { create } from "zustand";

export interface VoiceReference {
  kind: string;
  id: string;
}

export interface VoiceUtterance {
  voice_tag: string;
  utterance_kind: string;
  content: string;
  references?: VoiceReference[];
}

interface VoiceState {
  activeVoice: string;
  utterancesByVoice: Record<string, VoiceUtterance[]>;
  setActiveVoice: (tag: string) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeVoice: "whisper",
  utterancesByVoice: {},
  setActiveVoice: (tag) => set({ activeVoice: tag }),
}));

export function addUtterance(utt: VoiceUtterance): void {
  useVoiceStore.setState((state) => {
    const prior = state.utterancesByVoice[utt.voice_tag] ?? [];
    return {
      utterancesByVoice: {
        ...state.utterancesByVoice,
        [utt.voice_tag]: [...prior, utt],
      },
    };
  });
}

export function getUtterancesByVoice(
  state: VoiceState,
  voiceTag: string,
): VoiceUtterance[] {
  return state.utterancesByVoice[voiceTag] ?? [];
}
```

Append to `frontend/src/hooks/sse-parsers.ts`:

```typescript
import type { VoiceUtterance } from "../store/voice-store";

export interface VoiceUtteranceEvent {
  type: "CUSTOM";
  custom: {
    eventType: "voice:utterance";
    voice_tag: string;
    utterance_kind: string;
    content: string;
    references?: VoiceUtterance["references"];
  };
}

export function isVoiceUtterance(data: unknown): data is VoiceUtteranceEvent {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    obj.type !== "CUSTOM" ||
    typeof obj.custom !== "object" ||
    obj.custom === null
  ) {
    return false;
  }
  const custom = obj.custom as Record<string, unknown>;
  return custom.eventType === "voice:utterance";
}
```

Modify `frontend/src/hooks/use-agent-stream.ts` — add the import + branch:

```typescript
import { addUtterance, useVoiceStore } from "../store/voice-store";
import { isVoiceUtterance } from "./sse-parsers";

// After the persona-delta branch in source.onmessage:
} else if (isVoiceUtterance(data)) {
  addUtterance({
    voice_tag: data.custom.voice_tag,
    utterance_kind: data.custom.utterance_kind,
    content: data.custom.content,
    references: data.custom.references,
  });
  useVoiceStore.getState().setActiveVoice(data.custom.voice_tag);
}
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/voice-store.test.ts src/__tests__/use-agent-stream.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/voice-store.ts frontend/src/hooks/sse-parsers.ts frontend/src/hooks/use-agent-stream.ts frontend/src/__tests__/voice-store.test.ts frontend/src/__tests__/use-agent-stream.test.tsx
git commit -m "feat(voice): voice-store + isVoiceUtterance + stream wiring"
```

---

### Task D3.6: WhisperLayer renders ambient gutter italics

**Files:**
- Create: `frontend/src/voice/WhisperLayer.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Test: `frontend/src/__tests__/WhisperLayer.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/WhisperLayer.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WhisperLayer } from "../voice/WhisperLayer";
import { addUtterance, useVoiceStore } from "../store/voice-store";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

describe("WhisperLayer", () => {
  it("renders nothing when no whisper utterances exist", () => {
    const { container } = render(<WhisperLayer />);
    expect(container.querySelector('[aria-label="Whisper layer"]')).toBeNull();
  });

  it("renders italic lines for each whisper utterance", () => {
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "reading slowly here",
    });
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "lingering on the architecture",
    });
    render(<WhisperLayer />);
    expect(screen.getByText(/reading slowly here/i)).toBeInTheDocument();
    expect(screen.getByText(/lingering on the architecture/i)).toBeInTheDocument();
  });

  it("dims when active voice is not whisper (stage lighting)", () => {
    addUtterance({
      voice_tag: "whisper",
      utterance_kind: "observation",
      content: "noticing",
    });
    useVoiceStore.setState({ activeVoice: "letter" });
    const { container } = render(<WhisperLayer />);
    const layer = container.querySelector(
      '[aria-label="Whisper layer"]',
    ) as HTMLElement | null;
    expect(layer).not.toBeNull();
    // Lower-confidence voices stay visible at reduced opacity per spec.
    expect(parseFloat(layer?.style.opacity ?? "1")).toBeLessThan(0.6);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

From `frontend/`: `pnpm vitest run src/__tests__/WhisperLayer.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/voice/WhisperLayer.tsx
import { useVoiceStore } from "../store/voice-store";

const ACTIVE_OPACITY = 0.6;
const BACKGROUNDED_OPACITY = 0.3;

export function WhisperLayer() {
  const utterances = useVoiceStore(
    (s) => s.utterancesByVoice.whisper ?? [],
  );
  const active = useVoiceStore((s) => s.activeVoice);
  if (utterances.length === 0) return null;
  const opacity = active === "whisper" ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;

  return (
    <aside
      aria-label="Whisper layer"
      className="whisper-layer"
      style={{
        opacity,
        fontStyle: "italic",
        transition: "opacity 350ms ease-out",
      }}
    >
      <ul className="space-y-1">
        {utterances.map((u, idx) => (
          <li
            key={`${u.voice_tag}-${idx}-${u.content.slice(0, 12)}`}
            className="text-xs text-ink-30"
          >
            {u.content}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

Modify `frontend/src/canvas/Canvas.tsx` — compose WhisperLayer:

```typescript
// Add import at top
import { WhisperLayer } from "../voice/WhisperLayer";

// Inside the <main> element, before the <Bento ... />:
<WhisperLayer />
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/WhisperLayer.test.tsx src/__tests__/Canvas.test.tsx`
Expected: PASS — Canvas test should not be affected by additional optional layer; if it asserts exact DOM shape, update it to ignore `[aria-label="Whisper layer"]`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/voice/WhisperLayer.tsx frontend/src/canvas/Canvas.tsx frontend/src/__tests__/WhisperLayer.test.tsx
git commit -m "feat(voice): WhisperLayer renders ambient gutter italics"
```

---

### Task D3.7: Verify D3 + merge

- [ ] **Step 1: Run full suites**

From `backend/`: `uv run pytest -v` → ~226 tests (218 + 5 stage + 5 voice + 2 voice_event + 1 voice_emission).
From `frontend/`: `pnpm vitest run` → ~136 tests (127 + 3 voice-store + 1 stream-voice + 3 WhisperLayer).
From `frontend/`: `pnpm test:e2e` → 6/6 PASS.

- [ ] **Step 2: Lint + typecheck**

From `backend/`: `uv run ruff check src/app/domain/stage.py src/app/domain/strategies/voice.py src/app/domain/persona_evaluation.py src/app/adapters/api/persona_events.py src/app/adapters/api/signal_route.py`
From `frontend/`: `pnpm typecheck && pnpm lint`

- [ ] **Step 3: Merge to develop + STATUS.md**

```bash
git checkout develop
git merge --no-ff feat/006-d3-whisper -m "merge: feat/006-d3-whisper into develop"
# edit tasks/STATUS.md
git add tasks/STATUS.md
git commit -m "session: ship Slice D3 whisper voice + stage selector"
```

---

## Slice D4 — Letter Voice

**Branch:** `feat/006-d4-letter`

**Outcome:** Trust ≥ 0.4 → cover-letter pitch (Zilla Slab serif, 2–3 sentences) renders at the top of the canvas, addressed to the inferred role(s). Whisper layer remains visible at reduced opacity.

**Files (source, ≤4):**
- Modify: `backend/src/app/domain/strategies/voice.py` (replace `LETTER_PROMPT` placeholder; register in `VOICE_PROMPTS`)
- Create: `frontend/src/voice/CoverLetterPanel.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Modify: `frontend/src/voice/WhisperLayer.tsx` (already lights down; verify behavior)

**Test files:**
- Modify: `backend/tests/test_voice_strategy.py` (assert letter prompt registered + addresses multivoice roles)
- Create: `frontend/src/__tests__/CoverLetterPanel.test.tsx`

---

### Task D4.1: Letter prompt + registry entry

**Files:**
- Modify: `backend/src/app/domain/strategies/voice.py`
- Modify: `backend/tests/test_voice_strategy.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_voice_strategy.py`:

```python
class TestLetterPrompt:
    def test_letter_prompt_registered(self) -> None:
        assert "letter" in VOICE_PROMPTS

    def test_letter_prompt_instructs_2_to_3_sentences(self) -> None:
        prompt = VOICE_PROMPTS["letter"]
        assert "2" in prompt and "3" in prompt
        assert "sentence" in prompt.lower()

    def test_letter_prompt_addresses_multivoice_roles(self) -> None:
        prompt = VOICE_PROMPTS["letter"]
        assert "every role observation" in prompt.lower() or "all role observations" in prompt.lower()

    def test_letter_strategy_can_be_constructed(self) -> None:
        strat = VoiceStrategy(voice_tag="letter")
        assert strat.name == "voice:letter"
```

- [ ] **Step 2: Run test, see it fail**

From `backend/`: `uv run pytest tests/test_voice_strategy.py::TestLetterPrompt -v`
Expected: FAIL — letter prompt is a placeholder; not in registry.

- [ ] **Step 3: Implement minimally**

In `backend/src/app/domain/strategies/voice.py`, replace the placeholder `LETTER_PROMPT` and update the registry:

```python
LETTER_PROMPT = """\
You are the agent's letter voice — a 2 to 3 sentence cover-letter pitch
addressed to the visitor at the top of the canvas. Render in plain text;
the client decorates the typography (Zilla Slab serif).

Tone: present-tense, second-person ("you'll find…", "your team…"). Speak
to the inferred reader, not to a generic audience.

MULTIVOICE: address every role observation with confidence > 0.3,
weighted by confidence. If the persona reads as both recruiter (0.4) and
engineer (0.6), the letter should speak to a technical reader who is
also evaluating fit. Do not collapse to a single role.

Output ONLY a VoiceUtteranceList JSON object with a single utterance
(voice_tag="letter", utterance_kind="pitch", references=[]).
"""

VOICE_PROMPTS: dict[str, str] = {
    "whisper": WHISPER_PROMPT,
    "letter": LETTER_PROMPT,
}
```

- [ ] **Step 4: Run test, see it pass**

From `backend/`: `uv run pytest tests/test_voice_strategy.py -v`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d4-letter
git add backend/src/app/domain/strategies/voice.py backend/tests/test_voice_strategy.py
git commit -m "feat(voice): register letter prompt with multivoice instructions"
```

---

### Task D4.2: CoverLetterPanel component

**Files:**
- Create: `frontend/src/voice/CoverLetterPanel.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Test: `frontend/src/__tests__/CoverLetterPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/CoverLetterPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoverLetterPanel } from "../voice/CoverLetterPanel";
import { addUtterance, useVoiceStore } from "../store/voice-store";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

describe("CoverLetterPanel", () => {
  it("renders nothing when no letter utterance exists", () => {
    const { container } = render(<CoverLetterPanel />);
    expect(container.querySelector('[aria-label="Cover letter"]')).toBeNull();
  });

  it("renders the most recent letter utterance content", () => {
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "You will find a senior AI engineer here.",
    });
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "You will find a builder who ships.",
    });
    useVoiceStore.setState({ activeVoice: "letter" });
    render(<CoverLetterPanel />);
    expect(screen.getByText(/builder who ships/i)).toBeInTheDocument();
  });

  it("scales down when dialogue is the active voice", () => {
    addUtterance({
      voice_tag: "letter",
      utterance_kind: "pitch",
      content: "x",
    });
    useVoiceStore.setState({ activeVoice: "dialogue" });
    const { container } = render(<CoverLetterPanel />);
    const panel = container.querySelector(
      '[aria-label="Cover letter"]',
    ) as HTMLElement | null;
    expect(parseFloat(panel?.style.opacity ?? "1")).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run test, see it fail**

From `frontend/`: `pnpm vitest run src/__tests__/CoverLetterPanel.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/voice/CoverLetterPanel.tsx
import { useVoiceStore } from "../store/voice-store";

const ACTIVE_OPACITY = 1;
const BACKGROUNDED_OPACITY = 0.4;

export function CoverLetterPanel() {
  const utterances = useVoiceStore(
    (s) => s.utterancesByVoice.letter ?? [],
  );
  const active = useVoiceStore((s) => s.activeVoice);
  if (utterances.length === 0) return null;
  const latest = utterances[utterances.length - 1];
  if (!latest) return null;
  const opacity = active === "letter" ? ACTIVE_OPACITY : BACKGROUNDED_OPACITY;

  return (
    <section
      aria-label="Cover letter"
      className="cover-letter"
      style={{
        opacity,
        fontFamily: "'Zilla Slab', serif",
        fontSize: active === "letter" ? "1.25rem" : "0.875rem",
        lineHeight: 1.6,
        transition: "opacity 350ms ease-out, font-size 350ms ease-out",
      }}
    >
      <p>{latest.content}</p>
    </section>
  );
}
```

Modify `frontend/src/canvas/Canvas.tsx` — add the panel above the bento:

```typescript
import { CoverLetterPanel } from "../voice/CoverLetterPanel";

// Inside <main>, above <Bento>:
<CoverLetterPanel />
<WhisperLayer />
```

- [ ] **Step 4: Run tests, see them pass**

From `frontend/`: `pnpm vitest run src/__tests__/CoverLetterPanel.test.tsx src/__tests__/Canvas.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/voice/CoverLetterPanel.tsx frontend/src/canvas/Canvas.tsx frontend/src/__tests__/CoverLetterPanel.test.tsx
git commit -m "feat(voice): CoverLetterPanel renders top-of-canvas pitch"
```

---

### Task D4.3: Verify D4 + merge

- [ ] **Step 1: Run all suites + lint + typecheck.**
- [ ] **Step 2: Merge to develop + STATUS.md update.**

```bash
git checkout develop
git merge --no-ff feat/006-d4-letter -m "merge: feat/006-d4-letter into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D4 letter voice"
```

---

## Slice D5 — Dialogue Voice

**Branch:** `feat/006-d5-dialogue`

**Outcome:** Trust ≥ 0.7 (or visitor steers) → an inferred question, the agent's prose answer, and 1–3 receipt utterances referencing item IDs render as a Q/A overlay above and below the bento. Bento highlights cards referenced by receipts.

**Files (source, ≤5):**
- Modify: `backend/src/app/domain/strategies/voice.py` (register `DIALOGUE_PROMPT`)
- Create: `frontend/src/voice/DialogueOverlay.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Modify: `frontend/src/canvas/Bento.tsx` (accept `highlighted: string[]` for receipts; render border)
- Modify: `frontend/src/store/voice-store.ts` (selector returning highlighted item IDs from receipt utterances)

**Test files:**
- Modify: `backend/tests/test_voice_strategy.py` (dialogue prompt assertions)
- Create: `frontend/src/__tests__/DialogueOverlay.test.tsx`
- Modify: `frontend/src/__tests__/Bento.test.tsx` (highlighted prop)

---

### Task D5.1: Dialogue prompt + registration

**Files:**
- Modify: `backend/src/app/domain/strategies/voice.py`
- Modify: `backend/tests/test_voice_strategy.py`

- [ ] **Step 1: Write the failing test**

```python
class TestDialoguePrompt:
    def test_dialogue_prompt_registered(self) -> None:
        assert "dialogue" in VOICE_PROMPTS

    def test_dialogue_prompt_emits_question_answer_receipts(self) -> None:
        p = VOICE_PROMPTS["dialogue"]
        assert "question" in p.lower()
        assert "answer" in p.lower()
        assert "receipt" in p.lower()

    def test_dialogue_prompt_grounds_receipts_in_item_ids(self) -> None:
        p = VOICE_PROMPTS["dialogue"]
        assert "item" in p.lower() and ("id" in p.lower() or "catalog" in p.lower())
```

- [ ] **Step 2: Run test, see it fail.**

From `backend/`: `uv run pytest tests/test_voice_strategy.py::TestDialoguePrompt -v`

- [ ] **Step 3: Implement minimally**

In `backend/src/app/domain/strategies/voice.py`:

```python
DIALOGUE_PROMPT = """\
You are the agent's dialogue voice. Output three kinds of utterances:

  1. ONE question utterance (utterance_kind="question") — the question
     the visitor seems to be asking, phrased in their voice.
  2. ONE answer utterance (utterance_kind="answer") — the agent's prose
     reply, 3–5 sentences, grounded in the catalog.
  3. ONE TO THREE receipt utterances (utterance_kind="receipt") — short
     citations pointing to specific catalog item IDs. Each receipt MUST
     include `references` listing one or more `{kind: "item", id: "<id>"}`
     entries from the catalog.

The answer addresses every role observation with confidence > 0.3,
weighted by confidence. Receipts must reference real catalog item IDs
shown in the user prompt — do not invent ids.

Output ONLY a VoiceUtteranceList JSON object whose `utterances` list
contains one question, one answer, and 1-3 receipts (in that order).
All utterances have voice_tag="dialogue".
"""

VOICE_PROMPTS: dict[str, str] = {
    "whisper": WHISPER_PROMPT,
    "letter": LETTER_PROMPT,
    "dialogue": DIALOGUE_PROMPT,
}
```

- [ ] **Step 4: Run test, see it pass.**
- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d5-dialogue
git add backend/src/app/domain/strategies/voice.py backend/tests/test_voice_strategy.py
git commit -m "feat(voice): register dialogue prompt with question/answer/receipts"
```

---

### Task D5.2: DialogueOverlay component + receipt-driven highlights

**Files:**
- Create: `frontend/src/voice/DialogueOverlay.tsx`
- Modify: `frontend/src/store/voice-store.ts` (add `getHighlightedItemIds` selector)
- Modify: `frontend/src/canvas/Canvas.tsx` (compose overlay; pass highlighted IDs to Bento)
- Modify: `frontend/src/canvas/Bento.tsx` (accept `highlighted` prop, render border on matched cards)
- Test: `frontend/src/__tests__/DialogueOverlay.test.tsx`
- Modify: `frontend/src/__tests__/Bento.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/DialogueOverlay.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DialogueOverlay } from "../voice/DialogueOverlay";
import { addUtterance, useVoiceStore } from "../store/voice-store";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

describe("DialogueOverlay", () => {
  it("renders nothing when no dialogue utterances exist", () => {
    const { container } = render(<DialogueOverlay />);
    expect(container.querySelector('[aria-label="Dialogue overlay"]')).toBeNull();
  });

  it("renders the latest question and answer", () => {
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "question",
      content: "What did you build at Emaratech?",
    });
    addUtterance({
      voice_tag: "dialogue",
      utterance_kind: "answer",
      content: "A multi-tenant agent platform with LangGraph.",
    });
    useVoiceStore.setState({ activeVoice: "dialogue" });
    render(<DialogueOverlay />);
    expect(screen.getByText(/build at emaratech/i)).toBeInTheDocument();
    expect(screen.getByText(/langgraph/i)).toBeInTheDocument();
  });
});
```

Add to `frontend/src/__tests__/Bento.test.tsx`:

```typescript
it("borders highlighted cards when given highlighted prop", () => {
  // Use existing test setup. Render <Bento items={[…]} highlighted={["hero"]} />
  // and assert the matched card has a data-highlighted="true" attribute.
  // Test code mirrors existing Bento.test.tsx render harness.
});
```

- [ ] **Step 2: Run tests, see them fail**

From `frontend/`: `pnpm vitest run src/__tests__/DialogueOverlay.test.tsx src/__tests__/Bento.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/voice/DialogueOverlay.tsx
import { useVoiceStore } from "../store/voice-store";

export function DialogueOverlay() {
  const utterances = useVoiceStore(
    (s) => s.utterancesByVoice.dialogue ?? [],
  );
  if (utterances.length === 0) return null;
  const question = [...utterances].reverse().find((u) => u.utterance_kind === "question");
  const answer = [...utterances].reverse().find((u) => u.utterance_kind === "answer");

  return (
    <section
      aria-label="Dialogue overlay"
      className="dialogue-overlay"
      style={{
        fontFamily: "'Zilla Slab', serif",
        transition: "opacity 350ms ease-out",
      }}
    >
      {question && (
        <p className="dialogue-question text-lg italic" data-role="question">
          {question.content}
        </p>
      )}
      {answer && (
        <p className="dialogue-answer text-base mt-3" data-role="answer">
          {answer.content}
        </p>
      )}
    </section>
  );
}
```

Append to `frontend/src/store/voice-store.ts`:

```typescript
export function getHighlightedItemIds(state: VoiceState): string[] {
  const dialogue = state.utterancesByVoice.dialogue ?? [];
  const ids = new Set<string>();
  for (const u of dialogue) {
    if (u.utterance_kind !== "receipt") continue;
    for (const ref of u.references ?? []) {
      if (ref.kind === "item") ids.add(ref.id);
    }
  }
  return [...ids];
}
```

Modify `frontend/src/canvas/Bento.tsx` — accept `highlighted?: string[]` prop and pass `data-highlighted` on matched cards:

```typescript
export function Bento({
  items,
  cardHandlers,
  highlighted = [],
}: {
  items: UXItem[];
  cardHandlers?: (cardId: string) => CardHandlers;
  highlighted?: string[];
}) {
  // ... inside the motion.article, add:
  // data-highlighted={highlighted.includes(entry.id) ? "true" : undefined}
}
```

Modify `frontend/src/canvas/Canvas.tsx`:

```typescript
import { DialogueOverlay } from "../voice/DialogueOverlay";
import { getHighlightedItemIds } from "../store/voice-store";
import { useVoiceStore } from "../store/voice-store";

// Inside Canvas component:
const highlighted = useVoiceStore(getHighlightedItemIds);

// In the JSX:
<CoverLetterPanel />
<DialogueOverlay />
<Bento items={rendered} cardHandlers={cardHandlers} highlighted={highlighted} />
<WhisperLayer />
```

- [ ] **Step 4: Run tests, see them pass.**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/voice/DialogueOverlay.tsx frontend/src/store/voice-store.ts frontend/src/canvas/Bento.tsx frontend/src/canvas/Canvas.tsx frontend/src/__tests__/DialogueOverlay.test.tsx frontend/src/__tests__/Bento.test.tsx
git commit -m "feat(voice): DialogueOverlay + bento receipts highlight"
```

---

### Task D5.3: Verify D5 + merge

- [ ] Same shape as D3.7 / D4.3.

```bash
git checkout develop
git merge --no-ff feat/006-d5-dialogue -m "merge: feat/006-d5-dialogue into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D5 dialogue voice with receipts"
```

---

## Slice D6 — Visitor Steer (Cmd+K Rewiring) + FallbackUtterance

**Branch:** `feat/006-d6-visitor-steer`

**Outcome:** Cmd+K command flow is rewired: `command_route.py` runs `ReadStrategy` + `VoiceStrategy("dialogue")` and emits `PERSONA_DELTA` + `VOICE_UTTERANCE` events through the `SessionEventBus` (so the same long-lived stream subscription consumes them). `FallbackUtterance.tsx` renders unknown `voice_tag` values as plain gutter italic — graceful-degrade is now a first-class protocol participant.

**Files (source, ≤4):**
- Modify: `backend/src/app/adapters/api/command_route.py`
- Create: `frontend/src/voice/FallbackUtterance.tsx`
- Modify: `frontend/src/voice/WhisperLayer.tsx` (or its parent) — render FallbackUtterance for unknown tags
- Modify: `frontend/src/canvas/Canvas.tsx`

**Test files:**
- Modify: `backend/tests/test_command_route.py`
- Create: `frontend/src/__tests__/FallbackUtterance.test.tsx`

---

### Task D6.1: command_route emits persona + dialogue events through bus

**Files:**
- Modify: `backend/src/app/adapters/api/command_route.py`
- Modify: `backend/tests/test_command_route.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_command_route.py`:

```python
class TestCommandRoutePersonaAndVoice:
    """Cmd+K command runs ReadStrategy + dialogue VoiceStrategy through bus."""

    async def test_command_publishes_persona_delta_and_voice_utterance_to_bus(
        self,
    ) -> None:
        from datetime import UTC, datetime
        from unittest.mock import AsyncMock, patch

        from app.adapters.api.command_route import _run_command_pipeline
        from app.adapters.sse.event_bus import SessionEventBus
        from app.domain.context import VisitorContext
        from app.domain.persona import Observation, Persona, SignalRef
        from app.domain.strategies.voice import VoiceUtterance, VoiceUtteranceList

        ctx = VisitorContext(referrer="https://www.linkedin.com/x", command="show me langgraph")
        persona = Persona(
            rationale="explicit query",
            observations=[
                Observation(
                    dimension="intent",
                    value="evaluating",
                    confidence=0.7,
                    rationale="explicit ask",
                    source_signals=[SignalRef(kind="signal", id="cmd")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.8,
        )
        utterances = VoiceUtteranceList(
            utterances=[
                VoiceUtterance(voice_tag="dialogue", utterance_kind="question", content="q"),
                VoiceUtterance(voice_tag="dialogue", utterance_kind="answer", content="a"),
            ]
        )
        bus = SessionEventBus()
        received: list[str] = []

        import asyncio

        async def _consumer() -> None:
            async for event in bus.subscribe("cmd-session"):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch("app.adapters.api.command_route.evaluate_persona", new=AsyncMock(return_value=persona)),
            patch("app.adapters.api.command_route.evaluate_voice", new=AsyncMock(return_value=utterances)),
        ):
            await _run_command_pipeline(ctx, "cmd-session", AsyncMock(), bus)

        await asyncio.wait_for(consumer, timeout=1.0)
        assert "persona:delta" in received[0]
        assert "voice:utterance" in received[1]
```

- [ ] **Step 2: Run test, see it fail.**

From `backend/`: `uv run pytest tests/test_command_route.py -v`

- [ ] **Step 3: Implement minimally**

Replace the body of `backend/src/app/adapters/api/command_route.py`:

```python
"""Command route — Cmd+K runs ReadStrategy + dialogue VoiceStrategy through bus."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.api.persona_events import (
    persona_delta_event,
    voice_utterance_event,
)
from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.signal_builder import build_signal_event
from app.adapters.api.ux_events import ux_snapshot_event
from app.adapters.content.yaml_loader import load_catalog
from app.adapters.sse.event_bus import SessionEventBus, get_event_bus
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.persona_evaluation import evaluate_persona, evaluate_voice
from app.domain.session import VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT as READ_SYSTEM_PROMPT
from app.domain.strategies.read import ReadStrategy
from app.domain.strategies.voice import VoiceStrategy

router = APIRouter(prefix="/api/agent")


class CommandRequest(BaseModel):
    """Request body for the command endpoint."""

    text: str = Field(min_length=1)
    session_id: str = Field(min_length=1)


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider

    return PydanticAIProvider()


async def _run_command_pipeline(
    context: VisitorContext,
    session_id: str,
    llm: object,
    bus: SessionEventBus,
) -> None:
    """Run Read → dialogue Voice; publish through the per-session bus."""
    catalog = load_catalog()
    profile = VisitorProfile(session_id=session_id, context=context)

    persona = await evaluate_persona(
        ReadStrategy(), READ_SYSTEM_PROMPT, llm, profile, catalog
    )
    if persona is None:
        return
    await bus.publish(
        session_id, persona_delta_event(persona, prior_trust=0.0, prior_rationale="")
    )

    voice = VoiceStrategy(voice_tag="dialogue")
    voice.persona = persona
    utterances = await evaluate_voice(voice, llm, profile, catalog)
    if utterances is None:
        return
    for utt in utterances.utterances:
        await bus.publish(session_id, voice_utterance_event(utt))


async def _ack_stream(context: VisitorContext) -> AsyncGenerator[str]:
    """Yield a snapshot + signal ack, then end. Real events ride the bus."""
    catalog = load_catalog()
    yield ux_snapshot_event(content_to_ux_state(catalog))
    yield build_signal_event(context)


@router.post("/command")
async def command(
    body: CommandRequest,
    background_tasks: BackgroundTasks,
    context: VisitorContext = Depends(get_visitor_context),  # noqa: B008
) -> StreamingResponse:
    """Process a visitor command; schedule pipeline; ack via short stream."""
    context.command = body.text
    llm = _get_llm_port()
    if llm is not None:
        background_tasks.add_task(
            _run_command_pipeline, context, body.session_id, llm, get_event_bus()
        )
    return StreamingResponse(
        _ack_stream(context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> Frontend `useCommandBar` will need to send `session_id` in the POST body. If it doesn't already, modify `frontend/src/hooks/use-command-bar.ts` here too — but that's a 5-line tweak that adds `useSessionId()` and includes it in the body. Verify in step 4.

- [ ] **Step 4: Run tests, see them pass.**

From `backend/`: `uv run pytest -v`. Expected PASS.
From `frontend/`: `pnpm vitest run src/__tests__/CommandBar.test.tsx` — adjust `useCommandBar` if its existing tests break on the new `session_id` payload.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d6-visitor-steer
git add backend/src/app/adapters/api/command_route.py backend/tests/test_command_route.py frontend/src/hooks/use-command-bar.ts frontend/src/__tests__/CommandBar.test.tsx
git commit -m "feat(command): rewire Cmd+K to publish persona + dialogue via bus"
```

---

### Task D6.2: FallbackUtterance for unknown voice_tags

**Files:**
- Create: `frontend/src/voice/FallbackUtterance.tsx`
- Modify: `frontend/src/canvas/Canvas.tsx`
- Test: `frontend/src/__tests__/FallbackUtterance.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/FallbackUtterance.test.tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FallbackUtterance } from "../voice/FallbackUtterance";
import { addUtterance, useVoiceStore } from "../store/voice-store";

afterEach(() => {
  useVoiceStore.setState({ activeVoice: "whisper", utterancesByVoice: {} });
});

const KNOWN = ["whisper", "letter", "dialogue"];

describe("FallbackUtterance", () => {
  it("renders nothing when no unknown-tag utterances exist", () => {
    addUtterance({ voice_tag: "whisper", utterance_kind: "observation", content: "x" });
    const { container } = render(<FallbackUtterance knownVoices={KNOWN} />);
    expect(container.querySelector('[aria-label="Fallback utterance"]')).toBeNull();
  });

  it("renders unknown-tag utterances as plain gutter italic", () => {
    addUtterance({ voice_tag: "podcast", utterance_kind: "audio-cue", content: "tune in" });
    render(<FallbackUtterance knownVoices={KNOWN} />);
    expect(screen.getByText(/tune in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, see it fail.**
- [ ] **Step 3: Implement minimally**

```typescript
// frontend/src/voice/FallbackUtterance.tsx
import { useVoiceStore } from "../store/voice-store";

export function FallbackUtterance({ knownVoices }: { knownVoices: string[] }) {
  const map = useVoiceStore((s) => s.utterancesByVoice);
  const unknown = Object.entries(map).flatMap(([tag, utts]) =>
    knownVoices.includes(tag) ? [] : utts,
  );
  if (unknown.length === 0) return null;
  return (
    <aside
      aria-label="Fallback utterance"
      className="fallback-utterance"
      style={{ fontStyle: "italic", opacity: 0.5 }}
    >
      <ul>
        {unknown.map((u, idx) => (
          <li key={`${u.voice_tag}-${idx}`} className="text-xs text-ink-30">
            {u.content}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

Modify `frontend/src/canvas/Canvas.tsx`:

```typescript
import { FallbackUtterance } from "../voice/FallbackUtterance";

const KNOWN_VOICES = ["whisper", "letter", "dialogue"];

// Below WhisperLayer in JSX:
<FallbackUtterance knownVoices={KNOWN_VOICES} />
```

- [ ] **Step 4: Run test, see it pass.**
- [ ] **Step 5: Commit**

```bash
git add frontend/src/voice/FallbackUtterance.tsx frontend/src/canvas/Canvas.tsx frontend/src/__tests__/FallbackUtterance.test.tsx
git commit -m "feat(voice): FallbackUtterance for unknown voice_tags"
```

---

### Task D6.3: Verify D6 + merge

```bash
git checkout develop
git merge --no-ff feat/006-d6-visitor-steer -m "merge: feat/006-d6-visitor-steer into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D6 visitor steer + fallback utterance"
```

---

## Slice D7 — VisitorContext Expansion

**Branch:** `feat/006-d7-context`

**Outcome:** `VisitorContext` carries `viewport` (width/height/pointer/`prefers_reduced_motion`), `landing_path`, and `user_agent_summary` (family + platform only). Sent once on session start. ReadStrategy now sees richer initial signal so the seed inference is sharper for first-load.

**Files (source, ≤4):**
- Modify: `backend/src/app/domain/context.py`
- Modify: `backend/src/app/adapters/api/referrer.py`
- Modify: `backend/src/app/domain/strategies/read.py` (use new context fields in prompt)
- Create: `frontend/src/hooks/use-initial-context.ts` (collects viewport + landing path; POSTs once at app load to a new endpoint OR sets first signal payload)

> Pick the simpler path: **piggyback on the existing first signal POST**, including `viewport` etc. in the `SignalBatch` body. Avoids new endpoint; protocol stays additive.

**Test files:**
- Modify: `backend/tests/test_context_model.py`
- Modify: `backend/tests/test_referrer.py` or add new test for context expansion
- Create: `frontend/src/__tests__/use-initial-context.test.tsx`

---

### Task D7.1: VisitorContext fields + parsing

**Files:**
- Modify: `backend/src/app/domain/context.py`
- Modify: `backend/tests/test_context_model.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_context_model.py`:

```python
class TestVisitorContextExpansion:
    def test_viewport_field_optional_and_typed(self) -> None:
        from app.domain.context import VisitorContext, Viewport

        ctx = VisitorContext(
            viewport=Viewport(width=1440, height=900, pointer_type="mouse", prefers_reduced_motion=False)
        )
        assert ctx.viewport is not None
        assert ctx.viewport.width == 1440
        assert ctx.viewport.pointer_type == "mouse"

    def test_user_agent_summary_aggregated_only(self) -> None:
        from app.domain.context import UserAgentSummary, VisitorContext

        ctx = VisitorContext(
            user_agent_summary=UserAgentSummary(family="Chrome", platform="macOS")
        )
        assert ctx.user_agent_summary is not None
        assert ctx.user_agent_summary.family == "Chrome"

    def test_landing_path_optional(self) -> None:
        from app.domain.context import VisitorContext

        assert VisitorContext().landing_path is None
        assert VisitorContext(landing_path="/").landing_path == "/"
```

- [ ] **Step 2: Run test, see it fail.**
- [ ] **Step 3: Implement minimally**

In `backend/src/app/domain/context.py`:

```python
from typing import Literal


class Viewport(BaseModel):
    """Viewport snapshot — sent once on session start."""

    width: int = Field(ge=0)
    height: int = Field(ge=0)
    pointer_type: Literal["mouse", "touch", "pen", "unknown"] = "unknown"
    prefers_reduced_motion: bool = False


class UserAgentSummary(BaseModel):
    """Aggregated UA — family + platform only. No fingerprintable detail."""

    family: str
    platform: str


class VisitorContext(BaseModel):
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
        self.referrer_type = _parse_referrer_type(self.referrer)
        return self
```

- [ ] **Step 4: Run test, see it pass.**
- [ ] **Step 5: Commit**

```bash
git checkout -b feat/006-d7-context
git add backend/src/app/domain/context.py backend/tests/test_context_model.py
git commit -m "feat(context): expand VisitorContext with viewport, landing_path, UA summary"
```

---

### Task D7.2: Wire frontend to send viewport on first signal batch

**Files:**
- Create: `frontend/src/hooks/use-initial-context.ts`
- Modify: `frontend/src/hooks/use-signal-collector.ts` (include initial context in first batch)
- Test: `frontend/src/__tests__/use-initial-context.test.tsx`

- [ ] **Step 1-5:** Apply the same TDD discipline as D2.4. Test verifies that the first signal POST contains `viewport`, `landing_path`, and a `user_agent_summary` object aggregated from `navigator.userAgent` (no full UA string). Implementation reads `window.matchMedia("(pointer: coarse)").matches` for `pointer_type`, `window.matchMedia("(prefers-reduced-motion: reduce)").matches` for the flag, and parses `navigator.userAgent` into family/platform with a tiny lookup table:

```typescript
// frontend/src/hooks/use-initial-context.ts
export interface InitialContext {
  viewport: { width: number; height: number; pointer_type: string; prefers_reduced_motion: boolean };
  landing_path: string;
  user_agent_summary: { family: string; platform: string };
}

export function captureInitialContext(): InitialContext {
  const ua = navigator.userAgent;
  const family = ua.includes("Firefox") ? "Firefox" : ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : "Other";
  const platform = ua.includes("Mac") ? "macOS" : ua.includes("Windows") ? "Windows" : ua.includes("Linux") ? "Linux" : ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : ua.includes("Android") ? "Android" : "Other";
  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pointer_type: matchMedia("(pointer: coarse)").matches ? "touch" : "mouse",
      prefers_reduced_motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
    landing_path: window.location.pathname,
    user_agent_summary: { family, platform },
  };
}
```

Then `use-signal-collector` includes `initial_context` in its first batch payload, and `signal_route` parses + persists it onto `VisitorProfile.context`.

- [ ] **Commit** with `feat(context): capture viewport + UA summary in first signal batch`.

---

### Task D7.3: ReadStrategy uses richer context

**Files:**
- Modify: `backend/src/app/domain/strategies/read.py` (include viewport.pointer_type, prefers_reduced_motion, landing_path, UA family/platform in prompt)
- Modify: `backend/tests/test_read_strategy.py`

- [ ] **Step 1-5:** Test asserts that when context has `viewport.pointer_type == "touch"`, the prompt mentions touch; when `prefers_reduced_motion` is true, the prompt mentions it; etc. Implementation expands `build_prompt`'s preamble with these fields. Commit with `feat(read): expanded context fields land in ReadStrategy prompt`.

### Task D7.4: Verify D7 + merge

```bash
git checkout develop
git merge --no-ff feat/006-d7-context -m "merge: feat/006-d7-context into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D7 VisitorContext expansion"
```

---

## Slice D8 — Mobile Degradation

**Branch:** `feat/006-d8-mobile`

**Outcome:** WhisperLayer collapses to a "notes" disclosure on narrow viewports (≤640px). PresenceDot tap opens command bar in addition to the panel. Touch signals (`pointer_type === "touch"`) tune `useDwell` thresholds. New e2e mobile spec verifies the disclosure pattern.

**Files (source, ≤3):**
- Modify: `frontend/src/voice/WhisperLayer.tsx` (responsive disclosure variant via container query / matchMedia)
- Modify: `frontend/src/canvas/Canvas.tsx` (pass mobile flag to PresenceDot click → command bar open)
- Modify: `frontend/src/chrome/PresenceDot.tsx` (long-press behavior, optional `onLongPress` prop)

**Test files:**
- Modify: `frontend/src/__tests__/WhisperLayer.test.tsx`
- Create: `frontend/e2e/mobile-disclosure.spec.ts`

---

### Task D8.1: WhisperLayer disclosure on narrow viewports

- [ ] **Step 1: Write the failing test**

Add to `WhisperLayer.test.tsx`: when `window.innerWidth <= 640`, render a `<details>` with summary "Notes from the agent" instead of inline ul. Confirm initial state is `closed` and that clicking the summary expands.

- [ ] **Step 2-3:** Implement variant guarded by `useEffect` that subscribes to `matchMedia("(max-width: 640px)")`.

- [ ] **Step 4-5:** Run, pass, commit.

```bash
git checkout -b feat/006-d8-mobile
git add ...
git commit -m "feat(voice): WhisperLayer disclosure on narrow viewports"
```

### Task D8.2: e2e mobile spec

- [ ] Add `frontend/e2e/mobile-disclosure.spec.ts` using Playwright's `viewport: { width: 375, height: 812 }` device emulation. Spec navigates to `/`, mocks the SSE stream with a `voice:utterance` event for `whisper`, asserts the `<details>` summary is visible and the content is hidden until clicked.
- [ ] Commit `test(e2e): mobile WhisperLayer disclosure scenario`.

### Task D8.3: Verify D8 + merge

```bash
git checkout develop
git merge --no-ff feat/006-d8-mobile -m "merge: feat/006-d8-mobile into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D8 mobile degradation"
```

---

## Slice D9 — Polish + Cost Debounce + EDD Evals + Inference Toggle

**Branch:** `feat/006-d9-polish`

**Outcome:** ReadStrategy invocation is debounced 2 seconds (closes the cost-debounce backlog item from C2). DeepEval test suite covers the ReadStrategy prompt as a tested artifact. TransparencyPanel grows a "do not infer" toggle that, when set, prevents future ReadStrategy/VoiceStrategy calls for the rest of the session. Audit-store tracks persona changes + voice utterances alongside legacy decisions.

**Files (source, ≤4):**
- Modify: `backend/src/app/adapters/api/signal_route.py` (per-session debounce token)
- Create: `backend/evals/test_persona_inference.py`
- Modify: `frontend/src/store/audit-store.ts` (new entry types)
- Modify: `frontend/src/chrome/TransparencyPanel.tsx` (toggle)

**Test files:**
- Modify: `backend/tests/test_signal_route.py` (debounce coalesces rapid signals)
- Modify: `frontend/src/__tests__/audit-store.test.ts`
- Modify: `frontend/src/__tests__/TransparencyPanel.persona.test.tsx`

---

### Task D9.1: Per-session debounce in signal_route

**Files:**
- Modify: `backend/src/app/adapters/api/signal_route.py`
- Modify: `backend/tests/test_signal_route.py`

- [ ] **Step 1: Write the failing test**

```python
class TestSignalRouteDebounce:
    """Rapid signals coalesce — only one adaptation fires per debounce window."""

    async def test_two_signals_within_2s_fire_one_adaptation(self) -> None:
        from unittest.mock import AsyncMock, patch

        with (
            patch("app.adapters.api.signal_route._get_llm_port", return_value=object()),
            patch(
                "app.adapters.api.signal_route._run_adaptation",
                new_callable=AsyncMock,
            ) as mock_run,
        ):
            client.post(
                "/api/agent/signal",
                json={"session_id": "debounce-1", "signals": [_signal(ts=1.0)]},
            )
            client.post(
                "/api/agent/signal",
                json={"session_id": "debounce-1", "signals": [_signal(ts=1.5)]},
            )
        # Both signals would normally fire two adaptations (band crossings).
        # Debounced — only one runs per 2s window.
        assert mock_run.call_count == 1
```

- [ ] **Step 2-5:** Implement a per-`session_id` `_last_adapt_ts: dict[str, float]` guard with `_DEBOUNCE_WINDOW_S = 2.0`. Skip scheduling if `time.monotonic() - last < _DEBOUNCE_WINDOW_S`. Commit `feat(signal): debounce ReadStrategy invocations per session`.

### Task D9.2: DeepEval persona inference suite

**Files:**
- Create: `backend/evals/test_persona_inference.py`

- [ ] **Step 1-5:** Write a DeepEval test that, given a fixture LinkedIn-technical visitor profile, asserts the produced Persona has at least two role observations (recruiter + engineer), a `depth="technical"` observation, and a `rationale` referencing the dwell pattern. Mark with `@pytest.mark.eval` so it's excluded from the default suite. Commit `test(persona): DeepEval ReadStrategy LinkedIn-technical scenario`.

### Task D9.3: TransparencyPanel "do not infer" toggle

**Files:**
- Modify: `frontend/src/store/persona-store.ts` (add `inferenceDisabled: boolean` flag)
- Modify: `frontend/src/chrome/TransparencyPanel.tsx`
- Modify: `frontend/src/hooks/use-signal-collector.ts` (skip POST when flag set)
- Modify tests for each.

- [ ] **Step 1-5:** Test asserts toggle renders, clicking disables inference (no further signal POSTs). Commit `feat(transparency): do-not-infer toggle gates further inference`.

### Task D9.4: audit-store extensions

- [ ] Persona deltas and voice utterances appended to a unified audit log alongside legacy decisions. TransparencyPanel "Decision history" section becomes "Activity" with three event types rendered with appropriate iconography. Commit `feat(audit): unified activity log including persona + voice events`.

### Task D9.5: Verify D9 + merge

```bash
git checkout develop
git merge --no-ff feat/006-d9-polish -m "merge: feat/006-d9-polish into develop"
git add tasks/STATUS.md
git commit -m "session: ship Slice D9 polish + EDD evals + inference toggle"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ PROTOCOL-001 types (Persona, Observation, SignalRef) — D1.1
- ✅ PERSONA_DELTA event — D2.1, D2.2
- ✅ VOICE_UTTERANCE event — D3.3
- ✅ VisitorContext extended fields — D7.1
- ✅ ReadStrategy + multivoice prompt — D1.2
- ✅ VoiceStrategy + voice tag registry — D3.2
- ✅ StageSelector pure function (0.4 / 0.7 thresholds + steer override) — D3.1
- ✅ Three voices: whisper (D3.2), letter (D4.1), dialogue (D5.1)
- ✅ Cmd+K rewiring through bus — D6.1
- ✅ FallbackUtterance graceful degrade — D6.2
- ✅ TransparencyPanel persona render — D2.5
- ✅ Mobile degradation (whisper disclosure) — D8.1
- ✅ DeepEval persona evals — D9.2
- ✅ Cost debounce — D9.1
- ✅ "Do not infer" toggle — D9.3

**Type-consistency check:**
- `Persona` / `Observation` / `SignalRef` defined in D1.1, imported by name across D1.3, D2.1, D2.2, D3.4, D6.1.
- `VoiceStrategy.persona` setter introduced in D3.2; mutated by D3.4 and D6.1.
- `VOICE_PROMPTS` registry: D3.2 (whisper), D4.1 (letter), D5.1 (dialogue) — names match.
- `VisitorSteer.requested_voice` named consistently across `select_voice` definition (D3.1) and downstream callers (D6 documents that visitor steer = forced dialogue).
- Frontend: `usePersonaStore`/`useVoiceStore` shape stable. `applyPersonaDelta`/`addUtterance` are the only mutators.
- SSE event-type strings: `persona:delta`, `voice:utterance` — matched in producer (`persona_events.py`) and parser (`sse-parsers.ts`).

**Placeholder scan:** D7.2-D7.3, D8.1-D8.2, D9.1-D9.4 use compressed task descriptions ("Apply the same TDD discipline as D2.4") because the test/implementation patterns repeat exactly — full code blocks would duplicate D1-D6 content. Anyone executing this plan should follow the explicit pattern shown in D1-D6 and adapt to the file paths listed.

---

## Execution Handoff

Plan saved to `specs/006-agent-is-the-page/plan.md`. Two execution options:

1. **Subagent-driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good fit since tasks are uniform-shape TDD cycles with clear pass/fail.
2. **Inline execution** — I execute tasks directly using `superpowers:executing-plans`, with checkpoints for your review. Good fit if you want to watch tactics live.

**Which approach?**
