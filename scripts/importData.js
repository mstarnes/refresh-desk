const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: 'importData.log' }),
    new winston.transports.Console(),
  ],
});

// Schemas from models
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const Company = require('./models/Company');
const Agent = require('./models/Agent');
const Group = require('./models/Group');
const Solution = require('./models/Solution');
const CannedResponse = require('./models/CannedResponse');
const TimeEntry = require('./models/TimeEntry');
const TicketDisplayIdMap = require('./models/TicketDisplayIdMap'); // Added
const Role = require('./models/Role');
const Skill = require('./models/Skill');
const EmailConfig = require('./models/EmailConfig');
const SLAPolicy = require('./models/SLAPolicy');
const BusinessHour = require('./models/BusinessHour');
const Setting = require('./models/Setting');
const TicketField = require('./models/TicketField');

async function importData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');

    // Use absolute path for data directory
    const dataDir = path.join(__dirname, 'data');
    logger.info(`Data directory: ${dataDir}`);

    // Import Users
    logger.info('Importing Users...');
    const usersRawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Users0.json')));
    for (const userData of usersRawData) {
      try {
        const user = new User(userData.user);
        await user.save();
      } catch (err) {
        logger.error(`Error importing User ID ${userData.user.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${usersRawData.length} Users`);

    // Import Agents
    logger.info('Importing Agents...');
    const agentsRawData = JSON.parse(fs.readFileSync(path.join(dataDir, 'AllAgents0.json')));
    for (const agentData of agentsRawData) {
      try {
        if (agentData.user.signature_html) {
          agentData.user.signature = agentData.user.signature_html;
          delete agentData.user.signature_html;
        }
        const agent = new Agent(agentData.user);
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
        const company = new Company(companyData.company);
        await company.save();
      } catch (err) {
        logger.error(`Error importing Company ID ${companyData.company.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${companiesRawData.length} Companies`);

    // Import Groups
    logger.info('Importing Groups...');
    const groupsFilePath = path.join(dataDir, 'Groups0.json');
    if (!fs.existsSync(groupsFilePath)) {
      logger.error(`Groups file not found at: ${groupsFilePath}`);
      throw new Error(`Groups file not found: ${groupsFilePath}`);
    }
    const groupsRawData = JSON.parse(fs.readFileSync(groupsFilePath));
    for (const groupData of groupsRawData) {
      try {
        const group = new Group(groupData.group);
        await group.save();
      } catch (err) {
        logger.error(`Error importing Group ID ${groupData.group.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${groupsRawData.length} Groups`);

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
            if (folder.articles) {
              folder.articles.forEach(article => {
                if (article.tags && Array.isArray(article.tags)) {
                  article.tags = article.tags.map(tag =>
                    typeof tag === 'object' && tag.name ? tag.name : tag
                  );
                }
              });
            }
          });
        }
        const solution = new Solution(solutionData.category);
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
        const cannedResponse = new CannedResponse(cannedResponseData.folder);
        await cannedResponse.save();
      } catch (err) {
        logger.error(`Error importing Canned Response ID ${cannedResponseData.folder.id}: ${err.message}`);
      }
    }
    logger.info(`Imported ${cannedResponsesRawData.length} Canned Responses`);

    // Import Tickets and Build TicketDisplayIdMap
    logger.info('Importing Tickets and Building Ticket Display ID Mapping...');
    let totalTickets = 0;
    for (let i = 0; i <= 12; i++) {
      const ticketFile = `Tickets${i}.json`;
      try {
        const ticketsRawData = JSON.parse(fs.readFileSync(path.join(dataDir, ticketFile)));
        for (const ticketData of ticketsRawData) {
          try {
            // Transform tags
            if (ticketData.helpdesk_ticket.tags && Array.isArray(ticketData.helpdesk_ticket.tags)) {
              ticketData.helpdesk_ticket.tags = ticketData.helpdesk_ticket.tags.map(tag =>
                typeof tag === 'object' && tag.name ? tag.name : tag
              );
            }

            // Transform reports_data.group_users
            if (ticketData.helpdesk_ticket.reports_data && ticketData.helpdesk_ticket.reports_data.group_users) {
              ticketData.helpdesk_ticket.reports_data.group_users = ticketData.helpdesk_ticket.reports_data.group_users.map(user =>
                typeof user === 'object' && user.id ? user.id.toString() : user
              );
            }

            // Map notes to conversations
            if (ticketData.helpdesk_ticket.notes && Array.isArray(ticketData.helpdesk_ticket.notes)) {
              ticketData.helpdesk_ticket.conversations = ticketData.helpdesk_ticket.notes.map(note => ({
                ...note,
                body_text: note.body,
                body: note.body_html,
              }));
              delete ticketData.helpdesk_ticket.notes;
            }

            // Save Ticket
            const ticket = new Ticket(ticketData.helpdesk_ticket);
            await ticket.save();

            // Create TicketDisplayIdMap entry
            try {
              const mapEntry = new TicketDisplayIdMap({
                // ticket_id: ticketData.helpdesk_ticket.id,
                ticket_id: ticket._id,
                display_id: ticketData.helpdesk_ticket.display_id,
              });
              await mapEntry.save();
            } catch (err) {
              logger.error(`Error creating TicketDisplayIdMap for Ticket ID ${ticketData.helpdesk_ticket.display_id}: ${err.message}`);
            }

            totalTickets++;
          } catch (err) {
            logger.error(`Error importing Ticket ID ${ticketData.helpdesk_ticket.id}: ${err.message}`);
          }
        }
        logger.info(`Imported ${ticketsRawData.length} Tickets from ${ticketFile}`);
      } catch (err) {
        logger.error(`Error reading ${ticketFile}: ${err.message}`);
      }
    }
    logger.info(`Imported ${totalTickets} Tickets in total`);

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
        // Resolve display_id to ticket_id
        const mapEntry = await TicketDisplayIdMap.findOne({ display_id: timeEntryData.ticket_id });
        if (!mapEntry) {
          logger.error(`No Ticket found for display_id ${timeEntryData.ticket_id} in Time Entry ID ${timeEntryData.id}`);
          continue; // Skip if no matching ticket
        }

        // Use resolved ticket_id
        timeEntryData.ticket_id = mapEntry.ticket_id;

        const timeEntry = new TimeEntry(timeEntryData);
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
        delete roleData.id;
        const role = new Role(roleData);
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
          delete skillData.id;
        }
        const skill = new Skill(skillData);
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
        delete emailConfigData.id;
        const emailConfig = new EmailConfig(emailConfigData);
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
        // Rename sla_target to sla_targets
        if (slaPolicyData.sla_target) {
          slaPolicyData.sla_targets = slaPolicyData.sla_target;
          delete slaPolicyData.sla_target;
        }
        delete slaPolicyData.id;
        const slaPolicy = new SLAPolicy(slaPolicyData);
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
        delete businessHourData.id;
        const businessHour = new BusinessHour(businessHourData);
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
        delete settingData.id;
        const setting = new Setting(settingData);
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
        delete ticketFieldData.id;
        const ticketField = new TicketField(ticketFieldData);
        await ticketField.save();
      } catch (err) {
        logger.error(`Error importing Ticket Field ${ticketFieldData.name || 'unknown'}: ${err.message}`);
      }
    }
    logger.info(`Imported ${ticketFieldsArray.length} Ticket Fields`);
    
    logger.info('Data import completed successfully');
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