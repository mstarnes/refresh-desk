const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CannedResponseSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  name: { type: String, required: true },
  is_default: { type: Boolean },
  account_id: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  folder_type: { type: Number },
  deleted: { type: Boolean },
  all_canned_responses: [{ type: Schema.Types.Mixed }], // Flexible for future content
});

module.exports = mongoose.model('CannedResponse', CannedResponseSchema);