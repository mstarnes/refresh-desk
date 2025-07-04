const mongoose = require('mongoose');

const CannedResponseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  is_default: { type: Boolean },
  account_id: { type: Number },
  created_at: { type: String },
  updated_at: { type: String },
  folder_type: { type: Number },
  deleted: { type: Boolean },
  all_canned_responses: [{ type: mongoose.Schema.Types.Mixed }], // Flexible for future content
});

module.exports = mongoose.model('CannedResponse', CannedResponseSchema);