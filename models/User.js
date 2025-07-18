const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String }, // Removed required: true
  created_at: { type: String },
  updated_at: { type: String },
  account_id: { type: Number },
  active: { type: Boolean },
  customer_id: { type: Number, default: null },
  job_title: { type: String },
  phone: { type: String },
  mobile: { type: String },
  twitter_id: { type: String },
  description: { type: String },
  time_zone: { type: String },
  deleted: { type: Boolean },
  fb_profile_id: { type: String, default: null },
  language: { type: String },
  address: { type: String },
  external_id: { type: String, default: null },
  helpdesk_agent: { type: Boolean },
  unique_external_id: { type: String, default: null },
  company_id: { type: Number, default: null },
  custom_field: { type: Object, default: {} },
});

module.exports = mongoose.model('User', UserSchema);