import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import MentorSignUp from "./MentorSignUp";

const renderPage = () =>
  render(
    <MemoryRouter>
      <MentorSignUp />
    </MemoryRouter>
  );

test("renders the mentor sign up form", () => {
  renderPage();

  expect(screen.getByRole("heading", { name: /Mentor Sign Up/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Create a password")).toBeInTheDocument();
  expect(screen.getByLabelText(/Current Occupation \/ Education/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
});

test("does not show the account type selector", () => {
  renderPage();
  expect(screen.queryByText("Account Type")).not.toBeInTheDocument();
});

test("shows an enabled find-a-student search field", () => {
  renderPage();
  const menteeField = screen.getByPlaceholderText("Search students by username");
  expect(menteeField).toBeInTheDocument();
  expect(menteeField).not.toBeDisabled();
});

test("searches unmatched students and lets the mentor pick one", async () => {
  global.fetch = jest.fn((url) => {
    if (typeof url === "string" && url.includes("/user/mentorless")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(["alice_student", "bob_student"]),
      });
    }
    return Promise.reject(new Error(`unhandled fetch: ${url}`));
  }) as jest.Mock;

  renderPage();

  fireEvent.change(screen.getByPlaceholderText("Search students by username"), {
    target: { value: "student" },
  });

  // Debounced search resolves and lists matching students.
  const option = await screen.findByText("alice_student");
  fireEvent.click(option);

  // Selecting one shows the match and removes the results list.
  expect(screen.getByTestId("selected-student")).toHaveTextContent(
    "alice_student"
  );
  expect(screen.queryByTestId("student-results")).not.toBeInTheDocument();
});
