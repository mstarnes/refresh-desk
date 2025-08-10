const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketDisplayIdMapSchema = new Schema({
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  id: { type: Number, required: true },
  next_display_id: { type: Number, required: true },
});

TicketDisplayIdMapSchema.index({ account_id: 1, next_display_id: 1 }, { unique: true });

module.exports = mongoose.model('TicketDisplayIdMap', TicketDisplayIdMapSchema);