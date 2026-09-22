import React, { useState, useCallback } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';
import { DateRange } from '../../components/Analytics/DateRangeFilter';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';
import StudentDetailPanel from './StudentDetailPanel';
import StudentTimeChart from './StudentTimeChart';
import ActivityFeed from './ActivityFeed';

interface SearchResult {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface StudentData {
  profile: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    zipcode: string | null;
    gender: string | null;
    gradeLevel: string | null;
    accountCreatedAt: string;
  };
  stats: {
    totalTimeHours: number;
    gameTimeHours: number;
    lessonTimeHours: number;
    puzzleTimeHours: number;
    mentorTimeHours: number;
    currentStreak: number;
    activitiesCompleted: number;
    badgesEarned: number;
  };
}

interface Props {
  dateRange: DateRange;
}

const IndividualView: React.FC<Props> = ({ dateRange }) => {
  const [cookies] = useCookies(['login']);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setResults([]);
    setSelected(null);
    setStudentData(null);
    try {
      const res = await fetch(
        `${environment.urls.middlewareURL}/analytics/students/search?keyword=${encodeURIComponent(keyword)}`,
        { headers: { Authorization: `Bearer ${cookies.login}` } }
      );
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      setResults(await res.json());
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setSearchLoading(false);
    }
  }, [keyword, cookies.login]);

  const loadStudent = useCallback(async (username: string) => {
    setSelected(username);
    setDetailLoading(true);
    setDetailError(null);
    setStudentData(null);
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    try {
      const res = await fetch(
        `${environment.urls.middlewareURL}/analytics/student/${username}?${params}`,
        { headers: { Authorization: `Bearer ${cookies.login}` } }
      );
      if (!res.ok) throw new Error(`Failed to load student (${res.status})`);
      setStudentData(await res.json());
    } catch (e: any) {
      setDetailError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }, [dateRange, cookies.login]);

  return (
    <div className="flex gap-4 h-full">
      {/* Left: search + results */}
      <div className="w-72 flex-shrink-0 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search students..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            Go
          </button>
        </form>

        {searchLoading && <LoadingSpinner />}
        {searchError && <ErrorBanner message={searchError} />}

        {results.length === 0 && !searchLoading && keyword && !searchError && (
          <p className="text-sm text-gray-400 text-center py-4">No students found.</p>
        )}

        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.username}>
              <button
                onClick={() => loadStudent(r.username)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selected === r.username
                    ? 'bg-green-50 border border-green-300 text-green-800'
                    : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-medium">{r.firstName} {r.lastName}</div>
                <div className="text-xs text-gray-400">@{r.username}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: student detail */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {detailLoading && <LoadingSpinner />}
        {detailError && <ErrorBanner message={detailError} />}

        {!selected && !detailLoading && (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Search and select a student to view their analytics.
          </div>
        )}

        {studentData && (
          <>
            <StudentDetailPanel profile={studentData.profile} stats={studentData.stats} />
            <StudentTimeChart username={studentData.profile.username} dateRange={dateRange} />
            <ActivityFeed username={studentData.profile.username} dateRange={dateRange} />
          </>
        )}
      </div>
    </div>
  );
};

export default IndividualView;
