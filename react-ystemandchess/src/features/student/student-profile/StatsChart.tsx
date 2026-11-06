import React, {useEffect} from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type StatsChartProps = {
  monthAxis: string[];
  dataAxis: { [event: string]: number[] }; // multiple event data series
};

const StatsChart: React.FC<StatsChartProps> = ({ monthAxis, dataAxis }) => {
  const [data, setData] = useState({
    labels: monthAxis,
    datasets: [] as {
      label: string;
      data: number[];
      fill: boolean;
      borderColor: string;
      borderWidth: number;
      backgroundColor: string;
      pointRadius: number;
      tension: number;
    }[]
  });

  useEffect(() => {
    // Define a list of colors to assign for each dataset
    const colors = [
      'rgb(11, 11, 11)',
      'rgb(191, 217, 158)',
      'rgb(229, 243, 210)',
      'rgb(127, 204, 38)',
      'rgb(168, 236, 22)',
    ];

    const datasets = Object.entries(dataAxis).map(([event, times], index) => ({
      label: event.charAt(0).toUpperCase() + event.slice(1), // capitalize first letter
      data: times,
      fill: false,
      borderColor: colors[index % colors.length],
      borderWidth: 2,
      backgroundColor: colors[index % colors.length],
      pointRadius: 0,
      tension: 0.1,
    }));

    setData({
      labels: monthAxis,
      datasets,
    });
  }, [monthAxis, dataAxis]);

  return <Line
  data={data}
  options={{
    maintainAspectRatio: false,
    // Time spent is never negative. Without a floor, Chart.js pads an
    // all-zero series (a new student) to -1..1.
    scales: {
      y: { beginAtZero: true, min: 0 },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 50,
          padding: 10,
        },
      },
    },
  }}
/>;
};

export default StatsChart;