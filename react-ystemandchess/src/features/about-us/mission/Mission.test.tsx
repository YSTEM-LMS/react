import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Mission from './Mission';

describe('Mission', () => {
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
});
