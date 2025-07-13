// scripts/migrateTickets.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const Agent = require('../models/Agent');

async function migrateTickets() {
  try {
    await mongoose.connect('mongodb://localhost/refresh-desk');
    
    const tickets = await Ticket.find();
    const companies = await Company.find().select('id _id');
    const agent = await Agent.findOne({ email: 'mitch.starnes@exotech.pro' });

    if (!agent) {
      console.error('Agent not found: mitch.starnes@exotech.pro');
      return;
    }

    if (agent._id.toString() !== '6868527ff5d2b14198b52653') {
      console.error(`Agent _id mismatch: expected 6868527ff5d2b14198b52653, found ${agent._id}`);
      return;
    }

    const companyMap = companies.reduce((map, company) => {
      map[company.id] = company._id;
      return map;
    }, {});

    let updatedCount = 0;
    for (const ticket of tickets) {
      const updates = {};
      if (ticket.requester?.company_id && !ticket.company_id) {
        updates.company_id = companyMap[ticket.requester.company_id] || null;
      }
      if (!ticket.responder_id || ticket.responder_id.toString() !== '6868527ff5d2b14198b52653') {
        updates.responder_id = new mongoose.Types.ObjectId('6868527ff5d2b14198b52653');
        updates.responder_name = agent.name;
      }
      if (Object.keys(updates).length) {
        await Ticket.findByIdAndUpdate(ticket._id, updates);
        console.log(`Updated ticket ${ticket.display_id}`);
        updatedCount++;
      }
    }

    console.log(`Migration complete: ${updatedCount} tickets updated`);
    mongoose.connection.close();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

migrateTickets();