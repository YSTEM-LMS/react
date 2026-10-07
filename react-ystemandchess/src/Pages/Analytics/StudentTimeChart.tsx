import React, { useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';
import StatsChart from '../../features/student/student-profile/StatsChart';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';
import { useState } from 'react';
import { DateRange } from '../../components/Analytics/DateRangeFilter';

interface ChartData {
  months: string[];
  series: {
    gameTime: number[];
    lessonTime: number[];
    puzzleTime: number[];
    mentorTime: number[];
  };
}

interface Props {
  username: string;
  dateRange: DateRange;
}

const StudentTimeChart: React.FC<Props> = ({ username, dateRange }) => {
  const [cookies] = useCookies(['login']);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ months: '6' });
    // Note: /chart uses a rolling N-month window; from/to are not supported by this endpoint.

    fetch(`${environment.urls.middlewareURL}/analytics/student/${username}/chart?${params}`, {
      headers: { Authorization: `Bearer ${cookies.login}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setChart)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username, cookies.login]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={`Failed to load chart: ${error}`} />;
  if (!chart) return null;

  const dataAxis: { [key: string]: number[] } = {
    'Game Time': chart.series.gameTime,
    'Lesson Time': chart.series.lessonTime,
    'Puzzle Time': chart.series.puzzleTime,
    'Mentor Time': chart.series.mentorTime,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Activity (hours)</h3>
      <div style={{ height: 220 }}>
        <StatsChart monthAxis={chart.months} dataAxis={dataAxis} />
      </div>
    </div>
  );
};

export default StudentTimeChart;
