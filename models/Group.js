const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true }, // Multi-tenancy
  name: { type: String, required: true },
  description: { type: String },
  account_id: { type: Number },
  escalate_to: { type: Number },
  assign_time: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  ticket_assign_type: { type: Number },
  business_calendar_id: { type: Number, default: null },
  toggle_availability: { type: Boolean },
  capping_limit: { type: Number },
  group_type: { type: Number },
  uid: { type: String, default: null },
  additional_settings: { type: Object, default: {} },
  agent_status_toggle: { type: Boolean },
  department_id: { type: Number },
  agent_ids: [{ type: Schema.Types.ObjectId, ref: 'Agent' }], // Reference Agents
});

module.exports = mongoose.model('Group', GroupSchema);