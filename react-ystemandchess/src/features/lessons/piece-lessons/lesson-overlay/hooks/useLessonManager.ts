import { useState, useCallback } from "react";
import { environment } from "../../../../../environments";

export function useLessonManager(piece: string, cookies: any, initialLessonNum?: number) {
  const [lessonNum, setLessonNum] = useState<number>(initialLessonNum ?? 0);
  const [completedNum, setCompletedNum] = useState<number>(0);
  const [totalLessons, setTotalLessons] = useState<number>(0);
  const [lessonData, setLessonData] = useState<any>(null);

  // Fetch helpers
  const fetchCompletedCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${environment.urls.middlewareURL}/lessons/getCompletedLessonCount?piece=${encodeURIComponent(piece)}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${cookies?.login}` } }
      );
      if (!response.ok) {
        console.warn('getCompletedLessonCount failed', response.status);
        return 0;
      }
      const n = await response.json();
      return Number(n) || 0;
    } catch (err) {
      console.error('Error fetching completed count', err);
      return 0;
    }
  }, [piece, cookies]);

  const fetchTotalLessons = useCallback(async () => {
    try {
      const response = await fetch(
        `${environment.urls.middlewareURL}/lessons/getTotalPieceLesson?piece=${encodeURIComponent(piece)}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${cookies?.login}` } }
      );
      if (!response.ok) {
        console.warn('getTotalPieceLesson failed', response.status);
        return 0;
      }
      const n = await response.json();
      return Number(n) || 0;
    } catch (err) {
      console.error('Error fetching total lessons', err);
      return 0;
    }
  }, [piece, cookies]);

  const fetchLessonByNumber = useCallback(async (num: number) => {
    try {
      const response = await fetch(
        `${environment.urls.middlewareURL}/lessons/getLesson?piece=${encodeURIComponent(piece)}&lessonNum=${encodeURIComponent(num + 1)}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${cookies?.login}` } }
      );
      if (!response.ok) {
        console.warn('getLesson failed', response.status);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching lesson', err);
      return null;
    }
  }, [piece, cookies]);

  // Public imperative methods

  // Refresh totals and completed, then load current lesson (initialization)
  const refreshProgress = useCallback(async (targetLessonNum?: number) => {
    const total = await fetchTotalLessons();
    setTotalLessons(total);

    const completed = await fetchCompletedCount();
    setCompletedNum(completed);

    // decide which lesson to open: explicit targetLessonNum -> that, otherwise
    // if initialLessonNum provided then respect it (if in range), else open next uncompleted
    let toOpen = typeof targetLessonNum === 'number' ? targetLessonNum
      : (initialLessonNum != null ? initialLessonNum : completed);

    if (toOpen < 0) toOpen = 0;
    if (total > 0 && toOpen >= total) toOpen = total - 1;

    setLessonNum(toOpen);
    const lesson = await fetchLessonByNumber(toOpen);
    setLessonData(lesson);
  }, [fetchTotalLessons, fetchCompletedCount, fetchLessonByNumber, initialLessonNum]);

  // Go to a specific lesson number (0-based)
  const goToLesson = useCallback(async (num: number) => {
    if (num < 0) return;
    const total = totalLessons;
    if (total > 0 && num >= total) {
      console.warn('goToLesson out of bounds', num, total);
      return;
    }
    setLessonNum(num);
    const lesson = await fetchLessonByNumber(num);
    if (lesson) setLessonData(lesson);
  }, [totalLessons, fetchLessonByNumber]);

  // Next and previous navigators
  const nextLesson = useCallback(async () => {
    // do not advance beyond first uncompleted or last lesson
    const limit = Math.min(completedNum, Math.max(0, totalLessons - 1));
    if (lessonNum >= limit) return;
    const next = lessonNum + 1;
    setLessonNum(next);
    const lesson = await fetchLessonByNumber(next);
    if (lesson) setLessonData(lesson);
  }, [lessonNum, completedNum, totalLessons, fetchLessonByNumber]);

  const prevLesson = useCallback(async () => {
    if (lessonNum <= 0) return;
    const prev = lessonNum - 1;
    setLessonNum(prev);
    const lesson = await fetchLessonByNumber(prev);
    if (lesson) setLessonData(lesson);
  }, [lessonNum, fetchLessonByNumber]);

  // Update completion: mark current as completed and advance if possible
  const updateCompletion = useCallback(async () => {
    // only update backend when the user is at the first unfinished lesson
    if (lessonNum !== completedNum) {
      return;
    }
    try {
      await fetch(
        `${environment.urls.middlewareURL}/lessons/updateLessonCompletion?piece=${encodeURIComponent(piece)}&lessonNum=${encodeURIComponent(lessonNum)}`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${cookies?.login}` } }
      );
      // Refresh local progress after backend update
      await refreshProgress(lessonNum + 1);
    } catch (err) {
      console.error('Error updating completion', err);
    }
  }, [lessonNum, completedNum, piece, cookies, refreshProgress]);

  return {
    lessonData,
    lessonNum,
    completedNum,
    totalLessons,
    refreshProgress,
    goToLesson,
    nextLesson,
    prevLesson,
    updateCompletion,
    setLessonNum 
  };
}
