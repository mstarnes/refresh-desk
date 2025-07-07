// scripts/cleanClosedAt.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

async function cleanClosedAt() {
  try {
    await mongoose.connect('mongodb://localhost/refresh-desk');
    
    const tickets = await Ticket.find({ status: 5 }); // Closed tickets
    let updatedCount = 0;
    
    for (const ticket of tickets) {
      if (!ticket.closed_at || isNaN(new Date(ticket.closed_at))) {
        await Ticket.findByIdAndUpdate(ticket._id, { closed_at: new Date().toISOString() });
        console.log(`Updated closed_at for ticket ${ticket.display_id}`);
        updatedCount++;
      }
    }

    console.log(`Cleanup complete: ${updatedCount} tickets updated`);
    mongoose.connection.close();
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

cleanClosedAt();