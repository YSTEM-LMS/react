import { renderHook, waitFor } from "@testing-library/react";
import { useCookies } from "react-cookie";
import { useAgoraCredentials } from "./useAgoraCredentials";

jest.mock("react-cookie", () => ({
  __esModule: true,
  useCookies: jest.fn(),
}));

const CREDENTIALS = {
  appId: "app-1",
  channel: "m-1",
  uid: 456,
  screenUid: 1456,
  token: "007abc",
  screenToken: "007def",
};

function mockFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const fetchMock = jest.fn(() =>
    Promise.resolve({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: () => Promise.resolve(response.body),
    }),
  );
  global.fetch = fetchMock as any;
  return fetchMock;
}

beforeEach(() => {
  (useCookies as jest.Mock).mockReturnValue([{ login: "jwt" }, jest.fn(), jest.fn()]);
});

describe("useAgoraCredentials", () => {
  test("does nothing until there is a meeting", () => {
    const fetchMock = mockFetch({ ok: true, body: CREDENTIALS });

    const { result } = renderHook(() => useAgoraCredentials(null));

    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("fetches the caller's credentials with their login token", async () => {
    const fetchMock = mockFetch({ ok: true, body: CREDENTIALS });

    const { result } = renderHook(() => useAgoraCredentials("m-1"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.credentials).toEqual(CREDENTIALS);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/meetings\/agoraToken$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  test("reports an error when the server refuses", async () => {
    mockFetch({ ok: false, status: 404, body: "You are currently not in a meeting!" });

    const { result } = renderHook(() => useAgoraCredentials("m-1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatch(/could not get access/i);
  });

  test("resets when the meeting ends", async () => {
    mockFetch({ ok: true, body: CREDENTIALS });
    const { result, rerender } = renderHook(({ id }) => useAgoraCredentials(id), {
      initialProps: { id: "m-1" as string | null },
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ id: null });

    expect(result.current.status).toBe("idle");
    expect(result.current.credentials).toBeNull();
  });
});
