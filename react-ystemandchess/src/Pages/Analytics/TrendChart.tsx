import React, { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';
import StatsChart from '../../features/student/student-profile/StatsChart';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';

interface TrendData {
  months: string[];
  activeUsers: number[];
  totalHours: number[];
}

interface Props {
  months?: number;
}

const TrendChart: React.FC<Props> = ({ months = 6 }) => {
  const [cookies] = useCookies(['login']);
  const [data, setData]     = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${environment.urls.middlewareURL}/analytics/global/trend?months=${months}`, {
      headers: { Authorization: `Bearer ${cookies.login}` },
    })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [months, cookies.login]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBanner message={`Failed to load trend: ${error}`} />;
  if (!data)   return null;

  const dataAxis = {
    'Active Users': data.activeUsers,
    'Total Hours':  data.totalHours,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Monthly Trend — Active Users & Hours
      </h3>
      <div style={{ height: 220 }}>
        <StatsChart monthAxis={data.months} dataAxis={dataAxis} />
      </div>
    </div>
  );
};

export default TrendChart;
