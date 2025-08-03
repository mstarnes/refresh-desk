const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: './importData.log' }),
    new winston.transports.Console(),
  ],
});

const mongodb = process.env.MONGODB_URI_DV;
logger.info(`Database: ${mongodb}`);

// Use absolute path for data directory
const dataDir = path.join(__dirname, '../data');
logger.info(`Data directory: ${dataDir}`);

// Schemas from models
const Account = require('../models/Account');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Company = require('../models/Company');
const Agent = require('../models/Agent');
const Group = require('../models/Group');
const Solution = require('../models/Solution');
const CannedResponse = require('../models/CannedResponse');
const TimeEntry = require('../models/TimeEntry');
const TicketDisplayIdMap = require('../models/TicketDisplayIdMap'); // Added
const Role = require('../models/Role');
const Skill = require('../models/Skill');
const EmailConfig = require('../models/EmailConfig');
const SLAPolicy = require('../models/SlaPolicy');
const BusinessHour = require('../models/BusinessHour');
const Setting = require('../models/Setting');
const TicketField = require('../models/TicketField');

async function importData() {
  try {
    await mongoose.connect(mongodb);
    logger.info('Connected to MongoDB on ' + mongodb);

    // TODO: account_id is being set to the freshdesk account id

    // Create default account if missing
    let account = await Account.findOne({ name: process.env.ACCOUNT_NAME });
    logger.info('Importing Data for ' + process.env.ACCOUNT_NAME);
    if (!account) {
      account = await new Account({ name: process.env.ACCOUNT_NAME, domain: process.env.ACCOUNT_DOMAIN, id: process.env.ACCOUNT_ID }).save();
      logger.info('Created Account for ' + process.env.ACCOUNT_NAME);
    }

    // Import Users
    logger.info('Importing Users...');
    const usersRawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Users0.json')));
    for (const userData of usersRawData) {
      try {
        const user = new User({
          ...userData.user,
          account_id: account._id,
          created_at: new Date(userData.user.created_at),
          updated_at: new Date(userData.user.updated_at),
        });
        await user.save();
      } catch (err) {
        logger.error(`Error importing User ID ${userData.user.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${usersRawData.length} Users`);

    // Import Agents
    // TODO: assign group ids
    logger.info('Importing Agents...');
    const agentsRawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'AllAgents0.json')));
    for (const agentData of agentsRawData) {
      try {
        //logger.info(JSON.stringify(agentData.user, null, 2));
        const agent = new Agent({
          ...agentData.user,
          account_id: account._id,
          created_at: new Date(agentData.user.created_at),
          updated_at: new Date(agentData.user.updated_at),
        });
        await agent.save();
      } catch (err) {
        logger.error(`Error importing Agent ID ${agentData.user.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${agentsRawData.length} Agents`);

    // Import Companies
    logger.info('Importing Companies...');
    const companiesRawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Companies0.json')));
    for (const companyData of companiesRawData) {
      try {
        // logger.info(JSON.stringify(companyData.company, null, 2));
        // Set account_id for nested company_domains if present
        if (companyData.company.company_domains && Array.isArray(companyData.company.company_domains)) {
          companyData.company.company_domains.forEach(domain => {
            domain.account_id = account._id;
          });
        }
        const company = new Company({
          ...companyData.company,
          account_id: account._id, // Also set top-level account_id if it's ref ObjectId in schema
          created_at: new Date(companyData.company.created_at),
          updated_at: new Date(companyData.company.updated_at),
        });
        await company.save();
      } catch (err) {
        logger.error(`Error importing Company ID ${companyData.company.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${companiesRawData.length} Companies`);

    // Import Groups
    // TODO: handle agent_ids
    logger.info('Importing Groups...');
    const groupData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Groups0.json')));

    // First, collect all unique numeric agent IDs across all groups for efficient querying
    const allNumericAgentIds = new Set();
    for (const g of groupData) {
      for (const agent of g.group.agents) {
        allNumericAgentIds.add(agent.id);
      }
    }

    // Query all relevant Agents at once and create a map from original numeric ID to MongoDB _id (ObjectId)
    const agentIdMap = new Map();
    if (allNumericAgentIds.size > 0) {
      const mongoAgents = await Agent.find({ id: { $in: Array.from(allNumericAgentIds) } }).select('id _id');
      for (const mongoAgent of mongoAgents) {
        agentIdMap.set(mongoAgent.id, mongoAgent._id);
      }
    }

    // Now import each group
    for (const g of groupData) {
      // logger.info(JSON.stringify(g.group, null, 2));
      const agent_ids = [];
      for (const agent of g.group.agents) {
        const objectId = agentIdMap.get(agent.id);
        if (objectId) {
          agent_ids.push(objectId);
        } else {
          logger.warn(`Agent with original ID ${agent.id} not found in database; skipping reference.`);
        }
      }
      const group = new Group({
        ...g.group,
        created_at: new Date(g.group.created_at),
        updated_at: new Date(g.group.updated_at),
        agent_ids: agent_ids,
      });
      await group.save();
      
      // Update bidirectional: Push the new group's _id into each agent's group_ids
      for (const agentObjectId of agent_ids) {
        await Agent.findByIdAndUpdate(
          agentObjectId,
          { $addToSet: { group_ids: group._id } }, // Use $addToSet to avoid duplicates
          { new: true }
        );
      }
    }
    logger.info(`Imported ${groupData.length} Groups`);

/*    
    // Import Groups
    // TODO: handle agent_ids
    logger.info('Importing Groups...');
    const groupData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Groups0.json')));

    // First, collect all unique numeric agent IDs across all groups for efficient querying
    const allNumericAgentIds = new Set();
    for (const g of groupData) {
      for (const agent of g.group.agents) {
        allNumericAgentIds.add(agent.id);
      }
    }

    // Query all relevant Agents at once and create a map from original numeric ID to MongoDB _id (ObjectId)
    const agentIdMap = new Map();
    if (allNumericAgentIds.size > 0) {
      const mongoAgents = await Agent.find({ id: { $in: Array.from(allNumericAgentIds) } }).select('id _id');
      for (const mongoAgent of mongoAgents) {
        agentIdMap.set(mongoAgent.id, mongoAgent._id);
      }
    }

    // Now import each group
    for (const g of groupData) {
      //logger.info(JSON.stringify(g.group, null, 2));
      const agent_ids = [];
      for (const agent of g.group.agents) {
        const objectId = agentIdMap.get(agent.id);
        if (objectId) {
          agent_ids.push(objectId);
        } else {
          logger.warn(`Agent with original ID ${agent.id} not found in database; skipping reference.`);
        }
      }
      try {
        const group = new Group({
          ...g.group,
          created_at: new Date(g.group.created_at),
          updated_at: new Date(g.group.updated_at),
          agent_ids: agent_ids,
        });
        await group.save();
      } catch (err) {
        logger.error(`Error importing Group ID ${g.group.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${groupData.length} Groups`);
*/
    // Import Solutions
    logger.info('Importing Solutions...');
    const solutionsFilePath = path.join(dataDir, 'Solutions0.json');
    if (!fs.existsSync(solutionsFilePath)) {
      logger.error(`Solutions file not found at: ${solutionsFilePath}`);
      throw new Error(`Solutions file not found: ${solutionsFilePath}`);
    }
    const solutionsRawData = JSON.parse(fs.readFileSync(solutionsFilePath));
    for (const solutionData of solutionsRawData) {
      try {
        if (solutionData.category.all_folders) {
          solutionData.category.all_folders.forEach(folder => {
            // Set account_id for folder
            folder.account_id = account._id;
            // Convert folder dates if present
            if (folder.created_at) {
              const createdDate = new Date(folder.created_at);
              if (!isNaN(createdDate.getTime())) {
                folder.created_at = createdDate;
              } else {
                delete folder.created_at;
                logger.warn(`Invalid created_at in folder ${folder.id || 'unknown'}: ${folder.created_at}`);
              }
            }
            if (folder.updated_at) {
              const updatedDate = new Date(folder.updated_at);
              if (!isNaN(updatedDate.getTime())) {
                folder.updated_at = updatedDate;
              } else {
                delete folder.updated_at;
                logger.warn(`Invalid updated_at in folder ${folder.id || 'unknown'}: ${folder.updated_at}`);
              }
            }
            if (folder.articles) {
              folder.articles.forEach(article => {
                // Set account_id for article
                article.account_id = account._id;
                if (article.tags && Array.isArray(article.tags)) {
                  article.tags = article.tags.map(tag =>
                    typeof tag === 'object' && tag.name ? tag.name : tag
                  );
                }
                // Convert article dates if present
                if (article.created_at) {
                  const createdDate = new Date(article.created_at);
                  if (!isNaN(createdDate.getTime())) {
                    article.created_at = createdDate;
                  } else {
                    delete article.created_at;
                    logger.warn(`Invalid created_at in article ${article.id || 'unknown'}: ${article.created_at}`);
                  }
                }
                if (article.updated_at) {
                  const updatedDate = new Date(article.updated_at);
                  if (!isNaN(updatedDate.getTime())) {
                    article.updated_at = updatedDate;
                  } else {
                    delete article.updated_at;
                    logger.warn(`Invalid updated_at in article ${article.id || 'unknown'}: ${article.updated_at}`);
                  }
                }
                if (article.modified_at) {
                  const modifiedDate = new Date(article.modified_at);
                  if (!isNaN(modifiedDate.getTime())) {
                    article.modified_at = modifiedDate;
                  } else {
                    delete article.modified_at;
                    logger.warn(`Invalid modified_at in article ${article.id || 'unknown'}: ${article.modified_at}`);
                  }
                }
                // Set account_id for seo_data if present
                if (article.seo_data) {
                  article.seo_data.account_id = account._id;
                }
              });
            }
          });
        }
        const solution = new Solution({
          ...solutionData.category,
          account_id: account._id,
          created_at: new Date(solutionData.category.created_at),
          updated_at: new Date(solutionData.category.updated_at),
        });
        await solution.save();
      } catch (err) {
        logger.error(`Error importing Solution ID ${solutionData.category.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${solutionsRawData.length} Solutions`);

    // Import Canned Responses
    logger.info('Importing Canned Responses...');
    const cannedResponsesFilePath = path.join(dataDir, 'CannedResponses0.json');
    if (!fs.existsSync(cannedResponsesFilePath)) {
      logger.error(`Canned Responses file not found at: ${cannedResponsesFilePath}`);
      throw new Error(`Canned Responses file not found: ${cannedResponsesFilePath}`);
    }
    const cannedResponsesRawData = JSON.parse(fs.readFileSync(cannedResponsesFilePath));
    for (const cannedResponseData of cannedResponsesRawData) {
      try {
        const cannedResponse = new CannedResponse({
          ...cannedResponseData.folder,
          created_at: new Date(cannedResponseData.folder.created_at),
          updated_at: new Date(cannedResponseData.folder.updated_at),
        });
        await cannedResponse.save();
      } catch (err) {
        logger.error(`Error importing Canned Response ID ${cannedResponseData.folder.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${cannedResponsesRawData.length} Canned Responses`);

  // Import Tickets (example for Tickets0.json)
  logger.info('Importing Tickets...');

  // First, collect all unique requester, responder, and group numeric IDs across all ticket files
  const requesterNumericIds = new Set();
  const responderNumericIds = new Set();
  const groupNumericIds = new Set();
  for (let i = 0; i <= 12; i++) {
    const ticketData = JSON.parse(fs.readFileSync(path.join(dataDir, `Tickets${i}.json`)));
    for (const t of ticketData) {
      if (t.helpdesk_ticket.requester_id) {
        requesterNumericIds.add(t.helpdesk_ticket.requester_id);
      }
      if (t.helpdesk_ticket.responder_id) {
        responderNumericIds.add(t.helpdesk_ticket.responder_id);
      }
      if (t.helpdesk_ticket.group_id) {
        groupNumericIds.add(t.helpdesk_ticket.group_id);
      }
    }
  }

  const requesterIdMap = new Map();
  if (requesterNumericIds.size > 0) {
    const mongoUsers = await User.find({ id: { $in: Array.from(requesterNumericIds) } }).select('id _id');
    for (const mongoUser of mongoUsers) {
      requesterIdMap.set(mongoUser.id, mongoUser._id);
    }
    // If not all found in Users, check Agents for remaining
    const remainingRequesterIdsAfterUsers = Array.from(requesterNumericIds).filter(id => !requesterIdMap.has(id));
    if (remainingRequesterIdsAfterUsers.length > 0) {
      const mongoAgents = await Agent.find({ id: { $in: remainingRequesterIdsAfterUsers } }).select('id _id');
      for (const mongoAgent of mongoAgents) {
        requesterIdMap.set(mongoAgent.id, mongoAgent._id);
      }
    }
    // Grok 4: How about doing remainingRequesterIdsAfterUsersAndAgents here?
    // If still not found after Users and Agents, collect requester data from tickets and create dummy users
    const remainingRequesterIdsAfterUsersAndAgents = Array.from(requesterNumericIds).filter(id => !requesterIdMap.has(id));
    if (remainingRequesterIdsAfterUsersAndAgents.length > 0) {
      const missingRequesterDataMap = new Map(); // Map<id, requesterData> using first occurrence
      for (let j = 0; j <= 12; j++) { // Extra pass over ticket files
        const ticketDataForMissing = JSON.parse(fs.readFileSync(path.join(dataDir, `Tickets${j}.json`)));
        for (const ticket of ticketDataForMissing) {
          const reqId = ticket.helpdesk_ticket.requester_id;
          if (remainingRequesterIdsAfterUsersAndAgents.includes(reqId) && !missingRequesterDataMap.has(reqId) && ticket.helpdesk_ticket.requester) {
            missingRequesterDataMap.set(reqId, ticket.helpdesk_ticket.requester);
          }
        }
      }
      for (const [missingId, requesterData] of missingRequesterDataMap) {
        if (requesterData) {
          const newUser = new User({
            id: missingId, // Original numeric ID
            account_id: account._id,
            name: requesterData.name || 'Unknown Requester',
            email: requesterData.email || `unknown_${missingId}@example.com`,
            active: requesterData.active ?? true,
            created_at: new Date(requesterData.created_at) || new Date(),
            updated_at: new Date(requesterData.updated_at) || new Date(),
            // Add other fields from requesterData if available and matching your User schema
            // e.g., mobile: requesterData.mobile || null,
            // phone: requesterData.phone || null,
            // company_id: requesterData.company_id ? companyIdMap.get(requesterData.company_id) : null, // If you have company mapping
          });
          await newUser.save();
          requesterIdMap.set(missingId, newUser._id);
          logger.info(`Created new user from ticket.requester data for ID ${missingId}`);
        } else {
          logger.warn(`Requester ID ${missingId} still missing data; setting to null in tickets.`);
        }
      }
    }
  }

  /*
  const requesterIdMap = new Map();
  if (requesterNumericIds.size > 0) {
    const mongoUsers = await User.find({ id: { $in: Array.from(requesterNumericIds) } }).select('id _id');
    for (const mongoUser of mongoUsers) {
      requesterIdMap.set(mongoUser.id, mongoUser._id);
    }
    // If not all found in Users, check Agents for remaining
    const remainingRequesterIds = Array.from(requesterNumericIds).filter(id => !requesterIdMap.has(id));
    if (remainingRequesterIds.length > 0) {
      const mongoAgents = await Agent.find({ id: { $in: remainingRequesterIds } }).select('id _id');
      for (const mongoAgent of mongoAgents) {
        requesterIdMap.set(mongoAgent.id, mongoAgent._id);
      }
    }
  }
  */

  const responderIdMap = new Map();
  if (responderNumericIds.size > 0) {
    const mongoAgents = await Agent.find({ id: { $in: Array.from(responderNumericIds) } }).select('id _id');
    for (const mongoAgent of mongoAgents) {
      responderIdMap.set(mongoAgent.id, mongoAgent._id);
    }
  }

  const groupIdMap = new Map();
  if (groupNumericIds.size > 0) {
    const mongoGroups = await Group.find({ id: { $in: Array.from(groupNumericIds) } }).select('id _id');
    for (const mongoGroup of mongoGroups) {
      groupIdMap.set(mongoGroup.id, mongoGroup._id);
    }
  }

  // Query the "IT" group once for fallback
  const itGroup = await Group.findOne({ name: "IT" });
  if (!itGroup) {
    logger.warn('IT group not found; cannot assign to tickets with null group_id.');
  }

  // Now import the tickets
  for (let i = 0; i <= 12; i++) {
    const ticketData = JSON.parse(fs.readFileSync(path.join(dataDir, `Tickets${i}.json`)));
    for (const t of ticketData) {

      // logger.info(JSON.stringify(t.helpdesk_ticket));
      // Transform tags
      if (t.helpdesk_ticket.tags && Array.isArray(t.helpdesk_ticket.tags)) {
        t.helpdesk_ticket.tags = t.helpdesk_ticket.tags.map(tag =>
          typeof tag === 'object' && tag.name ? tag.name : tag
        );
      }

      // Transform reports_data.group_users
      if (t.helpdesk_ticket.reports_data && t.helpdesk_ticket.reports_data.group_users) {
        t.helpdesk_ticket.reports_data.group_users = t.helpdesk_ticket.reports_data.group_users.map(user =>
          typeof user === 'object' && user.id ? user.id.toString() : user
        );
      }

      // Map notes to conversations
      if (t.helpdesk_ticket.notes && Array.isArray(t.helpdesk_ticket.notes)) {
        t.helpdesk_ticket.conversations = t.helpdesk_ticket.notes.map(note => ({
          ...note,
          account_id: account._id,
          body_text: note.body,
          body: note.body_html,
          created_at: new Date(note.created_at),
          updated_at: new Date(note.updated_at),
        }));
        delete t.helpdesk_ticket.notes;
      }

      // Set account_id for embedded objects
      if (t.helpdesk_ticket.requester) {
        t.helpdesk_ticket.requester.account_id = account._id;
      }
      if (t.helpdesk_ticket.cc_email) {
        t.helpdesk_ticket.cc_email.account_id = account._id;
      }
      if (t.helpdesk_ticket.reports_data) {
        t.helpdesk_ticket.reports_data.account_id = account._id;
      }

      // Map requester_id, responder_id, and group_id to ObjectIds
      if (t.helpdesk_ticket.requester_id) {
        const requesterObjectId = requesterIdMap.get(t.helpdesk_ticket.requester_id);
        if (requesterObjectId) {
          t.helpdesk_ticket.requester_id = requesterObjectId;
        } else {
          logger.warn(`Requester with original ID ${t.helpdesk_ticket.requester_id} not found; setting to null.`);
          t.helpdesk_ticket.requester_id = null;
        }
      }
      if (t.helpdesk_ticket.responder_id) {
        const responderObjectId = responderIdMap.get(t.helpdesk_ticket.responder_id);
        if (responderObjectId) {
          t.helpdesk_ticket.responder_id = responderObjectId;
        } else {
          logger.warn(`Responder with original ID ${t.helpdesk_ticket.responder_id} not found; setting to null.`);
          t.helpdesk_ticket.responder_id = null;
        }
      }
      
      // Map group_id to ObjectId
      if (t.helpdesk_ticket.group_id) {
        const groupObjectId = groupIdMap.get(t.helpdesk_ticket.group_id);
        if (groupObjectId) {
          t.helpdesk_ticket.group_id = groupObjectId;
        } else {
          logger.warn(`Group with original ID ${t.helpdesk_ticket.group_id} not found; setting to null.`);
          t.helpdesk_ticket.group_id = null;
        }
      } else {
        // If group_id is null in source, set to "IT" group _id
        t.helpdesk_ticket.group_id = itGroup ? itGroup._id : null;
        if (itGroup) {
          logger.info(`Assigned IT group to ticket ${t.helpdesk_ticket.display_id} with null group_id`);
        }
      }

      /*
      if (t.helpdesk_ticket.group_id) {
        const groupObjectId = groupIdMap.get(t.helpdesk_ticket.group_id);
        if (groupObjectId) {
          t.helpdesk_ticket.group_id = groupObjectId;
        } else {
          logger.warn(`Group with original ID ${t.helpdesk_ticket.group_id} not found; setting to null.`);
          t.helpdesk_ticket.group_id = null;
        }
      }
      */

      // Handle dates, ensuring they are valid
      const createdAt = new Date(t.helpdesk_ticket.created_at);
      const dueBy = new Date(t.helpdesk_ticket.due_by);
      const frDueBy = new Date(t.helpdesk_ticket.fr_due_by);

      const ticket = new Ticket({
        ...t.helpdesk_ticket,
        account_id: account._id,
        created_at: !isNaN(createdAt.getTime()) ? createdAt : null,
        due_by: !isNaN(dueBy.getTime()) ? dueBy : null,
        fr_due_by: !isNaN(frDueBy.getTime()) ? frDueBy : null,
        ticket_states: t.helpdesk_ticket.ticket_states ? {
          ...t.helpdesk_ticket.ticket_states,
          account_id: account._id,
          created_at: new Date(t.helpdesk_ticket.ticket_states.created_at),
          updated_at: new Date(t.helpdesk_ticket.ticket_states.updated_at),
          opened_at: new Date(t.helpdesk_ticket.ticket_states.opened_at),
          pending_since_at: new Date(t.helpdesk_ticket.ticket_states.pending_since),
          resolved_at: new Date(t.helpdesk_ticket.ticket_states.resolved_at),
          closed_at: new Date(t.helpdesk_ticket.ticket_states.closed_at), // Fixed typo from closed_at_at
          first_assigned_at: new Date(t.helpdesk_ticket.ticket_states.first_assigned_at),
          assigned_at: new Date(t.helpdesk_ticket.ticket_states.assigned_at),
          first_response_time: new Date(t.helpdesk_ticket.ticket_states.first_response_time),
          requester_responded_at: new Date(t.helpdesk_ticket.ticket_states.requester_responded_at),
          agent_responded_at: new Date(t.helpdesk_ticket.ticket_states.agent_responded_at),
          status_updated_at: new Date(t.helpdesk_ticket.ticket_states.status_updated_at),
          sla_timer_stopped_at: new Date(t.helpdesk_ticket.ticket_states.sla_timer_stopped_at),
        } : undefined
      });

      await ticket.save();

    }
  }
  logger.info(`Imported tickets from 13 files`);

  
  // TODO: Create TicketDisplayIdMap entry
  // logger.warn('Create TicketDisplayIdMap entry...');
  /*
  Like Account, there is only one document per account in TicketDisplayIdMap. It is 
  incremented when new tickets are created. We do not need to update it for every 
  ticket that we import. Therefore, it can be moved out of the ticket import loop. 
  We should, however, make sure it is populated. If it does not exist or is empty, 
  then create one document with next_display_id set to the greater of max(display_id) 
  in tickets or 7000.

  try {
    const mapEntry = new TicketDisplayIdMap({
      ticket_id: ticket._id,
      display_id: t.helpdesk_ticket.display_id,
      account_id: account._id,
    });
    await mapEntry.save();
  } catch (err) {
    logger.error(`Error creating TicketDisplayIdMap for Ticket ID ${t.helpdesk_ticket.display_id}: ${err.message}`);
  }
  */
      // Import Time Entries
  logger.info('Importing Time Entries...');
  const timeEntriesFilePath = path.join(dataDir, 'TimeEntries0.json');
  if (!fs.existsSync(timeEntriesFilePath)) {
    logger.error(`Time Entries file not found at: ${timeEntriesFilePath}`);
    throw new Error(`Time Entries file not found: ${timeEntriesFilePath}`);
  }
  const timeEntriesRawData = JSON.parse(fs.readFileSync(timeEntriesFilePath));
  for (const timeEntryData of timeEntriesRawData) {
    try {
      /* wrong!
      // Resolve display_id to ticket_id
      const mapEntry = await TicketDisplayIdMap.findOne({ display_id: timeEntryData.ticket_id });
      if (!mapEntry) {
        logger.warn(`No Ticket found for display_id ${timeEntryData.ticket_id} in Time Entry ID ${timeEntryData.id}; skipping.`);
        continue; // Skip if no matching ticket
      }

      // Use resolved ticket_id
      timeEntryData.ticket_id = mapEntry.ticket_id;
      */
      const timeEntry = new TimeEntry({
        ...timeEntryData,
        account_id: account._id, // Add if required in schema
        start_time: new Date(timeEntryData.start_time),
        executed_at: new Date(timeEntryData.executed_at),
        created_at: new Date(timeEntryData.created_at),
        updated_at: new Date(timeEntryData.updated_at),
      });
      await timeEntry.save();
    } catch (err) {
      logger.error(`Error importing Time Entry ID ${timeEntryData.id}: ${err.message}`);
    }
  }
  logger.info(`Imported ${timeEntriesRawData.length} Time Entries`);

  // Import Roles
  logger.info('Importing Roles...');
  const rolesFilePath = path.join(dataDir, 'Roles0.json');
  if (!fs.existsSync(rolesFilePath)) {
    logger.error(`Roles file not found at: ${rolesFilePath}`);
    throw new Error(`Roles file not found: ${rolesFilePath}`);
  }
  const rolesRawData = JSON.parse(fs.readFileSync(rolesFilePath));
  const rolesArray = Array.isArray(rolesRawData) ? rolesRawData : [rolesRawData];
  for (const roleData of rolesArray) {
    try {
      const role = new Role({
        ...roleData,
        account_id: account._id, // Add account_id
        created_at: new Date(roleData.created_at),
        updated_at: new Date(roleData.updated_at),
      });
      await role.save();
    } catch (err) {
      logger.error(`Error importing Role ${roleData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${rolesArray.length} Roles`);

  // Import Skills
  logger.info('Importing Skills...');
  const skillsFilePath = path.join(dataDir, 'Skills0.json');
  if (!fs.existsSync(skillsFilePath)) {
    logger.error(`Skills file not found at: ${skillsFilePath}`);
    throw new Error(`Skills file not found: ${skillsFilePath}`);
  }
  const skillsRawData = JSON.parse(fs.readFileSync(skillsFilePath));
  const skillsArray = Array.isArray(skillsRawData) ? skillsRawData : [skillsRawData];
  for (const skillData of skillsArray) {
    try {
      if (skillData.agents) {
        skillData.associated_agents = skillData.agents.map(agent => agent.id.toString());
        delete skillData.agents;
      }
      if (skillData.conditions && Array.isArray(skillData.conditions)) {
        skillData.conditions.forEach(condition => {
          condition.account_id = account._id;
        });
      }
      const skill = new Skill({
        ...skillData,
        account_id: account._id, // Add account_id
        created_at: new Date(skillData.created_at),
        updated_at: new Date(skillData.updated_at),
      });
      await skill.save();
    } catch (err) {
      logger.error(`Error importing Skill ${skillData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${skillsArray.length} Skills`);

  // Import Email Configs
  logger.info('Importing Email Configs...');
  const emailConfigsFilePath = path.join(dataDir, 'EmailConfigs0.json');
  if (!fs.existsSync(emailConfigsFilePath)) {
    logger.error(`Email Configs file not found at: ${emailConfigsFilePath}`);
    throw new Error(`Email Configs file not found: ${emailConfigsFilePath}`);
  }
  const emailConfigsRawData = JSON.parse(fs.readFileSync(emailConfigsFilePath));
  const emailConfigsArray = Array.isArray(emailConfigsRawData) ? emailConfigsRawData : [emailConfigsRawData];
  for (const emailConfigData of emailConfigsArray) {
    try {
      if (emailConfigData.primary_role) {
        emailConfigData.primary = emailConfigData.primary_role;
        delete emailConfigData.primary_role;
      }
      const emailConfig = new EmailConfig({
        ...emailConfigData,
        account_id: account._id, // Add account_id
        created_at: new Date(emailConfigData.created_at),
        updated_at: new Date(emailConfigData.updated_at),
      });
      await emailConfig.save();
    } catch (err) {
      logger.error(`Error importing Email Config ${emailConfigData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${emailConfigsArray.length} Email Configs`);

  // Import SLA Policies
  logger.info('Importing SLA Policies...');
  const slaPoliciesFilePath = path.join(dataDir, 'SLAPolicies0.json');
  if (!fs.existsSync(slaPoliciesFilePath)) {
    logger.error(`SLA Policies file not found at: ${slaPoliciesFilePath}`);
    throw new Error(`SLA Policies file not found: ${slaPoliciesFilePath}`);
  }
  const slaPoliciesRawData = JSON.parse(fs.readFileSync(slaPoliciesFilePath));
  const slaPoliciesArray = Array.isArray(slaPoliciesRawData) ? slaPoliciesRawData : [slaPoliciesRawData];
  for (const slaPolicyData of slaPoliciesArray) {
    try {
      // Rename sla_target to sla_targets if needed
      /* wrong! 
      if (slaPolicyData.sla_target) {
        slaPolicyData.sla_targets = slaPolicyData.sla_target;
        delete slaPolicyData.sla_target;
      }
      */
      // Ensure all priority fields are set with defaults if missing
      const defaults = {
        escalation_enabled: false,
        business_hours: false,
        resolve_within: 0,
        respond_within: 0
      };
      if (slaPolicyData.sla_targets) {
        ['priority_1', 'priority_2', 'priority_3', 'priority_4'].forEach(priority => {
          slaPolicyData.sla_targets[priority] = {
            ...defaults,
            ...slaPolicyData.sla_targets[priority] || {}
          };
        });
      } else {
        slaPolicyData.sla_targets = {
          priority_1: defaults,
          priority_2: defaults,
          priority_3: defaults,
          priority_4: defaults
        };
      }
      // logger.info('slaPolicyData: ' + JSON.stringify(slaPolicyData, null, 2));
      const slaPolicy = new SLAPolicy({
        ...slaPolicyData,
        id: slaPolicyData.id, // Keep id if required
        account_id: account._id, // Add account_id
        created_at: new Date(slaPolicyData.created_at),
        updated_at: new Date(slaPolicyData.updated_at),
      });
      await slaPolicy.save();
    } catch (err) {
      logger.error(`Error importing SLA Policy ${slaPolicyData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${slaPoliciesArray.length} SLA Policies`);

  // Import Business Hours
  logger.info('Importing Business Hours...');
  const businessHoursFilePath = path.join(dataDir, 'BusinessHours0.json');
  if (!fs.existsSync(businessHoursFilePath)) {
    logger.error(`Business Hours file not found at: ${businessHoursFilePath}`);
    throw new Error(`Business Hours file not found: ${businessHoursFilePath}`);
  }
  const businessHoursRawData = JSON.parse(fs.readFileSync(businessHoursFilePath));
  const businessHoursArray = Array.isArray(businessHoursRawData) ? businessHoursRawData : [businessHoursRawData];
  for (const businessHourData of businessHoursArray) {
    try {
      const businessHour = new BusinessHour({
        ...businessHourData,
        account_id: account._id, // Add account_id
        created_at: new Date(businessHourData.created_at),
        updated_at: new Date(businessHourData.updated_at),
      });
      await businessHour.save();
    } catch (err) {
      logger.error(`Error importing Business Hour ${businessHourData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${businessHoursArray.length} Business Hours`);

  // Import Settings
  logger.info('Importing Settings...');
  const settingsFilePath = path.join(dataDir, 'Settings0.json');
  if (!fs.existsSync(settingsFilePath)) {
    logger.error(`Settings file not found at: ${settingsFilePath}`);
    throw new Error(`Settings file not found: ${settingsFilePath}`);
  }
  const settingsRawData = JSON.parse(fs.readFileSync(settingsFilePath));
  const settingsArray = Array.isArray(settingsRawData) ? settingsRawData : [settingsRawData];
  for (const settingData of settingsArray) {
    try {
      const createdAt = new Date(settingData.created_at);
      const updatedAt = new Date(settingData.updated_at);
      const setting = new Setting({
        ...settingData,
        account_id: account._id, // Add account_id
        created_at: !isNaN(createdAt.getTime()) ? createdAt : new Date(), // Fallback to now if invalid
        updated_at: !isNaN(updatedAt.getTime()) ? updatedAt : new Date(), // Fallback to now if invalid
      });
      await setting.save();
    } catch (err) {
      logger.error(`Error importing Setting ${settingData.primary_language || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${settingsArray.length} Settings`);

  // Import Ticket Fields
  logger.info('Importing Ticket Fields...');
  const ticketFieldsFilePath = path.join(dataDir, 'TicketFields0.json');
  if (!fs.existsSync(ticketFieldsFilePath)) {
    logger.error(`Ticket Fields file not found at: ${ticketFieldsFilePath}`);
    throw new Error(`Ticket Fields file not found: ${ticketFieldsFilePath}`);
  }
  const ticketFieldsRawData = JSON.parse(fs.readFileSync(ticketFieldsFilePath));
  const ticketFieldsArray = Array.isArray(ticketFieldsRawData) ? ticketFieldsRawData : [ticketFieldsRawData];
  for (const ticketFieldData of ticketFieldsArray) {
    try {
      const ticketField = new TicketField({
        ...ticketFieldData,
        account_id: account._id, // Add account_id
        created_at: new Date(ticketFieldData.created_at),
        updated_at: new Date(ticketFieldData.updated_at),
      });
      await ticketField.save();
    } catch (err) {
      logger.error(`Error importing Ticket Field ${ticketFieldData.name || 'unknown'}: ${err.message}`);
    }
  }
  logger.info(`Imported ${ticketFieldsArray.length} Ticket Fields`);

  // Add this after all imports are complete, e.g., at the end of importData.js before disconnecting from MongoDB

  // Initialize TicketDisplayIdMap if it doesn't exist
  const TicketDisplayIdMap = require('../models/TicketDisplayIdMap'); // Adjust path to your model
  let displayMap = await TicketDisplayIdMap.findOne({ account_id: account._id });
  if (!displayMap) {
    displayMap = new TicketDisplayIdMap({
      account_id: account._id,
      next_display_id: 7000  // Initialize to 7000, above max Freshdesk display_id
    });
    await displayMap.save();
    logger.info(`Initialized TicketDisplayIdMap with next_display_id: ${displayMap.next_display_id}`);
  } else {
    logger.info(`TicketDisplayIdMap already exists for account; skipping initialization.`);
  }

  // Optionally initialize ObjectIdMaps if needed (one global document, not per account)
  // If you decide to keep it for generating sequential IDs across all documents
  const ObjectIdMap = require('../models/ObjectIdMap'); // Adjust path to your model
  let objectIdMap = await ObjectIdMap.findOne();  // Assuming global, no account_id
  if (!objectIdMap) {
    objectIdMap = new ObjectIdMap({
      id: 9500000001  // Initialize to 9500000001, above max Freshdesk-like ID
    });
    await objectIdMap.save();
    logger.info(`Initialized ObjectIdMap with next id: ${objectIdMap.id}`);
  } else {
    logger.info(`ObjectIdMap already exists; skipping initialization.`);
  }

  // Note: If ObjectIdMaps is not needed (as Mongoose _id is auto-generated ObjectId), consider removing it from your POST /api/tickets and models.
  // For tickets, you could rely solely on next_display_id for human-readable IDs, and use _id for references.


  } catch (err) {
    logger.error(`Import failed: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the import
importData().catch((err) => {
  logger.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});