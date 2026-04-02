"""EDD: Same input must produce similar output across multiple runs."""

import pytest

from app.domain.agent import assemble_manifest
from app.domain.content import ContentItem
from app.domain.context import VisitorContext

MAX_VARIANCE = 0.15
NUM_RUNS = 3


@pytest.mark.eval
class TestManifestConsistency:
    """Importance scores should be stable across repeated runs (±0.15)."""

    @pytest.fixture
    def context(self) -> VisitorContext:
        return VisitorContext(referrer="https://linkedin.com/in/recruiter")

    @pytest.mark.asyncio
    async def test_scores_stable_across_runs(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        runs: list[dict[str, float]] = []
        for _ in range(NUM_RUNS):
            result = await assemble_manifest(context, catalog, llm_provider)
            scores = {item.id: item.importance for item in result.items}
            runs.append(scores)

        all_ids = runs[0].keys()
        for item_id in all_ids:
            scores = [run[item_id] for run in runs]
            spread = max(scores) - min(scores)
            assert spread <= MAX_VARIANCE, (
                f"{item_id} spread {spread:.2f} exceeds {MAX_VARIANCE} "
                f"across {NUM_RUNS} runs: {scores}"
            )
