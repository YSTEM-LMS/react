import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import NavBar from "./NavBar";

jest.mock("../../globals", () => ({
  SetPermissionLevel: jest.fn(),
}));

jest.mock("react-cookie", () => ({
  useCookies: jest.fn(),
}));

jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    },
  };
});

jest.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: (props: any) => <span data-testid="fa-icon" {...props} />,
}));

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");
    return {
      Link: ({ to, children, ...rest }: any) => (
        <a href={typeof to === "string" ? to : "#"} {...rest}>
          {children}
        </a>
      ),
    };
  },
  { virtual: true },
);

import { SetPermissionLevel } from "../../globals";
import { useCookies } from "react-cookie";

describe("NavBar", () => {
  const mockedSetPermissionLevel = SetPermissionLevel as jest.Mock;
  const mockedUseCookies = useCookies as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderNavBar = () =>
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );

  test("renders Login link when user is logged out", async () => {
    mockedUseCookies.mockReturnValue([{}, jest.fn(), jest.fn()]);
    mockedSetPermissionLevel.mockResolvedValue({ error: "unauthenticated" });

    renderNavBar();

    expect(await screen.findByText(/Login/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alice/i)).toBeNull();
  });

  test("shows Analytics link for admin role, hides it for other roles", async () => {
    mockedUseCookies.mockReturnValue([
      { login: "mockToken" },
      jest.fn(),
      jest.fn(),
    ]);
    mockedSetPermissionLevel.mockResolvedValue({
      username: "Admin",
      role: "admin",
    });

    renderNavBar();

    await screen.findByRole("button", { name: /Admin/i });
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  test("hides Analytics link for non-admin role", async () => {
    mockedUseCookies.mockReturnValue([
      { login: "mockToken" },
      jest.fn(),
      jest.fn(),
    ]);
    mockedSetPermissionLevel.mockResolvedValue({
      username: "Alice",
      role: "student",
    });

    renderNavBar();

    await screen.findByRole("button", { name: /Alice/i });
    expect(screen.queryByText("Analytics")).toBeNull();
  });

  test("renders username and hides Login when user is logged in", async () => {
    mockedUseCookies.mockReturnValue([
      { login: "mockToken" },
      jest.fn(),
      jest.fn(),
    ]);
    mockedSetPermissionLevel.mockResolvedValue({
      username: "Alice",
      role: "student",
    });

    renderNavBar();

    const usernameButton = await screen.findByRole("button", {
      name: /Alice/i,
    });
    expect(screen.queryByText(/Login/i)).toBeNull();

    fireEvent.click(usernameButton);
    const profileLink = await screen.findByText(/Profile/i);
    expect(profileLink.closest("a")).toHaveAttribute(
      "href",
      "/student-profile",
    );
  });

  test("shows Add Student in profile dropdown for parent role", async () => {
    mockedUseCookies.mockReturnValue([
      { login: "mockToken" },
      jest.fn(),
      jest.fn(),
    ]);
    mockedSetPermissionLevel.mockResolvedValue({
      username: "Bob",
      role: "parent",
    });

    renderNavBar();

    const usernameButton = await screen.findByRole("button", {
      name: /Bob/i,
    });
    fireEvent.click(usernameButton);

    const addStudentLink = await screen.findByText(/Add Student/i);
    expect(addStudentLink.closest("a")).toHaveAttribute(
      "href",
      "/signup/parent/add-child",
    );
  });

  test("toggles About Us dropdown open and closes on outside click", async () => {
    mockedUseCookies.mockReturnValue([{}, jest.fn(), jest.fn()]);
    mockedSetPermissionLevel.mockResolvedValue({ error: "unauthenticated" });

    renderNavBar();

    const aboutUsTrigger = screen.getByText(/About Us/i);
    fireEvent.click(aboutUsTrigger);

    expect(
      await screen.findByText(/Benefit of Computer Science/i),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() =>
      expect(screen.queryByText(/Benefit of Computer Science/i)).toBeNull(),
    );
  });

  test("mobile menu toggles navigation visibility", async () => {
    mockedUseCookies.mockReturnValue([{}, jest.fn(), jest.fn()]);
    mockedSetPermissionLevel.mockResolvedValue({ error: "unauthenticated" });

    renderNavBar();

    const navsBefore = screen.getAllByRole("navigation").length;
    const toggleBtn = screen.getByRole("button", { name: /toggle menu/i });

    fireEvent.click(toggleBtn);
    const navsOpen = screen.getAllByRole("navigation").length;
    expect(navsOpen).toBeGreaterThan(navsBefore);

    fireEvent.click(toggleBtn);
    const navsClosed = screen.getAllByRole("navigation").length;
    expect(navsClosed).toBe(navsBefore);
  });

  test("logout removes cookies and redirects to /login", async () => {
    const removeCookieMock = jest.fn();
    mockedUseCookies.mockReturnValue([
      { login: "mockToken" },
      jest.fn(),
      removeCookieMock,
    ]);
    mockedSetPermissionLevel.mockResolvedValue({
      username: "Alice",
      role: "student",
    });

    renderNavBar();

    const usernameButton = await screen.findByRole("button", {
      name: /Alice/i,
    });
    fireEvent.click(usernameButton);

    const logoutBtn = await screen.findByText(/Log Out/i);
    fireEvent.click(logoutBtn);

    expect(removeCookieMock).toHaveBeenCalledWith("login");
    expect(removeCookieMock).toHaveBeenCalledWith("eventId");
    expect(removeCookieMock).toHaveBeenCalledWith("timerStatus");
  });
});
