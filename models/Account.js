// models/Account.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AccountSchema = new Schema({
  name: { type: String, required: true },
  domain: { type: String, required: true, unique: true }, // e.g., tenant.refreshdesk.com
  id: { type: Number, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', AccountSchema);