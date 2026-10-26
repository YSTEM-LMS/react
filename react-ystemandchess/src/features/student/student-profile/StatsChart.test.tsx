import React from 'react';
import { render } from '@testing-library/react';
import StatsChart from './StatsChart';

const lineProps: any[] = [];
jest.mock('react-chartjs-2', () => ({
  Line: (props: any) => {
    lineProps.push(props);
    return null;
  },
}));

describe('StatsChart', () => {
  beforeEach(() => {
    lineProps.length = 0;
  });

  it('starts the y-axis at 0 so an all-zero series is not drawn from -1 to 1', () => {
    render(
      <StatsChart
        monthAxis={['Jan', 'Feb']}
        dataAxis={{ lessons: [0, 0], puzzles: [0, 0] }}
      />
    );

    const { options } = lineProps[lineProps.length - 1];
    expect(options.scales.y.beginAtZero).toBe(true);
    expect(options.scales.y.min).toBe(0);
  });
});
