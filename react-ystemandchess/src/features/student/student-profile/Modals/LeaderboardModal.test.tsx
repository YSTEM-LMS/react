/**
 * LeaderboardModal — covers the "Go To Backpack" button (Task 8), previously
 * a dead button with no handler. Wired to navigate to the existing
 * /student-inventory screen (which has a Backpack tab), closing this modal
 * first — same close-then-navigate pattern ActivitiesModal already uses.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaderboardModal from "./LeaderboardModal";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ login: "test-token" }],
}));

jest.mock("../../../../environments", () => ({
  environment: { urls: { middlewareURL: "http://mw" } },
}));

function mockFetch() {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          schools: [],
          countries: [],
          states: [],
          data: { leaderboard: [], pagination: { has_more: false } },
        }),
    })
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("LeaderboardModal", () => {
  it('closes the modal and navigates to /student-inventory when "Go To Backpack" is clicked', async () => {
    global.fetch = mockFetch() as any;
    const onClose = jest.fn();
    render(<LeaderboardModal onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /go to.*backpack/i }));

    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/student-inventory");
  });

  it("closes when the overlay is clicked", async () => {
    global.fetch = mockFetch() as any;
    const onClose = jest.fn();
    const { container } = render(<LeaderboardModal onClose={onClose} />);

    fireEvent.click(container.querySelector(".modal-overlay")!);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders the leaderboard table shell", async () => {
    global.fetch = mockFetch() as any;
    render(<LeaderboardModal onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
  });
});
