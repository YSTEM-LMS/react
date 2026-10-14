import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ParentSignUp from "./ParentSignUp";

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, text: () => Promise.resolve("") })
  ) as jest.Mock;
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ParentSignUp />
    </MemoryRouter>
  );

test("renders the parent sign up form", () => {
  renderPage();

  expect(screen.getByRole("heading", { name: /Parent Sign Up/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Occupation")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Create a password")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Re-enter your password")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Zip Code")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
});

// These two specs exercise the component's own validate() path. They submit the
// form directly rather than clicking the submit button, because the form's inputs
// carry the native `required` attribute: in a real browser (and in jsdom >= 20)
// interactive constraint validation blocks submission while those fields are empty,
// so onSubmit would never fire. Clicking used to work only because jsdom 16, which
// react-scripts pinned via Jest 27, did not implement constraint validation.
const submitForm = () =>
  fireEvent.submit(screen.getByRole("form", { name: "Parent Sign Up Form" }));

test("requires accepting the terms before submitting", async () => {
  renderPage();

  submitForm();

  expect(
    await screen.findByText("Please accept the terms and conditions.")
  ).toBeInTheDocument();
});

test("shows a validation error for an invalid email", async () => {
  renderPage();

  await userEvent.click(screen.getByLabelText(/I accept the terms and conditions/i));
  await userEvent.type(screen.getByPlaceholderText("you@example.com"), "not-an-email");
  submitForm();

  expect(await screen.findByText("Invalid Email")).toBeInTheDocument();
});
