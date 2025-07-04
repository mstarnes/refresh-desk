const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
  account_id: { type: Number },
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