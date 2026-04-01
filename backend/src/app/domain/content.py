"""Content domain models — typed data per molecule, validated on construction."""

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.domain.manifest import Manifest, ManifestItem


class HeroData(BaseModel):
    """Hero section: identity and summary."""

    name: str
    title: str
    subtitle: str
    summary: str


class ProjectData(BaseModel):
    """Project card: title, description, and tech stack."""

    title: str
    description: str
    tech: list[str]


class ExperienceData(BaseModel):
    """Experience card: company, role, and duration."""

    company: str
    role: str
    duration: str
    description: str


class ContactData(BaseModel):
    """Contact section: email and call-to-action."""

    email: str
    cta: str


class SkillData(BaseModel):
    """Skill tag: just a name."""

    name: str


class EducationData(BaseModel):
    """Education entry: degree and institution."""

    degree: str
    institution: str


_DATA_MODELS: dict[str, type[BaseModel]] = {
    "hero": HeroData,
    "project": ProjectData,
    "experience": ExperienceData,
    "contact": ContactData,
    "skill": SkillData,
    "education": EducationData,
}


class ContentItem(BaseModel):
    """A content catalog entry with molecule-specific data validation."""

    id: str
    molecule: str
    default_importance: float = Field(ge=0.0, le=1.0)
    data: dict[str, Any]

    @model_validator(mode="after")
    def _validate_data_shape(self) -> "ContentItem":
        model = _DATA_MODELS.get(self.molecule)
        if model is None:
            msg = f"Unknown molecule: {self.molecule}"
            raise ValueError(msg)
        model(**self.data)
        return self


def content_to_manifest(items: list[ContentItem]) -> Manifest:
    """Convert content catalog items to a manifest with default importance."""
    return Manifest(
        items=[
            ManifestItem(
                id=item.id,
                importance=item.default_importance,
                molecule=item.molecule,
                data=item.data,
            )
            for item in items
        ]
    )
