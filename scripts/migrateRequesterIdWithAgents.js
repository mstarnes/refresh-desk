const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Agent = require('../models/Agent');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

async function migrateRequesterIdWithAgents() {
  try {
    const tickets = await Ticket.find().lean();
    let createdUsers = 0;
    let updatedTickets = 0;
    let skippedTickets = 0;

    for (const ticket of tickets) {
      if (ticket.requester_id && ticket.requester?.email) {
        const email = ticket.requester.email;
        let user = await User.findOne({ email });

        if (!user) {
          // Special handling for mitch.starnes@exotech.pro
          if (email === 'mitch.starnes@exotech.pro') {
            const agent = await Agent.findOne({ email });
            if (agent) {
              user = await User.findOne({ email: agent.email });
              if (!user) {
                const maxUser = await User.findOne().sort({ id: -1 });
                const newUserId = (maxUser?.id || 0) + 1;
                user = new User({
                  id: newUserId,
                  name: agent.name || email.split('@')[0],
                  email: agent.email,
                  password: null,
                });
                await user.save();
                createdUsers++;
                console.log(`Created User for Agent ${email}: _id ${user._id}, id ${user.id}`);
              }
            } else {
              console.log(`No Agent found for ${email} in ticket ${ticket.id}`);
              continue;
            }
          } else {
            // Create new User for other emails (e.g., joann.reyes@exotech.pro, forwarding-noreply@google.com)
            const maxUser = await User.findOne().sort({ id: -1 });
            const newUserId = (maxUser?.id || 0) + 1;
            user = new User({
              id: newUserId,
              name: ticket.requester.name || email.split('@')[0],
              email,
              password: null,
            });
            await user.save();
            createdUsers++;
            console.log(`Created User for email ${email}: _id ${user._id}, id ${user.id}`);
          }
        }

        // Update Ticket with User._id
        await Ticket.updateOne(
          { _id: ticket._id },
          { $set: { requester_id: user._id } }
        );
        updatedTickets++;
        console.log(`Updated ticket ${ticket.id}: requester_id ${ticket.requester_id} -> ${user._id}`);
      } else {
        console.log(`Skipping ticket ${ticket.id}: No requester_id or requester.email`);
        skippedTickets++;
      }
    }

    console.log(
      `Migration complete: Updated ${updatedTickets} tickets, created ${createdUsers} users, skipped ${skippedTickets} tickets`
    );
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.disconnect();
  }
}

migrateRequesterIdWithAgents();