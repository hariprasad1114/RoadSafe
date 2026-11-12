import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders children and handles disabled state", () => {
    render(
      <BrowserRouter>
        <Button disabled>Click me</Button>
      </BrowserRouter>,
    );
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeDisabled();
  });
});

describe("utils", () => {
  it("formats numbers", async () => {
    const { formatNumber, formatPercent } = await import("@/lib/utils");
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatPercent(0.5)).toBe("50.0%");
  });
});
