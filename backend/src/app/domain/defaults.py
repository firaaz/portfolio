"""Default manifest — hardcoded walking skeleton data (replaced by YAML in Slice 1)."""

from app.domain.manifest import Manifest, ManifestItem

DEFAULT_MANIFEST = Manifest(
    items=[
        ManifestItem(
            id="hero",
            importance=1.0,
            molecule="hero",
            data={
                "name": "Firaaz Farook",
                "title": "Senior Software Engineer",
                "subtitle": "AI Systems & Agentic Platforms",
                "summary": (
                    "6+ years building production AI systems."
                    " Currently shipping agentic platforms at scale."
                ),
            },
        ),
        ManifestItem(
            id="project-salama",
            importance=0.75,
            molecule="project",
            data={
                "title": "Salama AI Platform",
                "description": (
                    "LangGraph-powered agentic platform serving 25K+ queries/month"
                ),
                "tech": ["LangGraph", "Python", "FastAPI"],
            },
        ),
        ManifestItem(
            id="experience-deloitte",
            importance=0.7,
            molecule="experience",
            data={
                "company": "Deloitte",
                "role": "Senior Consultant",
                "duration": "4 years",
                "description": ("Led GenAI initiatives across enterprise clients"),
            },
        ),
        ManifestItem(
            id="project-genai-migration",
            importance=0.65,
            molecule="project",
            data={
                "title": "GenAI Code Migration",
                "description": (
                    "Led 4-6 engineers on large-scale code migration using LLMs"
                ),
                "tech": ["Python", "LLMs", "AST"],
            },
        ),
        ManifestItem(
            id="experience-current",
            importance=0.7,
            molecule="experience",
            data={
                "company": "Emaratech",
                "role": "Senior Software Engineer",
                "duration": "Current",
                "description": ("Building AI systems and agentic platforms"),
            },
        ),
        ManifestItem(
            id="contact",
            importance=0.6,
            molecule="contact",
            data={
                "email": "firaazfarook19@gmail.com",
                "cta": "Let's talk",
            },
        ),
        ManifestItem(
            id="skill-python",
            importance=0.3,
            molecule="skill",
            data={"name": "Python"},
        ),
        ManifestItem(
            id="skill-typescript",
            importance=0.3,
            molecule="skill",
            data={"name": "TypeScript"},
        ),
        ManifestItem(
            id="skill-langgraph",
            importance=0.3,
            molecule="skill",
            data={"name": "LangGraph"},
        ),
        ManifestItem(
            id="skill-docker",
            importance=0.25,
            molecule="skill",
            data={"name": "Docker"},
        ),
        ManifestItem(
            id="skill-kubernetes",
            importance=0.25,
            molecule="skill",
            data={"name": "Kubernetes"},
        ),
        ManifestItem(
            id="skill-aws",
            importance=0.25,
            molecule="skill",
            data={"name": "AWS ML"},
        ),
        ManifestItem(
            id="education-be",
            importance=0.2,
            molecule="education",
            data={
                "degree": "B.E. Computer Science",
                "institution": "University of Peradeniya",
            },
        ),
    ]
)
