const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompanyDomainSchema = new Schema({
  id: { type: Number, required: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  company_id: { type: Number },
  domain: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const CompanySchema = new Schema({
  id: { type: Number, required: true, unique: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  name: { type: String, required: true },
  cust_identifier: { type: String, default: null },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
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