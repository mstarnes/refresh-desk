const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketFieldSchema = new Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String },
  position: { type: Number },
  required_for_closure: { type: Boolean, default: false },
  required_for_agents: { type: Boolean, default: false },
  type: { type: String, required: true },
  default: { type: Boolean, default: false },
  customers_can_edit: { type: Boolean, default: false },
  customers_can_filter: { type: Boolean, default: false },
  label_for_customers: { type: String },
  required_for_customers: { type: Boolean, default: false },
  displayed_to_customers: { type: Boolean, default: false },
  choices: { type: Schema.Types.Mixed }, // Handles arrays or objects
  portal_cc: { type: Boolean },
  portal_cc_to: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TicketField', ticketFieldSchema);