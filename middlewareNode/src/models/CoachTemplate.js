const mongoose = require('mongoose');

const CoachTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    ageGroup: {
      type: String,
      enum: ['elementary', 'middle', 'high', 'general'],
      default: 'general',
      required: true
    },
    topic: {
      type: String,
      required: true
    },
    systemPrompt: {
      type: String,
      required: true
    },
    isEnabled: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('CoachTemplate', CoachTemplateSchema);
