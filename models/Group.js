const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String },
  email: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
  account_id: { type: Number },
  active: { type: Boolean },
  job_title: { type: String },
  phone: { type: String },
  mobile: { type: String, default: null },
  twitter_id: { type: String, default: null },
  description: { type: String, default: null },
  time_zone: { type: String },
  deleted: { type: Boolean },
  fb_profile_id: { type: String, default: null },
  language: { type: String },
  address: { type: String, default: null },
  external_id: { type: String, default: null },
  helpdesk_agent: { type: Boolean },
  unique_external_id: { type: String, default: null },
  company_id: { type: Number, default: null },
});

const GroupSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  account_id: { type: Number },
  escalate_to: { type: Number },
  assign_time: { type: Number },
  created_at: { type: String },
  updated_at: { type: String },
  ticket_assign_type: { type: Number },
  business_calendar_id: { type: Number, default: null },
  toggle_availability: { type: Boolean },
  capping_limit: { type: Number },
  group_type: { type: Number },
  uid: { type: String, default: null },
  additional_settings: { type: Object, default: {} },
  agent_status_toggle: { type: Boolean },
  department_id: { type: Number },
  agents: [AgentSchema],
});

module.exports = mongoose.model('Group', GroupSchema);