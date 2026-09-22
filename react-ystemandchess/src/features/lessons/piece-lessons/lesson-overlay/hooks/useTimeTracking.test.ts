import { renderHook, act } from "@testing-library/react";
import { useTimeTracking } from "./useTimeTracking";
import { SetPermissionLevel } from "../../../../../globals";

// mock SetPermissionLevel
jest.mock("../../../../../globals", () => ({
    SetPermissionLevel: jest.fn(),
}));

// mock environment URL
jest.mock("../../../../../environments", () => ({
    environment: { urls: { middlewareURL: "http://mockurl.com" } },
}));

describe("useTimeTracking", () => {
    let mockCookies: any;

    beforeEach(() => {
        mockCookies = { login: "mockToken" };

        // mock fetch
        global.fetch = jest.fn((url, options) => {
            if (url.includes("/timeTracking/start")) {
                return Promise.resolve({
                    json: () =>
                        Promise.resolve({ eventId: "event123", startTime: new Date().toISOString() }),
                });
            }
            if (url.includes("/timeTracking/update")) {
                return Promise.resolve({ ok: true });
            }
            return Promise.reject("Unhandled fetch " + url);
        }) as jest.Mock;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("starts recording and sets username, eventID, and startTime", async () => {
        (SetPermissionLevel as jest.Mock).mockResolvedValue({ username: "testUser" });

        const { result } = renderHook(() =>
            useTimeTracking("testPiece", mockCookies)
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(SetPermissionLevel).toHaveBeenCalledWith(mockCookies);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/timeTracking/start"),
            expect.objectContaining({
                method: "POST",
                headers: { Authorization: `Bearer ${mockCookies.login}` },
            })
        );
    });

    it("updates time on unload if startTime, username, and eventID exist", async () => {
        (SetPermissionLevel as jest.Mock).mockResolvedValue({ username: "testUser" });

        const { unmount } = renderHook(() =>
            useTimeTracking("testPiece", mockCookies)
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // simulate unmount which should triggers handleUnloadRef
        await act(async () => {
            unmount();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/timeTracking/update"),
            expect.objectContaining({
                method: "PUT",
                headers: { Authorization: `Bearer ${mockCookies.login}` },
            })
        );
    });

    it("does not call update if SetPermissionLevel returns error", async () => {
        (SetPermissionLevel as jest.Mock).mockResolvedValue({ error: "Not logged in" });

        const { unmount } = renderHook(() =>
            useTimeTracking("testPiece", mockCookies)
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        await act(async () => {
            unmount();
        });

        // only startRecording should be attempted
        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining("/timeTracking/update"),
            expect.anything()
        );
    });
});
