const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function migrateRequesterId() {
  try {
    const tickets = await Ticket.find().lean();
    for (const ticket of tickets) {
      if (ticket.requester_id && ticket.requester?.email) {
        const user = await User.findOne({ email: ticket.requester.email });
        if (user) {
          await Ticket.updateOne(
            { _id: ticket._id },
            { $set: { requester_id: user._id } }
          );
          console.log(`Updated ticket ${ticket.id}: requester_id ${ticket.requester_id} -> ${user._id}`);
        } else {
          console.log(`No user found for ticket ${ticket.id} with email ${ticket.requester.email}`);
        }
      }
    }
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrateRequesterId();