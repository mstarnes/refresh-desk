const mongoose = require('mongoose');

const CompanyDomainSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  account_id: { type: Number },
  company_id: { type: Number },
  domain: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
});

const CompanySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  cust_identifier: { type: String, default: null },
  account_id: { type: Number },
  description: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
  sla_policy_id: { type: Number },
  note: { type: String },
  domains: { type: String },
  options: { type: Object, default: {} },
  health_score: { type: String, default: null },
  account_tier: { type: String },
  renewal_date: { type: String, default: null },
  industry: { type: String, default: null },
  custom_field: { type: Object, default: {} },
  company_domains: [CompanyDomainSchema],
});

module.exports = mongoose.model('Company', CompanySchema);