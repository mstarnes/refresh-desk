const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const settingSchema = new Schema({
  primary_language: { type: String },
  supported_languages: [{ type: String }],
  portal_languages: [{ type: String }],
  help_widget_languages: [{ type: String }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Setting', settingSchema);