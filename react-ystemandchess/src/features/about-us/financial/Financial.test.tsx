import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Financial from './Financial';

describe('Financial', () => {
  it('renders the financials heading', () => {
    render(
      <MemoryRouter>
        <Financial />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Financials/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2018 Financials/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Form 990/i, level: 3 })).toBeInTheDocument();
  });
});
