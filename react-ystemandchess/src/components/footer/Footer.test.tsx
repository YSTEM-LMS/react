import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

test("renders branding and mission statement", () => {
  render(<Footer />);

  expect(screen.getByText("YSTEM")).toBeInTheDocument();
  expect(screen.getByText("&CHESS")).toBeInTheDocument();
  expect(
    screen.getByText("Empowering Tomorrow's STEM Leaders"),
  ).toBeInTheDocument();
});

test("renders contact info with correct links", () => {
  render(<Footer />);

  const callLink = screen.getByText("Call Us").closest("a");
  expect(callLink).toHaveAttribute("href", "tel:+12089965071");

  const emailLink = screen.getByText("Email Us").closest("a");
  expect(emailLink).toHaveAttribute("href", "mailto:info@ystemandchess.com");
});

test("renders social media links with correct hrefs", () => {
  render(<Footer />);

  expect(screen.getByLabelText("Facebook")).toHaveAttribute(
    "href",
    "https://web.facebook.com/YSTEMandChess",
  );
  expect(screen.getByLabelText("Instagram")).toHaveAttribute(
    "href",
    "https://www.instagram.com/stemwithstemy",
  );
  expect(screen.getByLabelText("Twitter")).toHaveAttribute(
    "href",
    "https://x.com/ystemandchess",
  );
  expect(screen.getByLabelText("LinkedIn")).toHaveAttribute(
    "href",
    "https://www.linkedin.com/company/ystemandchessinc",
  );
});

test("renders copyright with current year and Play/Learn/Empower tags", () => {
  render(<Footer />);

  const year = new Date().getFullYear();
  expect(
    screen.getByText(`© ${year} Y STEM AND CHESS INC. | Boise, Idaho`),
  ).toBeInTheDocument();
  expect(screen.getByText("Play")).toBeInTheDocument();
  expect(screen.getByText("Learn")).toBeInTheDocument();
  expect(screen.getByText("Empower")).toBeInTheDocument();
});
