const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ticketDisplayIdMapSchema = new Schema({
  ticket_id: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
  display_id: { type: Number, required: true, unique: true },
});

module.exports = mongoose.model('TicketDisplayIdMap', ticketDisplayIdMapSchema);