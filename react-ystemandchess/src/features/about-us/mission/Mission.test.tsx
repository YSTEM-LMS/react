import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Mission from './Mission';

const mockedNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockedNavigate,
}));

describe('Mission', () => {
  beforeEach(() => {
    mockedNavigate.mockClear();
  });

  it('renders the mission statement headings', () => {
    render(
      <MemoryRouter>
        <Mission />
      </MemoryRouter>
    );

    expect(screen.getByText(/Our Mission/i)).toBeInTheDocument();
    expect(screen.getByText(/What We Do/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Free/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Premium/i, level: 1 })).toBeInTheDocument();
  });

  it('navigates to signup when Join Now for free is clicked', () => {
    render(
      <MemoryRouter>
        <Mission />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /join now for free button/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/signup/parent');
  });

  it('navigates to signup when Join Now premium is clicked', () => {
    render(
      <MemoryRouter>
        <Mission />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /join now premium button/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/signup/parent');
  });
});

