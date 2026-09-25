import React, { useEffect, useState, useCallback } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';
import { DateRange } from '../../components/Analytics/DateRangeFilter';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';
import ZipcodeDetailPanel from './ZipcodeDetailPanel';

interface ZipRow {
  zipcode: string;
  totalStudents: number;
  avgTotalTimeHours: number;
}

interface ZipcodeStats {
  zipcode: string;
  totalStudents: number;
  avgTotalTimeHours: number;
  avgGameTimeHours: number;
  avgLessonTimeHours: number;
  avgPuzzleTimeHours: number;
  avgStreakDays: number;
  globalAvgTotalTimeHours: number;
}

type SortKey = 'zipcode' | 'totalStudents' | 'avgTotalTimeHours';

interface Props {
  dateRange: DateRange;
}

const ZipcodeView: React.FC<Props> = ({ dateRange }) => {
  const [cookies] = useCookies(['login']);
  const [rows, setRows]         = useState<ZipRow[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError]     = useState<string | null>(null);
  const [sortKey, setSortKey]   = useState<SortKey>('totalStudents');
  const [sortAsc, setSortAsc]   = useState(false);

  const [selected, setSelected]     = useState<string | null>(null);
  const [detail, setDetail]         = useState<ZipcodeStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError]     = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${cookies.login}` };

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    setTableError(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to)   params.set('to', dateRange.to);
    try {
      const res = await fetch(
        `${environment.urls.middlewareURL}/analytics/zipcode/all?${params}`,
        { headers: authHeader }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      setRows(await res.json());
    } catch (e: any) {
      setTableError(e.message);
    } finally {
      setTableLoading(false);
    }
  }, [dateRange, cookies.login]);

  const loadDetail = useCallback(async (zipcode: string) => {
    setSelected(zipcode);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    const params = new URLSearchParams({ zipcode });
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to)   params.set('to', dateRange.to);
    try {
      const res = await fetch(
        `${environment.urls.middlewareURL}/analytics/zipcode?${params}`,
        { headers: authHeader }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      setDetail(await res.json());
    } catch (e: any) {
      setDetailError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }, [dateRange, cookies.login]);

  useEffect(() => { loadTable(); }, [loadTable]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] as any;
    const bv = b[sortKey] as any;
    return sortAsc
      ? (av < bv ? -1 : av > bv ? 1 : 0)
      : (bv < av ? -1 : bv > av ? 1 : 0);
  });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? <span className="ml-1">{sortAsc ? '↑' : '↓'}</span> : null;

  return (
    <div className="flex gap-4">
      {/* Left: sortable table */}
      <div className="w-96 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">All Zipcodes</h2>
        {tableLoading && <LoadingSpinner />}
        {tableError   && <ErrorBanner message={tableError} />}

        {!tableLoading && rows.length === 0 && !tableError && (
          <p className="text-sm text-gray-400 text-center py-8">
            No zipcode data yet — students need zipcode set in their profile.
          </p>
        )}

        {sorted.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {([
                    ['zipcode', 'Zipcode'],
                    ['totalStudents', 'Students'],
                    ['avgTotalTimeHours', 'Avg Hrs'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                    >
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row) => (
                  <tr
                    key={row.zipcode}
                    onClick={() => loadDetail(row.zipcode)}
                    className={`cursor-pointer hover:bg-gray-50 transition ${
                      selected === row.zipcode ? 'bg-green-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-800">{row.zipcode}</td>
                    <td className="px-3 py-2 text-gray-600">{row.totalStudents}</td>
                    <td className="px-3 py-2 text-gray-600">{row.avgTotalTimeHours.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right: detail panel */}
      <div className="flex-1">
        {detailLoading && <LoadingSpinner />}
        {detailError   && <ErrorBanner message={detailError} />}

        {!selected && !detailLoading && (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Select a zipcode to see the breakdown.
          </div>
        )}

        {detail && <ZipcodeDetailPanel stats={detail} />}
      </div>
    </div>
  );
};

export default ZipcodeView;
