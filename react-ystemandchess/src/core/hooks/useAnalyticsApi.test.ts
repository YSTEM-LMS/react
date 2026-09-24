import { renderHook, waitFor } from "@testing-library/react";
import { useAnalyticsApi } from "./useAnalyticsApi";

jest.mock("../../environments", () => ({
  environment: { urls: { middlewareURL: "http://mockurl.com" } },
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ login: "mock-jwt-token" }, jest.fn(), jest.fn()],
}));

const mockFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ totalUsers: 42 }),
  });
});

afterEach(() => {
  mockFetch.mockReset();
});

describe("useAnalyticsApi", () => {
  it("returns initial state synchronously when enabled=false", () => {
    const { result } = renderHook(() =>
      useAnalyticsApi({ endpoint: "/analytics/global", enabled: false })
    );
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches and returns data when enabled", async () => {
    const { result } = renderHook(() =>
      useAnalyticsApi({ endpoint: "/analytics/global" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ totalUsers: 42 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/analytics/global"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-jwt-token",
        }),
      })
    );
  });

  it("skips fetching when enabled=false", async () => {
    const { result } = renderHook(() =>
      useAnalyticsApi({ endpoint: "/analytics/global", enabled: false })
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("re-fetches when endpoint changes", async () => {
    const { result, rerender } = renderHook(
      ({ endpoint }) => useAnalyticsApi({ endpoint }),
      { initialProps: { endpoint: "/analytics/global" } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ endpoint: "/analytics/zipcode/all" });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain("/analytics/global");
    expect(mockFetch.mock.calls[1][0]).toContain("/analytics/zipcode/all");
  });

  it("sets error state on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() =>
      useAnalyticsApi({ endpoint: "/analytics/global" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
