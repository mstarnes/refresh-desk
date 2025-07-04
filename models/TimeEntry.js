const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  ticket_id: { type: Number, required: true }, // Now stores Ticket.id
  agent_id: { type: Number, required: true },
  company_id: { type: Number },
  time_spent_in_seconds: { type: Number, required: true },
  time_spent: { type: String }, // Format: "HH:MM"
  billable: { type: Boolean, default: true },
  timer_running: { type: Boolean, default: false },
  note: { type: String },
  start_time: { type: String }, // ISO 8601 format
  executed_at: { type: String }, // ISO 8601 format
  created_at: { type: String, required: true }, // ISO 8601 format
  updated_at: { type: String }, // ISO 8601 format
});

// Add index on ticket_id
TimeEntrySchema.index({ ticket_id: 1 });
TimeEntrySchema.index({ agent_id: 1 }); // Added for agent_id queries

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);