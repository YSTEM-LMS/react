const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    phase: {
      type: String,
      enum: ['warm-up', 'explore', 'teach', 'plan', 'reflection'],
      default: 'warm-up',
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    summary: {
      type: String,
      default: '',
    },
    actions: {
      type: [String],
      default: [],
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoachTemplate',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
