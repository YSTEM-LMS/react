/**
 * Integration tests — mentor⇄student live session lifecycle
 * (POST /meetings/pairUp, PUT /meetings/endMeeting).
 *
 * Regression coverage for the bugs that kept the profile "Mentor Session"
 * video call from ever connecting:
 *   - a student's pairUp never looked at the waiting-mentor queue
 *   - a failed Agora cloud-recording start returned 400 AND left the module's
 *     isBusy lock set, so no pair could ever be created again until restart
 *   - endMeeting called stopRecording even when no recording was started
 */

let mockCurrentAuthUser = null;

jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    if (!mockCurrentAuthUser) return res.status(401).json("Unauthorized");
    req.user = mockCurrentAuthUser;
    next();
  }),
}));
jest.mock("../src/models/waiting");
jest.mock("../src/models/meetings");
jest.mock("../src/models/moves");
jest.mock("../src/models/undoPermission");
jest.mock("../src/models/users");
jest.mock("../src/utils/recordings", () => ({
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
}));

const express = require("express");
const request = require("supertest");
const meetingsRoute = require("../src/routes/meetings");
const { waitingStudents, waitingMentors } = require("../src/models/waiting");
const meetings = require("../src/models/meetings");
const users = require("../src/models/users");
const { startRecording, stopRecording } = require("../src/utils/recordings");

const app = express();
app.use(express.json());
app.use("/meetings", meetingsRoute);

const STUDENT = { username: "alice", firstName: "Alice", lastName: "S", role: "student" };
const MENTOR = { username: "bob", firstName: "Bob", lastName: "M", role: "mentor" };

const RECORDING_FAILED = "Could not start recording. Server error.";

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentAuthUser = null;
  meetings.find.mockResolvedValue([]); // nobody is in a meeting yet
  meetings.create.mockResolvedValue({});
  waitingStudents.deleteMany.mockResolvedValue({});
  waitingMentors.deleteMany.mockResolvedValue({});
  startRecording.mockResolvedValue({ sid: "sid-1", resourceId: "res-1" });
});

describe("POST /meetings/pairUp", () => {
  test("a student is paired with the mentor waiting in the queue", async () => {
    // Arrange
    mockCurrentAuthUser = STUDENT;
    waitingMentors.findOne.mockResolvedValue({ ...MENTOR });

    // Act
    const res = await request(app).post("/meetings/pairUp");

    // Assert
    expect(res.status).toBe(200);
    expect(meetings.create).toHaveBeenCalledTimes(1);
    expect(meetings.create.mock.calls[0][0]).toMatchObject({
      studentUsername: "alice",
      mentorUsername: "bob",
      CurrentlyOngoing: true,
    });
  });

  test("a mentor is paired with the student waiting in the queue", async () => {
    mockCurrentAuthUser = MENTOR;
    waitingStudents.findOne.mockResolvedValue({ ...STUDENT });

    const res = await request(app).post("/meetings/pairUp");

    expect(res.status).toBe(200);
    expect(meetings.create.mock.calls[0][0]).toMatchObject({
      studentUsername: "alice",
      mentorUsername: "bob",
      resourceId: "res-1",
      sid: "sid-1",
    });
  });

  test("still creates the meeting when cloud recording cannot start", async () => {
    mockCurrentAuthUser = MENTOR;
    waitingStudents.findOne.mockResolvedValue({ ...STUDENT });
    startRecording.mockResolvedValue(RECORDING_FAILED);

    const res = await request(app).post("/meetings/pairUp");

    expect(res.status).toBe(200);
    expect(meetings.create).toHaveBeenCalledTimes(1);
    const created = meetings.create.mock.calls[0][0];
    expect(created.resourceId).toBeUndefined();
    expect(created.sid).toBeUndefined();
  });

  test("a failure mid-pairing does not lock out every later pairing", async () => {
    mockCurrentAuthUser = MENTOR;
    waitingStudents.findOne.mockResolvedValue({ ...STUDENT });
    meetings.create.mockRejectedValueOnce(new Error("db down"));

    const failed = await request(app).post("/meetings/pairUp");
    const retried = await request(app).post("/meetings/pairUp");

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(200);
    expect(meetings.create).toHaveBeenCalledTimes(2);
  });

  test("does not create a duplicate meeting when the other side paired first", async () => {
    mockCurrentAuthUser = MENTOR;
    waitingStudents.findOne.mockResolvedValue({ ...STUDENT });
    // Both users look free before the lock; the re-check under the lock sees
    // the meeting the student's concurrent pairUp just created.
    meetings.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ meetingId: "m-1" }]);

    const res = await request(app).post("/meetings/pairUp");

    expect(res.status).toBe(200);
    expect(meetings.create).not.toHaveBeenCalled();
    expect(startRecording).not.toHaveBeenCalled();
  });

  test("removes both users from the waiting queues once paired", async () => {
    mockCurrentAuthUser = STUDENT;
    waitingMentors.findOne.mockResolvedValue({ ...MENTOR });

    await request(app).post("/meetings/pairUp");

    expect(waitingStudents.deleteMany).toHaveBeenCalledWith({ username: "alice" });
    expect(waitingMentors.deleteMany).toHaveBeenCalledWith({ username: "bob" });
  });
});

describe("PUT /meetings/endMeeting", () => {
  function ongoingMeeting(extra = {}) {
    return {
      meetingId: "m-1",
      studentUsername: "alice",
      studentFirstName: "Alice",
      studentLastName: "S",
      meetingStartTime: new Date(Date.now() - 5 * 60 * 1000),
      save: jest.fn().mockResolvedValue(undefined),
      ...extra,
    };
  }

  beforeEach(() => {
    users.findOne.mockResolvedValue({ timePlayed: 0, save: jest.fn() });
  });

  test("does not call Agora stop when the meeting was never recorded", async () => {
    mockCurrentAuthUser = MENTOR;
    const meeting = ongoingMeeting();
    meetings.findOne.mockResolvedValue(meeting);

    const res = await request(app).put("/meetings/endMeeting");

    expect(res.status).toBe(200);
    expect(stopRecording).not.toHaveBeenCalled();
    expect(meeting.CurrentlyOngoing).toBe(false);
    expect(meeting.save).toHaveBeenCalled();
  });

  test("finds the meeting by username, like inMeeting, so a name change can't strand it", async () => {
    // The meeting copies names from the waiting-queue entry; if the account's
    // name changed since, matching on names made the session impossible to end.
    mockCurrentAuthUser = MENTOR;
    meetings.findOne.mockResolvedValue(ongoingMeeting());

    const res = await request(app).put("/meetings/endMeeting");

    expect(res.status).toBe(200);
    expect(meetings.findOne).toHaveBeenCalledWith({
      CurrentlyOngoing: true,
      mentorUsername: "bob",
    });
  });

  test("stops the recording when one is running", async () => {
    mockCurrentAuthUser = MENTOR;
    meetings.findOne.mockResolvedValue(ongoingMeeting({ resourceId: "res-1", sid: "sid-1" }));
    stopRecording.mockResolvedValue({ fileList: [{ fileName: "m-1.mp4" }] });

    const res = await request(app).put("/meetings/endMeeting");

    expect(res.status).toBe(200);
    expect(stopRecording).toHaveBeenCalledWith("m-1", "res-1", "sid-1");
  });
});
