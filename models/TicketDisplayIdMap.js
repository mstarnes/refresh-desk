const mongoose = require('mongoose');

const TicketDisplayIdMapSchema = new mongoose.Schema({
  ticket_id: { type: Number, required: true },
  display_id: { type: Number, required: true },
  account_id: { type: Number, required: true },
});

TicketDisplayIdMapSchema.index({ ticket_id: 1, display_id: 1, account_id: 1 }, { unique: true });

module.exports = mongoose.model('TicketDisplayIdMap', TicketDisplayIdMapSchema);