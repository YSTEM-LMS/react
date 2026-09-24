/**
 * Meetings Routes
 * 
 * API endpoints for managing video meeting sessions between mentors and students.
 * Handles meeting creation, pairing, recording management, and chess move tracking.
 * 
 * Features:
 * - Automatic mentor-student pairing (matchmaking)
 * - Video meeting room management with Agora
 * - Cloud recording start/stop via Agora API
 * - Chess move storage during meetings
 * - Azure Blob Storage integration for recording retrieval
 * - Undo permission management for chess moves
 */

const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");
const config = require("config");
const requestIp = require("request-ip");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { waitingStudents, waitingMentors } = require("../models/waiting");
const meetings = require("../models/meetings");
const movesList = require("../models/moves");
const undoPermission = require("../models/undoPermission");
const users = require("../models/users");
const { startRecording, stopRecording } = require("../utils/recordings");

// State variable to prevent concurrent pairing operations
var isBusy = false;

/**
 * GET /meetings/singleRecording
 * 
 * Generates a SAS URL for accessing a meeting recording from Azure Blob Storage.
 * URL expires after 7 days for security.
 *
 * Query Parameters:
 * - filename: Name of the recording blob in the Azure container
 * 
 * @access JWT authentication required
 */
router.get(
  "/singleRecording",
  [check("filename", "The filename is required").not().isEmpty()],
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const account = config.get("azureStorageAccount");
      const accountKey = config.get("azureStorageKey");
      const container = config.get("azureContainer");
      const filename = req.query.filename;

      const credential = new StorageSharedKeyCredential(account, accountKey);
      const blobClient = new BlobServiceClient(
        `https://${account}.blob.core.windows.net`,
        credential
      )
        .getContainerClient(container)
        .getBlobClient(filename);

      // Read-only SAS token, 7-day expiry (matches previous S3 Expires: 604800).
      const sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName: filename,
          permissions: BlobSASPermissions.parse("r"),
          expiresOn: new Date(Date.now() + 604800 * 1000),
        },
        credential
      ).toString();

      const url = `${blobClient.url}?${sas}`;
      res.status(200).json(url);
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  },
);

// @route   GET /meetings/recordings
// @desc    GET all recordings available for the student or mentor
// @access  Public with jwt Authentication
router.get("/recordings", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username, firstName, lastName } = req.user;
    let filters = { CurrentlyOngoing: false };
    if (role === "student") {
      filters.studentUsername = username;
      filters.studentFirstName = firstName;
      filters.studentLastName = lastName;
    } else if (role === "mentor") {
      filters.mentorUsername = username;
      filters.mentorFirstName = firstName;
      filters.mentorLastName = lastName;
    } else {
      return res
        .status(404)
        .json("Must be a student or mentor to get your own recordings");
    }

    const recordings = await meetings.find(filters); //Find all meetings with the listed filters above

    //Error handling for query
    if (!recordings) {
      res.status(400).json("User did not have any recordings available");
    } else {
      res.send(recordings);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

// @route   GET /meetings/usersRecordings
// @desc    GET all recordings available for the student or mentor
// @access  Public with jwt Authentication
router.get(
  "/usersRecordings",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    // console.log(req);
    try {
      const { role, username, firstName, lastName } = req.user;
      let filters = {};
      if (role === "student") {
        filters.studentUsername = username;
      } else if (role === "mentor") {
        filters.mentorUsername = username;
      } else {
        return res
          .status(404)
          .json("Must be a student or mentor to get your own recordings");
      }

      const recordings = await meetings.find(filters); //Find all meetings with the listed filters above
      // console.log('recordings = ',recordings);
      //Error handling for query
      if (!recordings) {
        res.status(400).json("User did not have any recordings available");
      } else {
        res.send(recordings.reverse());
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  },
);
// @route   GET /meetings/parents/recordings
// @desc    GET all recordings available for the student from a parent account
// @access  Public with jwt Authentication
router.get(
  "/parents/recordings",
  [check("childUsername", "The child's username is required").not().isEmpty()],
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { role, username } = req.user;
    const { childUsername } = req.query;

    try {
      if (role === "parent") {
        const child = await users.findOne({
          parentUsername: username,
          username: childUsername,
        });
        if (!child) {
          return res
            .status(400)
            .json("You are not the parent to the requested child.");
        }
        const recordings = await meetings
          .find({
            studentUsername: childUsername,
            filesList: { $ne: null },
          })
          .select(["filesList", "meetingStartTime", "-_id"]); //Select only fileName and meetingStartTime fields for all found entries

        //Error checking for no recordings
        if (recordings?.length === 0) {
          res
            .status(400)
            .json("Could not find any recordings for the requested child.");
        } else {
          res.send(recordings);
        }
      } else {
        res.status(404).json("You are not the parent of the requested child.");
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  },
);

// @route   GET /meetings/inMeeting
// @desc    GET the meeting if the USER is in a meeting otherwise return message
// @access  Public with jwt Authentication
router.get("/inMeeting", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username } = req.user;

    let message = await inMeeting(role, username);
    res.status(200).json(message);
  } catch (error) {
    console.error(
      "something went wrong while executing /inMeeting api",
      error.message,
    );
    res.status(500).json("Server error");
  }
});

// @route   POST /meetings/queue
// @desc    POST an entry to the waitingStudents or waitingMentors collection depending on role
// @access  Public with jwt Authentication
router.post("/queue", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username, firstName, lastName } = req.user; //Data retrieved from jwt authentication

    //Check if the user is in a meeting
    let message = await inMeeting(role, username);
    if (message !== "There are no current meetings with this user.") {
      return res.status(400).json(message);
    }

    if (role === "mentor") {
      await waitingMentors.create({
        username,
        firstName,
        lastName,
        requestedGameAt: new Date(),
      });
    } else if (role === "student") {
      await waitingStudents.create({
        username,
        firstName,
        lastName,
        requestedGameAt: new Date(),
      });
    } else {
      return res
        .status(400)
        .json("You must be a mentor or student to find a game");
    }
    res.status(200).json("Person Added Successfully.");
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

// @route   POST /meetings/pairUp
// @desc    POST a meeting with a student and mentor
// @access  Public with jwt Authentication
router.post("/pairUp", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username, firstName, lastName } = req.user;
    let studentInfo = {};
    let mentorInfo = {};

    //Get a first person in queue from either waitingMentors or waitingStudents collection
    let waitingQueue;
    if (role === "student") {
      Justueue = await waitingMentors.findOne(
        {},
        {},
        { sort: { created_at: 1 } },
      );
    } else if (role === "mentor") {
      waitingQueue = await waitingStudents.findOne(
        {},
        {},
        { sort: { created_at: 1 } },
      );
    } else {
      return res
        .status(404)
        .json("Must be a student or mentor to pair up for a game.");
    }
    if (!waitingQueue) {
      return res
        .status(200)
        .json(
          "No one is available for matchmaking. Please wait for the next available person",
        );
    }

    const response = await inMeeting(role, username); //Check if user is in a meeting

    //Check if the user waiting for a game is in a meeting already
    const secondResponse = await inMeeting(
      role === "student" ? "mentor" : "student",
      waitingQueue.username,
    );

    if (
      response === "There are no current meetings with this user." &&
      secondResponse === "There are no current meetings with this user." &&
      !isBusy
    ) {
      isBusy = true; //Change state to busy to complete query

      //Set information for ease of access and less redundant meeting creation code
      if (role === "student") {
        studentInfo.username = username;
        studentInfo.firstName = firstName;
        studentInfo.lastName = lastName;
        mentorInfo.username = waitingQueue.username;
        mentorInfo.firstName = waitingQueue.firstName;
        mentorInfo.lastName = waitingQueue.lastName;
      } else {
        mentorInfo.username = username;
        mentorInfo.firstName = firstName;
        mentorInfo.lastName = lastName;
        studentInfo.username = waitingQueue.username;
        studentInfo.firstName = waitingQueue.firstName;
        studentInfo.lastName = waitingQueue.lastName;
      }
      const meetingId = uuidv4(); //Generate a random meetingId

      const recordingInfo = await startRecording(meetingId); //Create and start the recording for the mentor and student

      //Error checking to see if a meeting was able to be created
      if (recordingInfo === "Could not start recording. Server error.") {
        return res.status(400).json(recordingInfo);
      }

      const uniquePassword = uuidv4(); //Generated a random password for the meeting

      //Create the meeting with all the required fields
      //Save the meeting
      await meetings.create({
        meetingId: meetingId,
        password: uniquePassword,
        studentUsername: studentInfo.username,
        studentFirstName: studentInfo.firstName,
        studentLastName: studentInfo.lastName,
        mentorUsername: mentorInfo.username,
        mentorFirstName: mentorInfo.firstName,
        mentorLastName: mentorInfo.lastName,
        CurrentlyOngoing: true,
        resourceId: recordingInfo.resourceId,
        sid: recordingInfo.sid,
        meetingStartTime: new Date(),
      });

      await deleteUser("student", studentInfo.username); //Remove user from the waitingStudents collection
      await deleteUser("mentor", mentorInfo.username); //Remove user from the waitingMentors collection
      isBusy = false; //Set state to not busy
    }
    return res.status(200).json("Ok");
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

// @route   PUT /meetings/endMeeting
// @desc    PUT a meeting to end and stop the agora recording
// @access  Public with jwt Authentication
router.put("/endMeeting", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username, firstName, lastName } = req.user; //retrieve jwt info
    let filters = { CurrentlyOngoing: true };
    if (role === "student") {
      filters.studentUsername = username;
      filters.studentFirstName = firstName;
      filters.studentLastName = lastName;
    } else if (role === "mentor") {
      filters.mentorUsername = username;
      filters.mentorFirstName = firstName;
      filters.mentorLastName = lastName;
    } else {
      return res
        .status(404)
        .json("You must be a student or mentor to end the meeting!");
    }
    const currMeeting = await meetings.findOne(filters); //Find the meeting the user is currently in

    //Error checking to ensure the user is actually in a meeting
    if (!currMeeting) {
      return res.status(400).json("You are currently not in a meeting!");
    }

    //Stop the agora recording
    const stopResponse = await stopRecording(
      currMeeting.meetingId,
      currMeeting.resourceId,
      currMeeting.sid,
    );

    //Error checking to ensure the recording was stopped
    // if (stopResponse === "Could not stop recording. Server error.") {
    //   return res.status(400).json(stopResponse);
    // }

    //Get all mp4 files from recording and push them onto an array
    let filesList = [];
    if (
      stopResponse &&
      stopResponse?.fileList &&
      stopResponse?.fileList?.length > 0
    ) {
      await Promise.all(
        stopResponse?.fileList?.map((file) => {
          if (file?.fileName?.indexOf(".mp4") !== -1) {
            filesList.push(file.fileName);
          }
        }),
      );
    }

    //Update the fields to the meeting to change to inactive
    currMeeting.CurrentlyOngoing = false;
    currMeeting.meetingEndTime = new Date();
    currMeeting.filesList = filesList;
    await currMeeting.save(); //Save the changes made

    //Calculate the number of minutes the recording went on for
    const timePlayed = Math.floor(
      (currMeeting.meetingEndTime.getTime() -
        currMeeting.meetingStartTime.getTime()) /
        1000 /
        60,
    );

    //Update the student timePlayed field
    let returnMessage = await updateTimePlayed(
      currMeeting.studentUsername,
      currMeeting.studentFirstName,
      currMeeting.studentLastName,
      timePlayed,
    );

    //Error checking to make sure it updated the field
    if (returnMessage !== "Saved") {
      return res.status(404).json(returnMessage);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

// @route   DELETE meetings/dequeue
// @desc    DELETE the user from the waitingStudents or waitingMentors collection depending on role
// @access  Public with jwt Authentication
router.delete("/dequeue", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { role, username } = req.user;
    let deleted = await deleteUser(role, username);
    if (!deleted) {
      return res.status(400).json("User was not queued for any meetings");
    }
    res.status(200).json("Removed user");
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

//Async function to check whether a username is in a current meeting
const inMeeting = async (role, username) => {
  let filters = { CurrentlyOngoing: true };
  if (role === "student") {
    filters.studentUsername = username;
  } else if (role === "mentor") {
    filters.mentorUsername = username;
  } else {
    return "Please be either a student or a mentor.";
  }
  const foundMeeting = await meetings.find(filters);
  if (foundMeeting.length !== 0) {
    await deleteUser(role, username);
    return foundMeeting;
  }
  return "There are no current meetings with this user.";
};

//Async function to delete a user from the waitingStudents or waitingMentors collection
// changes by riken start
const deleteUser = async (role, username) => {
  if (role === "student") {
    const user = await waitingStudents.findOne({ username: username });
    if (user != null) {
      user.delete();
    }
  } else if (role === "mentor") {
    const mentor = await waitingMentors.findOne({ username: username });
    if (mentor != null) {
      mentor.delete();
    }
  }
  //   await waitingStudents.findOneAndDelete(
  //     {
  //       username,
  //     },
  //     function (error, doc) {
  //       if (error) return false;
  //     }
  //   );
  // } else if (role === "mentor") {
  //   await waitingMentors.findOneAndDelete(
  //     {
  //       username,
  //     },
  //     function (error, doc) {
  //       if (error) return false;
  //     }
  //   );
  // }
  // changes by riken end

  return true;
};
//Async function to create and start an agora recording session

//Async function to update the time played for a user
const updateTimePlayed = async (username, firstName, lastName, timePlayed) => {
  //Find the user in question
  const user = await users.findOne({
    username: username,
    firstName: firstName,
    lastName: lastName,
  });
  if (!user) {
    return "Could not find user";
  }

  user.timePlayed += timePlayed; //Update the time played
  await user.save(); //Save the new time played
  return "Saved";
};
//Async function to get moves from the database
const getMoves = async (meetingId) => {
  const moves = await meetings.findOne({
    meetingId: meetingId,
    CurrentlyOngoing: true,
  });
  return moves;
};

//Async function to store moves in the database
const updateMoves = async (meetingId, oldMovesArr) => {
  const newdata = await meetings.findOneAndUpdate(
    { meetingId: meetingId },
    { moves: oldMovesArr },
  );
  return newdata;
};

//Async function to update undo permission in the database
const updateUndoPermission = async (meetingId, value) => {
  if (value == "student") {
    const newdata = await undoPermission.findOne({ meetingId: meetingId });
    if (!newdata) {
      await undoPermission.create({
        meetingId: meetingId,
        permission: true,
      });
    } else {
      await undoPermission.findOneAndUpdate(
        { meetingId: meetingId },
        { permission: true },
      );
    }
  } else {
    await undoPermission.findOneAndUpdate(
      { meetingId: meetingId },
      { permission: false },
    );
  }

  // return newdata;
};

/**
 * Verifies that the authenticated user is a participant of the meeting (or admin)
 */
const isMeetingParticipant = (meeting, user) => {
  if (!meeting || !user) return false;
  if (user.role === "admin") return true;
  return (
    user.username === meeting.studentUsername ||
    user.username === meeting.mentorUsername
  );
};

/**
 * Verifies that the authenticated user is the owner of the gameMoves record (or admin)
 */
const isGameOwner = (game, user) => {
  if (!game || !user) return false;
  if (user.role === "admin") return true;
  return (
    !game.userId ||
    game.userId === user.username ||
    game.userId === user._id?.toString()
  );
};

router.post("/boardState", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { meetingId, fen, pos, image, role } = req.query;
    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }
    let meeting = await getMoves(meetingId);
    if (!meeting) {
      meeting = await meetings.findOne({ meetingId });
    }
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!isMeetingParticipant(meeting, req.user)) {
      return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
    }

    if (pos == "") {
      // do nothing
      return res.status(200).send([]);
    } else {
      let moveArray = meeting.moves || [];
      let oldMovesArr = [];
      let moveArrayLength = moveArray.length;
      if (moveArray.length > 0) {
        oldMovesArr = moveArray[moveArrayLength - 1];
        moveArrayLength = moveArray.length - 1;
      }
      if (
        oldMovesArr.length === 0 ||
        oldMovesArr[oldMovesArr.length - 1]?.fen !== fen
      ) {
        fen && oldMovesArr.push({ fen, pos, image });
        moveArray[moveArrayLength] = oldMovesArr;
        let updatedMove = await updateMoves(meetingId, moveArray);
        await updateUndoPermission(meetingId, role);
        res.status(200).send(updatedMove);
      } else {
        res.status(202).send(oldMovesArr);
      }
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

router.get("/getBoardState", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { meetingId } = req.query;
    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }
    let meeting = await getMoves(meetingId);
    if (!meeting) {
      meeting = await meetings.findOne({ meetingId });
    }
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!isMeetingParticipant(meeting, req.user)) {
      return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
    }
    res.status(200).send(meeting);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

router.post(
  "/newBoardState",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { meetingId } = req.query;
      if (!meetingId) {
        return res.status(400).json({ error: "meetingId is required" });
      }
      let meeting = await getMoves(meetingId);
      if (!meeting) {
        meeting = await meetings.findOne({ meetingId });
      }
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      if (!isMeetingParticipant(meeting, req.user)) {
        return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
      }
      let moveArray = meeting.moves || [];
      let oldMovesArr = [];
      let moveArrayLength = moveArray.length;
      moveArray[moveArrayLength] = oldMovesArr;
      let updatedMove = await updateMoves(meetingId, moveArray);
      res.status(200).send(updatedMove);
    } catch (error) {
      console.error(error.message);
      res.status(500).json("Server error");
    }
  },
);

router.post("/storeMoves", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { gameId, fen, pos, image } = req.query;
    if (gameId) {
      const getbyId = await getMovesByGameId(gameId);
      if (!getbyId) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (!isGameOwner(getbyId, req.user)) {
        return res.status(403).json({ error: "Forbidden: cannot mutate another user's game moves" });
      }
      let moveArray = getbyId.moves || [];
      let oldMovesArr = [];
      let moveArrayLength = moveArray.length;
      if (moveArray.length > 0) {
        oldMovesArr = moveArray[moveArrayLength - 1];
        moveArrayLength = moveArray.length - 1;
      }
      if (
        oldMovesArr.length === 0 ||
        oldMovesArr[oldMovesArr.length - 1]?.fen !== fen
      ) {
        fen && oldMovesArr.push({ fen, pos, image });
        moveArray[moveArrayLength] = oldMovesArr;
        let updatedMove = await updateMoveByGameId(gameId, moveArray);
        res.status(200).send(updatedMove);
      } else {
        res.status(202).send(oldMovesArr);
      }
    } else {
      const newGameId = uuidv4();
      const ipAddress = requestIp.getClientIp(req);
      const userId = req.user.username || req.user._id?.toString();
      const moves = [];
      let response = await movesList.create({
        gameId: newGameId,
        userId: userId,
        moves: moves,
        ipAddress: ipAddress,
      });
      res.status(200).send(response);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

router.post("/newGameStoreMoves", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }
    let game = await getMovesByGameId(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (!isGameOwner(game, req.user)) {
      return res.status(403).json({ error: "Forbidden: cannot mutate another user's game moves" });
    }
    let moveArray = game.moves || [];
    let oldMovesArr = [];
    let moveArrayLength = moveArray.length;
    moveArray[moveArrayLength] = oldMovesArr;
    let updatedMove = await updateMoveByGameId(gameId, moveArray);
    res.status(200).send(updatedMove);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

router.get("/getStoreMoves", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { gameId, meetingId } = req.query;
    if (meetingId) {
      let getBoardStates = await getMoves(meetingId);
      if (!getBoardStates) {
        getBoardStates = await meetings.findOne({ meetingId });
      }
      if (!getBoardStates) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      if (!isMeetingParticipant(getBoardStates, req.user)) {
        return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
      }
      res.status(200).send(getBoardStates);
    } else if (gameId) {
      const getBoardStates = await getMovesByGameId(gameId);
      if (!getBoardStates) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (!isGameOwner(getBoardStates, req.user)) {
        return res.status(403).json({ error: "Forbidden: cannot access another user's game moves" });
      }
      res.status(200).send(getBoardStates);
    } else {
      res.status(400).json({ error: "gameId or meetingId is required" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

router.post("/checkUndoPermission", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { meetingId } = req.query;
    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }
    let meeting = await getMoves(meetingId);
    if (!meeting) {
      meeting = await meetings.findOne({ meetingId });
    }
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!isMeetingParticipant(meeting, req.user)) {
      return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
    }
    const checkPermission = await undoPermission.findOne({
      meetingId: meetingId,
    });
    res.status(200).send(checkPermission);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("server error");
  }
});

router.post("/undoMeetingMoves", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { meetingId } = req.query;
    if (!meetingId) {
      return res.status(400).json({ error: "meetingId is required" });
    }
    let getBoardState = await getMoves(meetingId);
    if (!getBoardState) {
      getBoardState = await meetings.findOne({ meetingId });
    }
    if (!getBoardState) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    if (!isMeetingParticipant(getBoardState, req.user)) {
      return res.status(403).json({ error: "Forbidden: not a participant of this meeting" });
    }
    const movesData = getBoardState.moves || [];
    if (movesData.length > 0) {
      const newData = movesData[movesData.length - 1];
      if (Array.isArray(newData)) {
        newData.splice(-2, 2);
      }
    }
    const deletedData = await deleteMovesByMeetingId(meetingId, movesData);
    res.status(200).send(deletedData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("server error");
  }
});

const deleteMovesByMeetingId = async (meetingId, deletedData) => {
  const deletedMove = await meetings.findOneAndUpdate(
    { meetingId: meetingId },
    { moves: deletedData },
  );
  return deletedMove;
};

router.post("/undoMoves", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const { gameId } = req.query;
    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }
    const getBoardState = await getMovesByGameId(gameId);
    if (!getBoardState) {
      return res.status(404).json({ error: "Game not found" });
    }
    if (!isGameOwner(getBoardState, req.user)) {
      return res.status(403).json({ error: "Forbidden: cannot mutate another user's game moves" });
    }
    const movesData = getBoardState.moves || [];
    if (movesData.length > 0) {
      const newData = movesData[movesData.length - 1];
      if (Array.isArray(newData)) {
        newData.splice(-2, 2);
      }
    }
    const deletedData = await deleteMovesByGameId(gameId, movesData);
    res.status(200).send(deletedData);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("server error");
  }
});

const deleteMovesByGameId = async (gameId, deletedData) => {
  const deletedMove = await movesList.findOneAndUpdate(
    { gameId: gameId },
    { moves: deletedData },
  );
  return deletedMove;
};
const getMovesByGameId = async (gameId) => {
  const getMoves = await movesList.findOne({
    gameId: gameId,
  });
  return getMoves;
};
const updateMoveByGameId = async (gameId, oldMovesArr) => {
  const getMoves = await movesList.findOneAndUpdate(
    { gameId: gameId },
    { moves: oldMovesArr },
  );
  return getMoves;
};

module.exports = router;
