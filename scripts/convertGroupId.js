const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Group = require('../models/Group');

async function convertGroupId() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/refresh-desk');
    console.log('Connected to MongoDB');

    // Step 1: Fetch all groups
    const groups = await Group.find({});
    if (groups.length === 0) {
      console.warn('No groups found. Please ensure groups are populated.');
      return;
    }
    console.log(`Found ${groups.length} groups:`);
    groups.forEach((g) => console.log(`Group: id=${g.id}, _id=${g._id}, name=${g.name}`));

    // Step 2: Fetch tickets with raw MongoDB query
    const ticketCollection = conn.connection.collection('tickets');
    const tickets = await ticketCollection.find({ group_id: { $exists: true } }).toArray();
    console.log(`Found ${tickets.length} tickets with group_id field`);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const ticket of tickets) {
      const groupId = ticket.group_id;
      console.log(`Ticket ${ticket.display_id}: group_id=${groupId}, type=${typeof groupId}, raw=${JSON.stringify(groupId)}`);
      if (!groupId || groupId === 'null' || groupId === 'undefined') {
        skippedCount++;
        console.warn(`Skipping ticket ${ticket.display_id} with falsy group_id: ${groupId}`);
        continue;
      }
      const groupIdStr = String(groupId);
      const group = groups.find((g) => String(g.id) === groupIdStr);
      if (group) {
        await ticketCollection.updateOne(
          { _id: ticket._id },
          { $set: { group_id: group._id, updated_at: new Date() } }
        );
        updatedCount++;
        console.log(`Updated ticket ${ticket.display_id} with group_id ${group._id}`);
      } else {
        skippedCount++;
        console.warn(`No group found for ticket ${ticket.display_id} with group_id ${groupIdStr}`);
      }
    }

    console.log(`Migration complete: Updated ${updatedCount} tickets, skipped ${skippedCount} tickets`);
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

convertGroupId();