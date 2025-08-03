// models/Agent.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role_id: { type: Schema.Types.ObjectId, ref: 'Role' },
  group_ids: [{ type: Schema.Types.ObjectId, ref: 'Group' }], // Bi-directional
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  active: { type: Boolean },
  customer_id: { type: Number, default: null },
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
  signature: { type: String, default: null }, // Added for renamed signature_html
});

module.exports = mongoose.model('Agent', AgentSchema);