import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodexHomeSelector } from "./CodexHomeSelector";

const homes = [
  { id: "discord", name: "discord-test", sessions_dir: "/app/discord/home/.codex/sessions" },
  { id: "slack", name: "slack-test", sessions_dir: "/app/slack/home/.codex/sessions" },
];

describe("CodexHomeSelector", () => {
  it("renders homes, selection, and pointer activation", () => {
    const onSelect = vi.fn();
    render(
      <CodexHomeSelector
        homes={homes}
        loading={false}
        error=""
        selectedIndex={1}
        onSelect={onSelect}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("option", { name: /slack-test/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("option", { name: /discord-test/ }));
    expect(onSelect).toHaveBeenCalledWith(homes[0]);
  });

  it("shows an actionable empty state", () => {
    const onRetry = vi.fn();
    render(
      <CodexHomeSelector
        homes={[]}
        loading={false}
        error=""
        selectedIndex={0}
        onSelect={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/No mounted Codex homes/)).toBeInTheDocument();
    expect(screen.getByText(/home\/.codex\/sessions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows discovery errors and retries", () => {
    const onRetry = vi.fn();
    render(
      <CodexHomeSelector
        homes={[]}
        loading={false}
        error="invalid Codex homes root"
        selectedIndex={0}
        onSelect={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("invalid Codex homes root")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
