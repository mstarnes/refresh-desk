const mongoose = require('mongoose');

const TicketDisplayIdMapSchema = new mongoose.Schema({
  ticket_id: { type: Number, required: true, unique: true }, // Maps to Ticket.id
  display_id: { type: Number, required: true, unique: true }, // Maps to Ticket.display_id
});

module.exports = mongoose.model('TicketDisplayIdMap', TicketDisplayIdMapSchema);