import React, { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { environment } from '../../environments';
import { DateRange } from '../../components/Analytics/DateRangeFilter';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';
import TrendChart from './TrendChart';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface GlobalData {
  totalUsers: number;
  activeUsersInPeriod: number;
  totalHours: number;
  byEventType: {
    gameTime: number;
    lessonTime: number;
    puzzleTime: number;
    mentorTime: number;
  };
  byGender: {
    [key: string]: { count: number; avgHours: number };
  };
}

interface Props {
  dateRange: DateRange;
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

const GlobalView: React.FC<Props> = ({ dateRange }) => {
  const [cookies] = useCookies(['login']);
  const [data, setData]     = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to)   params.set('to', dateRange.to);
    fetch(`${environment.urls.middlewareURL}/analytics/global?${params}`, {
      headers: { Authorization: `Bearer ${cookies.login}` },
    })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dateRange, cookies.login]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBanner message={`Failed to load global stats: ${error}`} />;
  if (!data)   return null;

  const GENDER_COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#94a3b8'];
  const genderLabels  = Object.keys(data.byGender);
  const genderCounts  = genderLabels.map((g) => data.byGender[g].count);

  const pieData = {
    labels: genderLabels,
    datasets: [{
      data: genderCounts,
      backgroundColor: GENDER_COLORS,
      borderWidth: 1,
    }],
  };

  const eventLabels = ['Game', 'Lesson', 'Puzzle', 'Mentor'];
  const eventValues = [
    data.byEventType.gameTime,
    data.byEventType.lessonTime,
    data.byEventType.puzzleTime,
    data.byEventType.mentorTime,
  ];

  const barData = {
    labels: eventLabels,
    datasets: [{
      label: 'Total Hours',
      data: eventValues,
      backgroundColor: ['#4ade80', '#60a5fa', '#fbbf24', '#a78bfa'],
      borderWidth: 0,
    }],
  };

  const hasActivity = data.totalHours > 0;

  return (
    <div className="space-y-4">
      {!hasActivity && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg">
          No activity recorded for this period. Try widening the date range or clearing the filter.
        </div>
      )}
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total Students"    value={data.totalUsers} />
        <KpiCard label="Active This Period" value={data.activeUsersInPeriod} />
        <KpiCard label="Total Hours"        value={data.totalHours.toFixed(1)} />
        <KpiCard label="Avg Hrs / Student"  value={
          data.activeUsersInPeriod
            ? (data.totalHours / data.activeUsersInPeriod).toFixed(1)
            : '—'
        } />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Gender pie */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Gender Breakdown</h3>
          {genderLabels.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No gender data set yet.</p>
          ) : (
            <div style={{ height: 220 }}>
              <Pie data={pieData} options={{ maintainAspectRatio: false }} />
            </div>
          )}
        </div>

        {/* Activity bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hours by Activity</h3>
          <div style={{ height: 220 }}>
            <Bar
              data={barData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours' } } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Trend line */}
      <TrendChart months={6} />
    </div>
  );
};

export default GlobalView;
