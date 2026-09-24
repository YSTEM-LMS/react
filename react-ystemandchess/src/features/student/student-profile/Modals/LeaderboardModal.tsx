import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import "./LeaderboardModal.scss";
import { ReactComponent as LeaderboardIcon } from "../../../../assets/images/student/leaderboard_sidebar_icon.svg";
import { environment } from "../../../../environments";

import rank1Img from "../../../../assets/images/student/Leaderboard_rank_1.svg";
import rank2Img from "../../../../assets/images/student/Leaderboard_rank_2.svg";
import rank3Img from "../../../../assets/images/student/Leaderboard_rank_3.svg";

import avatar1 from "../../../../assets/images/student/Leaderboard_User_avatar_1.png";
import avatar2 from "../../../../assets/images/student/Leaderboard_User_avatar_2.png";
import avatar3 from "../../../../assets/images/student/Leaderboard_User_avatar_3.png";
import avatarAll from "../../../../assets/images/student/Leaderboard_User_avatar_all.png";

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
  /** Engagement score — time, streak, activities, badges. */
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

  const badgeForRank = (rank: number, sortByCol: string) => {
    // Only show medals if we are actively sorting by highest score
    if (sortByCol !== "score" || sortDir !== "desc") return null;
    if (rank === 1) return rank1Img;
    if (rank === 2) return rank2Img;
    if (rank === 3) return rank3Img;
    return null;
  };

  const getAvatar = (rank: number, avatarUrl: string | null) => {
    if (avatarUrl) return avatarUrl; 
    if (rank === 1) return avatar1;
    if (rank === 2) return avatar2;
    if (rank === 3) return avatar3;
    return avatarAll;
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="close-button" onClick={onClose} aria-label="Close modal">
          &times;
        </button>

        <header className="lb-header">
          <div className="lb-heading">
            <button className="lb-backpill" type="button" onClick={handleGoToBackpack}>Go To<br />Backpack</button>
            <h2 className="lb-title">Leaderboard</h2>
          </div>
          <LeaderboardIcon className="lb-crown-img" aria-hidden />
        </header>

        {/* Dynamic Filters & Search */}
        <div className="lb-filters" style={{ display: 'flex', gap: '15px', padding: '10px 0', width: '100%' }}>
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', minWidth: '160px' }}
          >
            <option>All Countries</option>
            {countriesList.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', minWidth: '160px' }}
          >
            <option>All States</option>
            {statesList.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', minWidth: '250px' }}
          >
            <option>All Schools</option>
            {schoolsList.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <div className="lb-table-wrap">
          <table className="lb-table">
            <colgroup>
              <col className="col-rank" />
              <col className="col-name" />
              <col className="col-school" />
              <col className="col-chess" />
              <col className="col-score" />
            </colgroup>

            <thead>
              <tr>
                <th>Rank</th>
                <th>
                  <button className="lb-sort-btn" type="button" onClick={() => handleSort("name")}>
                    <span>Name</span>
                    {sortBy === "name" && (
                      <span style={{ fontSize: '12px', marginLeft: '5px' }}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </button>
                </th>
                <th>School</th>
                <th>
                  {/* Separate from Score on purpose — competitive results are a
                      different signal from engagement, so they rank separately. */}
                  <button className="lb-sort-btn" type="button" onClick={() => handleSort("chess")}>
                    <span>Chess</span>
                    {sortBy === "chess" && (
                      <span style={{ fontSize: '12px', marginLeft: '5px' }}>{sortDir === "desc" ? "▼" : "▲"}</span>
                    )}
                  </button>
                </th>
                <th>
                  <button className="lb-sort-btn" type="button" onClick={() => handleSort("score")}>
                    <span>Score</span>
                    {sortBy === "score" && (
                      <span style={{ fontSize: '12px', marginLeft: '5px' }}>{sortDir === "desc" ? "▼" : "▲"}</span>
                    )}
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const badge = badgeForRank(r.rank, sortBy);
                const avatar = getAvatar(r.rank, r.avatar_url);

                return (
                  <tr key={r.id} data-rank={r.rank}>
                    <td className="lb-rank">
                      {badge ? <span className="lb-rank-img" style={{ backgroundImage: `url(${badge})` }} /> : r.rank}
                    </td>
                    <td className="lb-user">
                      <img src={avatar} alt="avatar" className="lb-avatar-img" />
                      <span className="lb-name">{r.name}</span>
                    </td>
                    <td className="lb-school">{r.school}</td>
                    <td className="lb-chess">
                      {r.chessRecord.gamesPlayed === 0 ? (
                        <span className="lb-chess-empty" title="No student-vs-student games yet">—</span>
                      ) : (
                        <>
                          <span className="lb-chess-score">{r.chessScore}</span>
                          <span
                            className="lb-chess-record"
                            title={`${r.chessRecord.wins} wins, ${r.chessRecord.draws} draws, ${r.chessRecord.losses} losses`}
                          >
                            {r.chessRecord.wins}–{r.chessRecord.draws}–{r.chessRecord.losses}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="lb-score">{r.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* LOAD MORE */}
        <div className="lb-loadmore">
          <button
            className="lb-load-btn"
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
