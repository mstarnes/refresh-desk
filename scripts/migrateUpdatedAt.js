// scripts/migrateUpdatedAt.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

async function migrate() {
  await mongoose.connect('mongodb://localhost/refreshdesk', { useNewUrlParser: true, useUnifiedTopology: true });

  const tickets = await Ticket.find({}); // Or filter if needed
  for (const ticket of tickets) {
    if (typeof ticket.updated_at === 'string') {
      const date = new Date(ticket.updated_at);
      if (!isNaN(date)) {
        ticket.updated_at = date;
        await ticket.save();
      } else {
        console.warn(`Invalid date string for ticket ${ticket._id}: ${ticket.updated_at}`);
      }
    }
  }

  console.log('Migration complete');
  mongoose.disconnect();
}

migrate().catch(err => console.error(err));