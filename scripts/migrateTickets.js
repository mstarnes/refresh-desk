// scripts/migrateTickets.js
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const Agent = require('../models/Agent');

async function migrateTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

    const tickets = await Ticket.find();
    const companies = await Company.find().select('id _id');
    const agents = await Agent.find().select('id _id');

    const companyMap = companies.reduce((map, company) => {
      map[company.id] = company._id;
      return map;
    }, {});
    const agentMap = agents.reduce((map, agent) => {
      map[agent.id] = agent._id;
      return map;
    }, {});

    for (const ticket of tickets) {
      const updates = {};
      if (ticket.requester?.company_id && !ticket.company_id) {
        updates.company_id = companyMap[ticket.requester.company_id] || null;
      }
      if (ticket.responder_id && typeof ticket.responder_id === 'number') {
        updates.responder_id = agentMap[ticket.responder_id] || null;
        updates.responder_name = agentMap[ticket.responder_id] ? (await Agent.findById(agentMap[ticket.responder_id]))?.name : null;
      }
      if (Object.keys(updates).length) {
        await Ticket.findByIdAndUpdate(ticket._id, updates);
        console.log(`Updated ticket ${ticket.display_id}`);
      }
    }

    console.log('Migration complete');
    mongoose.connection.close();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

migrateTickets();