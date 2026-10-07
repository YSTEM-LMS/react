import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnalyticsLayout from "./AnalyticsLayout";

jest.mock("../../environments", () => ({
  environment: { urls: { middlewareURL: "http://mockurl.com" } },
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ login: "mock-jwt-token" }, jest.fn(), jest.fn()],
}));

describe("AnalyticsLayout", () => {
  it("renders three tabs: Individual, Zipcode, Global", () => {
    render(<AnalyticsLayout />);
    expect(screen.getByRole("tab", { name: /Individual/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Zipcode/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Global/i })).toBeInTheDocument();
  });

  it("defaults to Individual tab selected", () => {
    render(<AnalyticsLayout />);
    expect(screen.getByRole("tab", { name: /Individual/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /Zipcode/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("switches selection when a tab is clicked", () => {
    render(<AnalyticsLayout />);
    fireEvent.click(screen.getByRole("tab", { name: /Global/i }));
    expect(screen.getByRole("tab", { name: /Global/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /Individual/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("shows empty-state prompt before a student is selected", () => {
    render(<AnalyticsLayout />);
    expect(
      screen.getByText(/Search and select a student to view their analytics/i)
    ).toBeInTheDocument();
  });

  it("keeps Individual panel visible after date range is set", async () => {
    const { container } = render(<AnalyticsLayout />);
    const dateInputs = container.querySelectorAll('input[type="date"]');
    const startInput = dateInputs[0] as HTMLInputElement;
    const endInput = dateInputs[1] as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: "2026-05-01" } });
    fireEvent.change(endInput, { target: { value: "2026-05-04" } });

    const panel = screen.getByRole("tabpanel");
    expect(panel).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search students/i)
    ).toBeInTheDocument();
  });
});
