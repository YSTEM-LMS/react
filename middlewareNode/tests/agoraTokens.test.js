/**
 * Agora RTC token issuing — utils/agoraTokens and GET /meetings/agoraToken.
 *
 * An Agora project with an App Certificate rejects App-ID-only joins
 * ("CAN_NOT_GET_GATEWAY_SERVER: dynamic use static key"), so the video call
 * needs a server-issued token per participant.
 */

const { AccessToken2, kRtcServiceType } = require("agora-token/src/AccessToken2");

// 32-hex-char test values (the shape of a real App ID / App Certificate).
const APP_ID = "0123456789abcdef0123456789abcdef";
const APP_CERT = "fedcba9876543210fedcba9876543210";

function decode(token) {
  const parsed = new AccessToken2();
  parsed.from_string(token);
  const rtc = parsed.services[kRtcServiceType];
  const str = (v) => (Buffer.isBuffer(v) ? v.toString() : v);
  return {
    appId: str(parsed.appId),
    expire: parsed.expire,
    channel: str(rtc.__channel_name),
    uid: str(rtc.__uid),
  };
}

function loadTokens(env) {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, ...env };
  return require("../src/utils/agoraTokens");
}

const ORIGINAL_ENV = { ...process.env };
afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("buildRtcCredentials", () => {
  test("issues camera and screen tokens bound to the channel and each uid", () => {
    const { buildRtcCredentials } = loadTokens({ AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: APP_CERT });

    const creds = buildRtcCredentials("meeting-1", "student");

    expect(creds).toMatchObject({ appId: APP_ID, channel: "meeting-1", uid: 456, screenUid: 1456 });
    expect(decode(creds.token)).toMatchObject({ appId: APP_ID, channel: "meeting-1", uid: "456" });
    expect(decode(creds.screenToken)).toMatchObject({ channel: "meeting-1", uid: "1456" });
  });

  test("gives mentor and student different uids", () => {
    const { buildRtcCredentials } = loadTokens({ AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: APP_CERT });

    const mentor = buildRtcCredentials("m", "mentor");
    const student = buildRtcCredentials("m", "student");

    expect([mentor.uid, mentor.screenUid]).toEqual([123, 1123]);
    expect(new Set([mentor.uid, mentor.screenUid, student.uid, student.screenUid]).size).toBe(4);
  });

  test("tokens expire after the session TTL", () => {
    const { buildRtcCredentials, TOKEN_TTL_SECONDS } = loadTokens({
      AGORA_APP_ID: APP_ID,
      AGORA_APP_CERTIFICATE: APP_CERT,
    });

    const { token } = buildRtcCredentials("m", "mentor");

    expect(decode(token).expire).toBe(TOKEN_TTL_SECONDS);
  });

  test("without an App Certificate, returns no tokens (App-ID-only projects)", () => {
    const { buildRtcCredentials, isTokenAuthEnabled } = loadTokens({
      AGORA_APP_ID: APP_ID,
      AGORA_APP_CERTIFICATE: "",
    });

    const creds = buildRtcCredentials("m", "mentor");

    expect(isTokenAuthEnabled()).toBe(false);
    expect(creds).toMatchObject({ appId: APP_ID, token: null, screenToken: null, uid: 123 });
  });

  test("buildRecorderToken signs the cloud recorder's uid", () => {
    const { buildRecorderToken } = loadTokens({ AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: APP_CERT });

    expect(decode(buildRecorderToken("m", "987654")).uid).toBe("987654");
  });

  test("buildRecorderToken returns undefined when token auth is off", () => {
    const { buildRecorderToken } = loadTokens({ AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: "" });

    expect(buildRecorderToken("m", "987654")).toBeUndefined();
  });

  test("rejects an unknown role", () => {
    const { buildRtcCredentials } = loadTokens({ AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: APP_CERT });

    expect(() => buildRtcCredentials("m", "admin")).toThrow(/role/);
  });
});

describe("GET /meetings/agoraToken", () => {
  let mockCurrentAuthUser;
  let app;
  let meetings;
  const request = require("supertest");

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, AGORA_APP_ID: APP_ID, AGORA_APP_CERTIFICATE: APP_CERT };
    mockCurrentAuthUser = null;
    jest.doMock("passport", () => ({
      authenticate: jest.fn(() => (req, res, next) => {
        if (!mockCurrentAuthUser) return res.status(401).json("Unauthorized");
        req.user = mockCurrentAuthUser;
        next();
      }),
    }));
    jest.doMock("../src/models/waiting");
    jest.doMock("../src/models/meetings");
    jest.doMock("../src/models/moves");
    jest.doMock("../src/models/undoPermission");
    jest.doMock("../src/models/users");
    jest.doMock("../src/utils/recordings", () => ({ startRecording: jest.fn(), stopRecording: jest.fn() }));

    const express = require("express");
    meetings = require("../src/models/meetings");
    const { waitingStudents, waitingMentors } = require("../src/models/waiting");
    waitingStudents.deleteMany.mockResolvedValue({});
    waitingMentors.deleteMany.mockResolvedValue({});
    app = express();
    app.use("/meetings", require("../src/routes/meetings"));
  });

  test("401 without a login", async () => {
    const res = await request(app).get("/meetings/agoraToken");

    expect(res.status).toBe(401);
  });

  test("404 when the user is not in an ongoing meeting", async () => {
    mockCurrentAuthUser = { username: "alice", role: "student" };
    meetings.find.mockResolvedValue([]);

    const res = await request(app).get("/meetings/agoraToken");

    expect(res.status).toBe(404);
  });

  test("issues tokens only for the caller's own ongoing meeting", async () => {
    mockCurrentAuthUser = { username: "alice", role: "student" };
    meetings.find.mockResolvedValue([{ meetingId: "m-42", studentUsername: "alice" }]);

    const res = await request(app).get("/meetings/agoraToken?channel=someone-elses-meeting");

    expect(res.status).toBe(200);
    expect(meetings.find).toHaveBeenCalledWith(
      expect.objectContaining({ studentUsername: "alice", CurrentlyOngoing: true }),
    );
    expect(res.body).toMatchObject({ appId: APP_ID, channel: "m-42", uid: 456, screenUid: 1456 });
    expect(decode(res.body.token).channel).toBe("m-42");
  });

  test("400 for a role that cannot join sessions", async () => {
    mockCurrentAuthUser = { username: "root", role: "admin" };

    const res = await request(app).get("/meetings/agoraToken");

    expect(res.status).toBe(400);
  });
});
