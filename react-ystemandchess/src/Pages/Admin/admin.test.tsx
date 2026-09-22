import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CookiesProvider } from "react-cookie";
import Admin from "./Admin";

// Mock environment
jest.mock("../../environments", () => ({
  environment: {
    urls: {
      middlewareURL: "http://mock-api.com",
    },
  },
}));

// Mock navigate
let mockedNavigate = jest.fn();

jest.mock("react-router", () => {
  const actual = jest.requireActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});
// Mock useCookies
jest.mock("react-cookie", () => {
  const actual = jest.requireActual("react-cookie");
  return {
    ...actual,
    useCookies: () => [{ login: "mock-jwt-token" }, jest.fn()],
  };
});

// Mock student with 30 completed lessons
const mockStudent = {
  _id: "123",
  firstName: "Test",
  lastName: "Student",
  username: "student1",
  role: "student",
  email: "test@example.com",
  accountCreatedAt: "2023-01-01",
  lessonsCompleted: Array.from({ length: 30 }, (_, i) => ({
    _id: `lesson-${i}`,
    piece: `Lesson ${i}`,
    lessonNumber: i,
  })),
  timePlayed: 120,
};

describe("Admin Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders search input and button", () => {
    render(
      <MemoryRouter>
        <CookiesProvider>
          <Admin />
        </CookiesProvider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(
      "Type student username to search"
    );
    const button = screen.getByRole("button", { name: /search/i });

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it("calls student search API and shows student with 30 completed lessons", async () => {
    global.fetch = jest
      .fn()
      // verifyRole API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true }),
      } as Response)
      // getStudent API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ["student1"],
      } as Response)
      // getUser API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStudent,
      } as Response);

    render(
      <MemoryRouter>
        <CookiesProvider>
          <Admin />
        </CookiesProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const input = screen.getByPlaceholderText(
      "Type student username to search"
    );
    fireEvent.change(input, { target: { value: "student1" } });

    const button = screen.getByRole("button", { name: /search/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByText("Test Student")).toBeInTheDocument()
    );

    expect(screen.getByText("(student1)")).toBeInTheDocument();
    expect(screen.getByText("Lessons Completed: 30")).toBeInTheDocument();
    expect(screen.getByText("Time Played: 120 mins")).toBeInTheDocument();
  });

  it("redirects to homepage if verification fails", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Not authorized" }),
    } as Response);

    render(
      <MemoryRouter>
        <CookiesProvider>
          <Admin />
        </CookiesProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith("/");
    });
  });
});
