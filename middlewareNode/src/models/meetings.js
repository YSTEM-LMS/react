const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 * Meetings schema for storing video meeting session data
 * Tracks participants, recording info, and chess moves during meetings
 */
const meetingsSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    studentUsername: {
      type: String,
      required: true,
    },
    studentFirstName: {
      type: String,
      required: true,
    },
    studentLastName: {
      type: String,
      required: true,
    },
    mentorUsername: {
      type: String,
      required: true,
    },
    mentorFirstName: {
      type: String,
      required: true,
    },
    mentorLastName: {
      type: String,
      required: true,
    },
    CurrentlyOngoing: {
      type: Boolean,
      required: true,
    },
    // Agora cloud-recording handles; absent when recording could not be started
    resourceId: {
      type: String,
    },
    sid: {
      type: String,
    },
    meetingStartTime: {
      type: Date,
      required: true,
    },
    meetingEndTime: {
      type: Date,
    },
    filesList: {
      type: Array,
      default: [],
    },
    moves: {
      type: Array,
      default: [],
    },
  },
  { versionKey: false },
);

module.exports = model("meetings", meetingsSchema, "meetings");
