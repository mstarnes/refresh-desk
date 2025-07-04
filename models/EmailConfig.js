const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const emailConfigSchema = new Schema({
  name: { type: String, required: true },
  product_id: { type: String }, // Custom field, nullable
  to_email: { type: String, required: true },
  reply_email: { type: String, required: true },
  group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
  primary: { type: Boolean, default: false }, // Renamed from primary_role
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmailConfig', emailConfigSchema);