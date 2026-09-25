import React, { useEffect, useState, useCallback } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';
import LoadingSpinner from '../../components/Analytics/LoadingSpinner';
import ErrorBanner from '../../components/Analytics/ErrorBanner';
import { DateRange } from '../../components/Analytics/DateRangeFilter';

interface ActivityEvent {
  eventType: string;
  eventName: string;
  startTime: string;
  totalTime: number;
}

interface Props {
  username: string;
  dateRange: DateRange;
}

const EVENT_COLORS: Record<string, string> = {
  play: 'bg-blue-100 text-blue-700',
  lesson: 'bg-green-100 text-green-700',
  puzzle: 'bg-yellow-100 text-yellow-700',
  mentor: 'bg-purple-100 text-purple-700',
  website: 'bg-gray-100 text-gray-600',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const PAGE_SIZE = 20;

const ActivityFeed: React.FC<Props> = ({ username, dateRange }) => {
  const [cookies] = useCookies(['login']);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (newSkip: number, reset: boolean) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ skip: String(newSkip), limit: String(PAGE_SIZE) });
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    try {
      const res = await fetch(
        `${environment.urls.middlewareURL}/analytics/student/${username}/events?${params}`,
        { headers: { Authorization: `Bearer ${cookies.login}` } }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setEvents((prev) => (reset ? json.events : [...prev, ...json.events]));
      setHasMore(json.hasMore);
      setSkip(newSkip + PAGE_SIZE);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [username, dateRange, cookies.login]);

  useEffect(() => {
    if (!username) return;
    setEvents([]);
    setSkip(0);
    loadEvents(0, true);
  }, [username, dateRange, loadEvents]);

  if (error) return <ErrorBanner message={`Failed to load events: ${error}`} />;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 px-4 py-3 border-b border-gray-100">
        Activity Feed
      </h3>
      {events.length === 0 && !loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">No events for this period.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {events.map((ev, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.website}`}>
                  {ev.eventType}
                </span>
                <span className="text-sm text-gray-800">{ev.eventName || '—'}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{new Date(ev.startTime).toLocaleDateString()}</span>
                <span className="font-medium">{formatDuration(ev.totalTime)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loading && <LoadingSpinner />}
      {hasMore && !loading && (
        <div className="flex justify-center py-3">
          <button
            onClick={() => loadEvents(skip, false)}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
