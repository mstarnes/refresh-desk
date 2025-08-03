// scripts/migrateGroupAgent.js
const mongoose = require('mongoose');
const Group = require('../models/Group');
const Agent = require('../models/Agent');
const Account = require('../models/Account');

async function migrate() {
  //await mongoose.connect('mongodb://localhost/refresh-desk', { useNewUrlParser: true, useUnifiedTopology: true });
  // MongoDB Connection
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

  // Create default account if missing
  let account = await Account.findOne({ name: 'EXOTECH.PRO Active IT Services' });
  if (!account) {
    account = await new Account({ name: 'EXOTECH.PRO Active IT Services', domain: 'exotech.refreshdesk.com', id: 320932 }).save();
  }
  console.log('account: ' + JSON.stringify(account));

  // Update Groups
  const groups = await Group.find();
  for (const group of groups) {
    if (group.responder_id) {
      // Assume responder_id is an Agent subdoc; extract _id
      const agent = await Agent.findOne({ email: group.responder_id.email });
      if (agent) {
        group.agent_ids = [agent._id];
        group.account_id = account._id;
        delete group.responder_id;
        await group.save();

        // Update Agent's group_ids
        agent.group_ids = agent.group_ids || [];
        if (!agent.group_ids.includes(group._id)) {
          agent.group_ids.push(group._id);
          agent.account_id = account._id;
          await agent.save();
        }
      }
    }
  }

  console.log('Migration complete');
  mongoose.disconnect();
}

migrate().catch(err => console.error(err));