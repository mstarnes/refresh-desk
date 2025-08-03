const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roleSchema = new Schema({
  name: { type: String, required: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  description: { type: String },
  default: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  agent_type: { type: Number }, // Custom field from Roles0.json
});

module.exports = mongoose.model('Role', roleSchema);