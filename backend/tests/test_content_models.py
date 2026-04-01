"""Content domain model validation — each molecule type enforces its data shape."""

import pytest
from pydantic import ValidationError

from app.domain.content import ContentItem


class TestHeroContent:
    """Hero molecule requires name, title, subtitle, summary."""

    def test_valid_hero(self) -> None:
        item = ContentItem(
            id="hero",
            molecule="hero",
            default_importance=1.0,
            data={
                "name": "Firaaz Farook",
                "title": "Senior Software Engineer",
                "subtitle": "AI Systems",
                "summary": "Building AI systems.",
            },
        )
        assert item.molecule == "hero"

    def test_hero_missing_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="hero",
                molecule="hero",
                default_importance=1.0,
                data={"title": "Eng", "subtitle": "AI", "summary": "Building."},
            )


class TestProjectContent:
    """Project molecule requires title, description, tech list."""

    def test_valid_project(self) -> None:
        item = ContentItem(
            id="project-1",
            molecule="project",
            default_importance=0.75,
            data={
                "title": "My Project",
                "description": "A great project",
                "tech": ["Python", "FastAPI"],
            },
        )
        assert item.molecule == "project"

    def test_project_missing_title_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="project-1",
                molecule="project",
                default_importance=0.75,
                data={"description": "A project", "tech": ["Python"]},
            )


class TestExperienceContent:
    """Experience molecule requires company, role, duration, description."""

    def test_valid_experience(self) -> None:
        item = ContentItem(
            id="exp-1",
            molecule="experience",
            default_importance=0.7,
            data={
                "company": "Acme",
                "role": "Engineer",
                "duration": "2 years",
                "description": "Built things.",
            },
        )
        assert item.molecule == "experience"

    def test_experience_missing_company_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="exp-1",
                molecule="experience",
                default_importance=0.7,
                data={
                    "role": "Engineer",
                    "duration": "2y",
                    "description": "Built.",
                },
            )


class TestContactContent:
    """Contact molecule requires email, cta."""

    def test_valid_contact(self) -> None:
        item = ContentItem(
            id="contact",
            molecule="contact",
            default_importance=0.6,
            data={"email": "test@example.com", "cta": "Let's talk"},
        )
        assert item.molecule == "contact"

    def test_contact_missing_email_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="contact",
                molecule="contact",
                default_importance=0.6,
                data={"cta": "Let's talk"},
            )


class TestSkillContent:
    """Skill molecule requires name."""

    def test_valid_skill(self) -> None:
        item = ContentItem(
            id="skill-python",
            molecule="skill",
            default_importance=0.3,
            data={"name": "Python"},
        )
        assert item.molecule == "skill"

    def test_skill_missing_name_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="skill-python",
                molecule="skill",
                default_importance=0.3,
                data={},
            )


class TestEducationContent:
    """Education molecule requires degree, institution."""

    def test_valid_education(self) -> None:
        item = ContentItem(
            id="edu-1",
            molecule="education",
            default_importance=0.2,
            data={"degree": "B.E. CS", "institution": "MIT"},
        )
        assert item.molecule == "education"

    def test_education_missing_degree_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="edu-1",
                molecule="education",
                default_importance=0.2,
                data={"institution": "MIT"},
            )


class TestContentItemConstraints:
    """Cross-cutting constraints on ContentItem."""

    def test_importance_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="hero",
                molecule="hero",
                default_importance=1.5,
                data={
                    "name": "X",
                    "title": "Y",
                    "subtitle": "Z",
                    "summary": "W",
                },
            )

    def test_unknown_molecule_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ContentItem(
                id="unknown",
                molecule="nonexistent",
                default_importance=0.5,
                data={"foo": "bar"},
            )
