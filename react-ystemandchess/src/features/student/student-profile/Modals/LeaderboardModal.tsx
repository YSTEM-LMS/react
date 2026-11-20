import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { ReactComponent as LeaderboardIcon } from "../../../../assets/images/student/leaderboard_sidebar_icon.svg";
import { environment } from "../../../../environments";
import { FilterChip } from "../../../../components/FilterChip";
import { LeaderboardRow } from "../../../../components/LeaderboardRow";
import { SortHeader } from "../../../../components/SortHeader";

type Props = { onClose: () => void };

type ChessRecord = {
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
};

type Row = {
  id: string;
  rank: number;
  name: string;
  school: string;
  /**
   * Currency ledger standing (lifetime currency earned from engaging
   * actions — lessons, puzzles, etc.), not spendable balance. See
   * middlewareNode/src/routes/leaderboard.js and services/ledgerService.js.
   * Previously a weighted time/streak/activities/badges formula; replaced
   * by the currency rollout plan.
   */
  score: number;
  /**
   * Student-vs-student chess score, kept as its own column on purpose.
   * Engagement and competitive skill are different signals, so they are never
   * summed into one number. See middlewareNode/src/routes/gameResults.js.
   */
  chessScore: number;
  chessRecord: ChessRecord;
  avatar_url: string | null;
};

const EMPTY_CHESS_RECORD: ChessRecord = { wins: 0, draws: 0, losses: 0, gamesPlayed: 0 };

// Filter lists this long or shorter show as chips; longer ones stay a dropdown.
const MAX_CHIPS = 8;

// The logged-in student's username, read from the login token without a
// network call (the same way Puzzles.tsx does), so their row can be
// highlighted. Empty when the token can't be read.
function usernameFromToken(token?: string): string {
  try {
    return JSON.parse(atob(token.split(".")[1]))?.username ?? "";
  } catch {
    return "";
  }
}

type FilterProps = {
  name: string;
  allLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

// One filter (country, state or school): chips for a short list, a dropdown
// for a long one. Clicking the chip that's on goes back to "All".
function Filter({ name, allLabel, options, value, onChange }: FilterProps) {
  if (options.length > MAX_CHIPS) {
    return (
      <select
        aria-label={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-40 max-w-full rounded-lg border border-borderLight bg-light p-2.5 text-base text-dark"
      >
        <option>{allLabel}</option>
        {options.map((option, idx) => (
          <option key={idx} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <div role="group" aria-label={name} className="flex max-w-full flex-wrap items-center justify-center gap-2">
      {[allLabel, ...options].map((option, idx) => (
        <FilterChip
          key={idx}
          label={option}
          active={value === option}
          onToggle={() => onChange(value === option ? allLabel : option)}
        />
      ))}
    </div>
  );
}

const LeaderboardModal: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const [cookies] = useCookies(['login']);

  // --- UI STATE ---
  const [rows, setRows] = useState<Row[]>([]);
  const [schoolsList, setSchoolsList] = useState<string[]>([]);
  const [countriesList, setCountriesList] = useState<string[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);

  // --- FILTER & SORT STATE ---
  const [country, setCountry] = useState("All Countries");
  const [state, setState] = useState("All States");
  const [school, setSchool] = useState("All Schools");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score"); // 'score' or 'name'
  const [sortDir, setSortDir] = useState("desc"); // 'asc' or 'desc'
  
  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Navigates to the student's inventory/backpack screen. Closes this modal
  // first, matching how ActivitiesModal hands off to another page.
  const handleGoToBackpack = () => {
    onClose();
    navigate("/student-inventory");
  };

  // Close modal logic
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // --- INITIAL DATA FETCH (Schools / Countries / States lists) ---
  useEffect(() => {
    const authHeaders = { headers: { 'Authorization': `Bearer ${cookies.login}` } };

    const fetchFilterOptions = async (path: string, key: string, setter: (v: string[]) => void) => {
      try {
        const res = await fetch(`${environment.urls.middlewareURL}/leaderboard/${path}`, authHeaders);
        const json = await res.json();
        if (json.success) setter(json[key]);
      } catch (err) {
        console.error(`Failed to load ${path}`, err);
      }
    };

    fetchFilterOptions('schools', 'schools', setSchoolsList);
    fetchFilterOptions('countries', 'countries', setCountriesList);
    fetchFilterOptions('states', 'states', setStatesList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- MAIN LEADERBOARD FETCH ---
  const fetchLeaderboard = async (isReset = false) => {
    setIsLoading(true);
    const targetPage = isReset ? 1 : page;

    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "10",
        sortBy,
        sortDir
      });

      if (country !== "All Countries") params.append("country", country);
      if (state !== "All States") params.append("state", state);
      if (school !== "All Schools") params.append("school", school);
      if (search.trim() !== "") params.append("search", search.trim());

      const response = await fetch(`${environment.urls.middlewareURL}/leaderboard?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${cookies.login}` },
      });
      const json = await response.json();

      if (json.success) {
        const fetchedData = json.data.leaderboard.map((item: any) => ({
          id: item.id,
          rank: item.rank,
          name: item.username,
          school: item.school_name,
          score: item.score,
          chessScore: item.chess_score ?? 0,
          chessRecord: item.chess_record ?? EMPTY_CHESS_RECORD,
          avatar_url: item.avatar_url,
        }));

        setRows((prev) => (isReset ? fetchedData : [...prev, ...fetchedData]));
        setHasMore(json.data.pagination.has_more);
        setPage(targetPage + 1);
      }
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when filters or sorting changes
  useEffect(() => {
    // We use a debounce effect for the search bar so it doesn't fetch on every single keystroke
    const timer = setTimeout(() => {
      fetchLeaderboard(true);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, state, school, search, sortBy, sortDir]);

  // --- UI HANDLERS ---
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc"); // Toggle direction
    } else {
      setSortBy(column);
      setSortDir(column === "name" ? "asc" : "desc"); // Default Name A-Z, Score High-Low
    }
  };

  // The arrow a column shows: only the column we're sorting by has one.
  const directionFor = (column: string) => {
    if (sortBy !== column) return "none" as const;
    return sortDir === "asc" ? ("asc" as const) : ("desc" as const);
  };

  // Only show medals when sorting by highest score: rank is the row's place
  // in the current sort.
  const showMedals = sortBy === "score" && sortDir === "desc";
  const me = usernameFromToken(cookies.login);

  return (
    <div
      data-testid="leaderboard-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/25 py-20"
      onClick={handleOverlayClick}
    >
      <div
        data-testid="leaderboard-modal"
        className="relative max-h-full w-11/12 max-w-4xl animate-modal-in overflow-y-auto overflow-x-hidden rounded-2xl bg-soft bg-none px-2 pb-3 pt-5 shadow-2xl sm:px-4 sm:pt-6"
      >
        <button
          className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center text-3xl font-extrabold leading-none text-red hover:opacity-75"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>

        <header className="relative mx-3.5 mb-3 h-14 pr-14 sm:mx-12 sm:h-16 sm:pr-16">
          <div className="flex h-full">
            <button
              className="flex w-16 shrink-0 items-center justify-center rounded-l-lg bg-accent text-xs font-bold leading-tight text-dark sm:w-20 sm:text-sm"
              type="button"
              onClick={handleGoToBackpack}
            >
              Go To<br />Backpack
            </button>
            <h2 className="flex flex-1 items-center justify-center rounded-r-lg bg-primary px-4 text-xl font-extrabold text-dark sm:text-2xl">
              Leaderboard
            </h2>
          </div>
          <LeaderboardIcon className="absolute right-3 top-1/2 w-8 -translate-y-1/2 sm:w-9" aria-hidden />
        </header>

        {/* Dynamic Filters & Search */}
        <div className="mb-3 mt-2 flex w-full flex-col gap-3 py-2.5 sm:px-5">
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-borderLight bg-light p-2.5 text-base text-dark"
          />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Filter name="Country" allLabel="All Countries" options={countriesList} value={country} onChange={setCountry} />
            <Filter name="State" allLabel="All States" options={statesList} value={state} onChange={setState} />
            <Filter name="School" allLabel="All Schools" options={schoolsList} value={school} onChange={setSchool} />
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-3xl bg-secondary p-1.5 pb-5 shadow-inner sm:mx-5 sm:p-3 sm:pb-7">
          <table className="w-full table-fixed border-separate border-spacing-0 text-dark">
            <thead>
              <tr>
                <th scope="col" className="w-10 rounded-l-3xl bg-accent px-1.5 py-2.5 text-sm sm:px-2.5 sm:py-3 sm:text-base text-center font-extrabold sm:w-16">
                  Rank
                </th>
                <SortHeader
                  label="Name"
                  direction={directionFor("name")}
                  onSort={() => handleSort("name")}
                  className="bg-accent px-1.5 py-2.5 text-sm sm:px-2.5 sm:py-3 sm:text-base"
                />
                <th scope="col" className="hidden bg-accent px-1.5 py-2.5 text-sm sm:px-2.5 sm:py-3 sm:text-base text-left font-extrabold sm:table-cell">
                  School
                </th>
                {/* Separate from Score on purpose — competitive results are a
                    different signal from engagement, so they rank separately. */}
                <SortHeader
                  label="Chess"
                  direction={directionFor("chess")}
                  onSort={() => handleSort("chess")}
                  className="w-14 bg-accent px-1.5 py-2.5 text-sm sm:px-2.5 sm:py-3 sm:text-base text-center sm:w-24"
                />
                <SortHeader
                  label="Score"
                  direction={directionFor("score")}
                  onSort={() => handleSort("score")}
                  className="w-16 rounded-r-3xl bg-accent px-1.5 py-2.5 text-sm sm:px-2.5 sm:py-3 sm:text-base text-center sm:w-24"
                />
              </tr>
            </thead>

            {/* Light under the rows, so the highlighted row reads as pale yellow. */}
            <tbody className="bg-light">
              {rows.map((r) => (
                <LeaderboardRow
                  key={r.id}
                  rank={r.rank}
                  name={r.name}
                  school={r.school}
                  avatarSrc={r.avatar_url}
                  chessScore={r.chessScore}
                  chessRecord={r.chessRecord}
                  score={r.score}
                  variant={me && r.name === me ? "self" : "default"}
                  medal={showMedals}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* LOAD MORE */}
        <div className="relative mb-4 mt-7 flex w-full items-center justify-center">
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-0.5 w-4/5 -translate-x-1/2 -translate-y-1/2 bg-accent" />
          <button
            className="relative rounded-full bg-accent px-16 py-2.5 text-base font-bold text-dark transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-inner disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none sm:px-24"
            type="button"
            onClick={() => fetchLeaderboard(false)}
            disabled={!hasMore || isLoading}
          >
            {isLoading ? "Loading..." : !hasMore ? "No more data" : "Load More"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
