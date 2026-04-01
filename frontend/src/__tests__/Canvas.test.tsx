import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Canvas } from "../canvas/Canvas";
import { useManifestStore } from "../store/manifest-store";

afterEach(() => {
  useManifestStore.setState({ items: [] });
  cleanup();
});

describe("Canvas", () => {
  it("renders hero name and title when manifest has hero item", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
          molecule: "hero",
          data: { name: "Firaaz Farook", title: "Senior AI Engineer" },
        },
      ],
    });

    render(<Canvas />);
    expect(screen.getByText("Firaaz Farook")).toBeInTheDocument();
    expect(screen.getByText("Senior AI Engineer")).toBeInTheDocument();
  });

  it("renders loading state when manifest is empty", () => {
    render(<Canvas />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders non-hero items as plain text", () => {
    useManifestStore.setState({
      items: [
        {
          id: "hero",
          importance: 1.0,
          molecule: "hero",
          data: { name: "Firaaz Farook", title: "Senior AI Engineer" },
        },
        {
          id: "proj",
          importance: 0.5,
          molecule: "project",
          data: { title: "Salama AI" },
        },
      ],
    });

    render(<Canvas />);
    expect(screen.getByText("Salama AI")).toBeInTheDocument();
  });
});
