import { act, renderHook, waitFor } from "@testing-library/react";
import { useCookies } from "react-cookie";
import { END_POLL_MS, useMeeting } from "./useMeeting";

jest.mock("react-cookie", () => ({
  __esModule: true,
  useCookies: jest.fn(),
}));

const NO_MEETING = "There are no current meetings with this user.";
const MEETING = [{ meetingId: "m-1", mentorUsername: "bob", studentUsername: "alice" }];

type Route = { ok?: boolean; body?: unknown };

/** fetch stub: answers by endpoint; inMeeting answers come from a queue. */
function mockServer(inMeetingAnswers: Route[]) {
  const answers = [...inMeetingAnswers];
  const fetchMock = jest.fn((url: string) => {
    const route: Route = url.endsWith("/inMeeting")
      ? answers.length > 1
        ? answers.shift()!
        : answers[0]
      : { body: "Ok" };
    return Promise.resolve({
      ok: route.ok ?? true,
      status: route.ok === false ? 500 : 200,
      json: () => Promise.resolve(route.body),
    });
  });
  global.fetch = fetchMock as any;
  return fetchMock;
}

const calledEndpoints = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.map(([url]) => String(url).split("/meetings")[1]);

beforeEach(() => {
  (useCookies as jest.Mock).mockReturnValue([{ login: "jwt" }, jest.fn(), jest.fn()]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useMeeting", () => {
  test("detects an ongoing meeting on mount without auto-joining it", async () => {
    mockServer([{ body: MEETING }]);

    const { result } = renderHook(() => useMeeting({ role: "student" }));

    await waitFor(() => expect(result.current.hasOngoingMeeting).toBe(true));
    expect(result.current.state).toBe("idle");
    expect(result.current.meeting).toBeNull();
  });

  test("joining queues the user, then connects once paired", async () => {
    // mount check, startLesson check → no meeting; first poll → paired
    const fetchMock = mockServer([
      { body: NO_MEETING },
      { body: NO_MEETING },
      { body: MEETING },
    ]);
    const { result } = renderHook(() => useMeeting({ role: "student" }));

    await act(() => result.current.startLesson());

    await waitFor(() => expect(result.current.state).toBe("in-meeting"));
    expect(result.current.meeting?.meetingId).toBe("m-1");
    expect(calledEndpoints(fetchMock)).toEqual(
      expect.arrayContaining(["/queue", "/pairUp"]),
    );
  });

  test("rejoins an open meeting directly instead of queueing", async () => {
    const fetchMock = mockServer([{ body: MEETING }]);
    const { result } = renderHook(() => useMeeting({ role: "mentor" }));

    await act(() => result.current.startLesson());

    expect(result.current.state).toBe("in-meeting");
    expect(calledEndpoints(fetchMock)).not.toContain("/queue");
  });

  test("ends locally when the other side ends the meeting", async () => {
    jest.useFakeTimers();
    mockServer([{ body: MEETING }, { body: MEETING }, { body: NO_MEETING }]);
    const { result } = renderHook(() => useMeeting({ role: "student" }));
    await act(() => result.current.startLesson());
    expect(result.current.state).toBe("in-meeting");

    await act(async () => {
      jest.advanceTimersByTime(END_POLL_MS);
    });

    await waitFor(() => expect(result.current.state).toBe("ended"));
    expect(result.current.meeting).toBeNull();
  });

  test("a failed status check does not end a live call", async () => {
    jest.useFakeTimers();
    mockServer([{ body: MEETING }, { body: MEETING }, { ok: false, body: "Server error" }]);
    const { result } = renderHook(() => useMeeting({ role: "student" }));
    await act(() => result.current.startLesson());

    await act(async () => {
      jest.advanceTimersByTime(END_POLL_MS * 2);
    });

    expect(result.current.state).toBe("in-meeting");
  });

  test("leave drops the call but keeps the meeting open to rejoin", async () => {
    mockServer([{ body: MEETING }]);
    const { result } = renderHook(() => useMeeting({ role: "student" }));
    await act(() => result.current.startLesson());

    act(() => result.current.leave());

    expect(result.current.state).toBe("idle");
    expect(result.current.hasOngoingMeeting).toBe(true);
  });

  test("ending the meeting tells the server", async () => {
    const fetchMock = mockServer([{ body: MEETING }]);
    const { result } = renderHook(() => useMeeting({ role: "mentor" }));
    await act(() => result.current.startLesson());

    await act(() => result.current.endLesson());

    expect(result.current.state).toBe("ended");
    expect(calledEndpoints(fetchMock)).toContain("/endMeeting");
  });

  test("a server error while ending keeps the call up and reports it", async () => {
    mockServer([{ body: MEETING }]);
    const { result } = renderHook(() => useMeeting({ role: "mentor" }));
    await act(() => result.current.startLesson());
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve("Server error") }),
    );

    await act(() => result.current.endLesson());

    expect(result.current.state).toBe("in-meeting");
    expect(result.current.error).toMatch(/could not end/i);
  });

  test("a pairing poll that lands after Leave does not start the call", async () => {
    let resolveInMeeting: (v: unknown) => void = () => {};
    let inMeetingCalls = 0;
    global.fetch = jest.fn((url: string) => {
      if (!url.endsWith("/inMeeting")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve("Ok") });
      }
      inMeetingCalls += 1;
      // mount + startLesson checks: no meeting; the first poll's check hangs
      if (inMeetingCalls <= 2) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(NO_MEETING) });
      }
      return new Promise((resolve) => {
        resolveInMeeting = () =>
          resolve({ ok: true, status: 200, json: () => Promise.resolve(MEETING) });
      });
    }) as any;
    const { result } = renderHook(() => useMeeting({ role: "student" }));
    await act(() => result.current.startLesson());
    await waitFor(() => expect(inMeetingCalls).toBe(3));

    await act(() => result.current.cancelSearch());
    await act(async () => resolveInMeeting(undefined));

    expect(result.current.state).toBe("idle");
  });

  test("leaving the page mid-search removes the user from the queue", async () => {
    const fetchMock = mockServer([{ body: NO_MEETING }]);
    const { result, unmount } = renderHook(() => useMeeting({ role: "student" }));
    await act(() => result.current.startLesson());
    expect(result.current.state).toBe("searching");

    unmount();

    expect(calledEndpoints(fetchMock)).toContain("/dequeue");
  });
});
