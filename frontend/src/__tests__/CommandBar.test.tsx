import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandBar } from "../chrome/CommandBar";

vi.mock("../hooks/use-command-bar", () => ({
  useCommandBar: () => ({
    submitCommand: mockSubmitCommand,
    isLoading: false,
  }),
}));

const mockSubmitCommand = vi.fn();

afterEach(() => {
  cleanup();
  mockSubmitCommand.mockClear();
});

describe("CommandBar", () => {
  it("renders nothing initially (closed state)", () => {
    render(<CommandBar />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens dialog on Cmd+K keydown", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens dialog on Ctrl+K keydown", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes dialog on second Cmd+K keydown", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits input on Enter and clears", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const input = screen.getByPlaceholderText("Ask about my experience...");
    fireEvent.change(input, { target: { value: "show AI projects" } });
    const form = input.closest("form");
    expect(form).toBeTruthy();
    if (form) fireEvent.submit(form);
    expect(mockSubmitCommand).toHaveBeenCalledWith("show AI projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not submit when input is empty", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const input = screen.getByPlaceholderText("Ask about my experience...");
    const form = input.closest("form");
    expect(form).toBeTruthy();
    if (form) fireEvent.submit(form);
    expect(mockSubmitCommand).not.toHaveBeenCalled();
  });

  it("has accessible dialog label when open", () => {
    render(<CommandBar />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByLabelText("Command bar")).toBeInTheDocument();
  });
});
