// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const axios = require('axios');
const { Mutex } = require('async-mutex');

// Initialize mutex
const ticketCreationMutex = new Mutex();

// Schemas
const TicketField = require('./models/TicketField');
const User = require('./models/User');
const Company = require('./models/Company');
const Agent = require('./models/Agent');
const Group = require('./models/Group');
const Ticket = require('./models/Ticket');
const ObjectIdMap = require('./models/ObjectIdMap');
const Solution = require('./models/Solution');
const CannedResponse = require('./models/CannedResponse');
const TimeEntry = require('./models/TimeEntry');
const TicketDisplayIdMap = require('./models/TicketDisplayIdMap');
const Role = require('./models/Role');
const Skill = require('./models/Skill');
const EmailConfig = require('./models/EmailConfig');
const SlaPolicy = require('./models/SlaPolicy');
const BusinessHour = require('./models/BusinessHour');
const Setting = require('./models/Setting');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' })); // Increase payload limit to 1mb

// Set strictPopulate to false as a fallback
mongoose.set('strictPopulate', false);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const account_id = process.env.ACCOUNT_ID || 320932;

// Stub for SLA and email processing
setInterval(() => {
  // const account_id = process.env.ACCOUNT_ID || 320932;
  console.log(`SLA escalation check for account_id: ${account_id}`);
  // console.log(`Email processing check for account_id: ${account_id}`);
}, process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 60000);

  // Email Setup
const transporter_x = nodemailer.createTransport({
  host: process.env.SMTP_HOSTNAME,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const certFile = process.env.CERT_FILE || '/Users/mitch/Documents/refresh-desk/certs/cert.pem';
const keyFile = process.env.CERT_KEY_FILE || '/Users/mitch/Documents/refresh-desk/certs/key.pem';
const caCert = fs.readFileSync(certFile, 'utf8');
const caKey = fs.readFileSync(keyFile, 'utf8');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOSTNAME,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  tls: {
    ca: [caCert, caKey] // Correctly closed with proper indentation
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


// IMAP Setup
const imap = new Imap({
  user: process.env.PROTON_USER,
  password: process.env.PROTON_PASS,
  host: process.env.PROTON_HOSTNAME,
  port: parseInt(process.env.PROTON_PORT),
  tls: false,
  connTimeout: 10000,
  authTimeout: 5000
});

// Create a new ticket new version
app.post('/api/tickets', async (req, res) => {
  // Acquire the lock
  const release = await ticketCreationMutex.acquire();
  try {
    console.log('post /api/tickets req.body:', req.body);
    // const account_id = parseInt(process.env.ACCOUNT_ID) || 320932;

    // Generate id
    const maxId = await ObjectIdMap.findOne().sort({ id: -1 }).select('id');
    const newId = (maxId?.id || 9499999999) + 1;

    // Save to ObjectIdMap
    await new ObjectIdMap({ id: newId }).save();

    // Generate display_id
    let displayMap = await TicketDisplayIdMap.findOne({ account_id });
    let newDisplayId;
    if (displayMap) {
      newDisplayId = displayMap.next_display_id;
      displayMap.next_display_id += 1;
      console.log( 'next_display_id: ' + displayMap.next_display_id);
      await displayMap.save();
    } else {
      newDisplayId = 7001;
      console.log( 'newDisplayId: ' + newDisplayId);
      await new TicketDisplayIdMap({ account_id, next_display_id: newDisplayId + 1 }).save();
    }

    // Set company_id and SLA policy
    console.log('Set company_id and SLA policy');
    let company_id = null;
    let sla_policy_id = null;
    let requester = null;
    if (req.body.requester_id) {
      requester = await User.findById(req.body.requester_id).select('company_id created_at updated_at');
    } else {
      requester = await User.findOne({ email: req.body.email });
    }
    if (requester?.company_id && !isNaN(requester.company_id)) {
      const company = await mongoose.model('Company').findOne({ id: requester.company_id }).select('_id');
      company_id = company?._id || null;
      if (company_id) {
        const companyDetails = await mongoose.model('Company').findById(company_id).select('sla_policy_id');
        sla_policy_id = companyDetails?.sla_policy_id || '9000030757';
      } else {
        sla_policy_id = '9000030757';
      }
    } else {
      sla_policy_id = '9000030757';
    }

    // Fetch SLA policy from database
    const slaPolicy = await SlaPolicy.findOne({ id: sla_policy_id });
    if (!slaPolicy) {
      console.warn(`No SLA policy found for id ${sla_policy_id}, using default 9000030757`);
      slaPolicy = await SlaPolicy.findOne({ id: '9000030757' });
    }
    if (!slaPolicy?.sla_target) {
      console.error('SLA policy missing sla_target, using fallback values');
      slaPolicy = { sla_target: { priority_4: { respond_within: 3600, resolve_within: 14400 } } };
    }
    const priorityName = req.body.priority_name || 'Low';
    const slaTimes = slaPolicy.sla_target[`priority_${priorityName === 'Urgent' ? 1 : priorityName === 'High' ? 2 : priorityName === 'Medium' ? 3 : 4}`];
    console.log(`SLA times for policy ${sla_policy_id}, priority ${priorityName}:`, slaTimes);
    const fr_due_by = slaTimes?.respond_within ? new Date(Date.now() + slaTimes.respond_within * 1000).toISOString() : null;
    const due_by = slaTimes?.resolve_within ? new Date(Date.now() + slaTimes.resolve_within * 1000).toISOString() : null;

    // Preserve requester timestamps
    if (req.body.requester && req.body.requester_id) {
      const requester = await User.findById(req.body.requester_id).select('created_at updated_at');
      if (requester) {
        req.body.requester.created_at = requester.created_at;
        req.body.requester.updated_at = requester.updated_at;
      }
    }

    const ticketData = {
      ...req.body,
      id: newId,
      display_id: newDisplayId,
      company_id,
      account_id,
      fr_due_by, // Explicitly included
      due_by,
      delta: true,
      ticket_states: {
        ...req.body.ticket_states,
        ticket_id: newId,
      },
    };
    console.log('POST /api/tickets - Ticket data:', ticketData); // Debug ticket data
    const ticket = new Ticket(ticketData);
    console.log('Saving ticket');
    await ticket.save();
    console.log('Saved ticket');

    //const EmailConfig = require('./models/EmailConfig');
    const emailConfig = await EmailConfig.findOne();

    console.log('ticketData 2: ' + JSON.stringify(ticketData, null, 2));

    if (!process.env.DISABLE_EMAILS) {
      await transporter.sendMail({
        from: `"${emailConfig.name}" <${emailConfig.reply_email}>`,
        to: ticketData.requester.email,
        subject: `Ticket Received #${ticketData.display_id}`,
        text: `Dear ${ticketData.requester.name},\n\nWe would like to acknowledge that we have received your request and a ticket has been created.\nA support representative will be reviewing your request and will send you a personal response (usually within 24 hours).\n\nTo view the status of the ticket or add comments, please visit\nhttp://localhost:3000/ticket/${ticketData.display_id}\n\nThank you for your patience.\n\nSincerely,\n${emailConfig.name}`,
      });
    } else {
      console.log("Would have sent email 3");
    }

    // Save to ObjectIdMap
    // await new ObjectIdMap({ id: newId }).save();

    const populatedTicket = await Ticket.findById(ticket._id).populate('responder_id requester_id company_id');
    res.status(201).json(populatedTicket);
  } catch (error) {
    console.error('Ticket creation error:', error.message);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    res.status(400).json({ error: error.message, details: error.errors });
  } finally {
    // Release the lock
    release();
  }

});

// Create a new ticket old version
app.post('/api/tickets-old', async (req, res) => {
  try {
    const { subject, description, priority, requester, display_id, status, responder_id, company_id } = req.body;

    console.log(JSON.stringify(req.body, null, 2));
    if (!requester || !requester.name) {
      return res.status(400).json({ error: 'Requester name is required' });
    }
    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(400).json({ error: 'Company not found' });
    }

    const SlaPolicy = await SlaPolicy.findOne({ id: company.sla_policy_id });
    if (!SlaPolicy) {
      return res.status(400).json({ error: 'SLA policy not found' });
    }

    const priorityKey = `priority_${priority}`;
    const resolveWithin = SlaPolicy.sla_target[priorityKey]?.resolve_within;
    if (!resolveWithin) {
      return res.status(400).json({ error: 'Invalid priority for SLA policy' });
    }

    const createdAt = new Date().toISOString();
    const dueBy = new Date(Date.now() + resolveWithin * 1000).toISOString();
    const agent = await Agent.findOne({ email: process.env.CURRENT_AGENT_EMAIL || 'mitch.starnes@exotech.pro' });

    const ticket = new Ticket({
      subject,
      description,
      priority: priority || 1,
      requester,
      display_id,
      status: status || 2,
      responder_id: responder_id || (agent?._id || new mongoose.Types.ObjectId('6868527ff5d2b14198b52653')),
      company_id,
      created_at: createdAt,
      due_by: dueBy,
      conversations: [],
      requester_name: requester.name,
      priority_name: { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }[priority] || 'Low',
      status_name: { 2: 'Open', 3: 'Pending', 4: 'Resolved', 5: 'Closed' }[status || 2] || 'Open',
      //responder_name: responder_id ? (await Agent.findById(responder_id))?.name : agent?.name || 'Mitch Starnes',
      responder_name: responder_id ? (await Agent.findOne({ id: responder_id }))?.name : agent?.name || 'Mitch Starnes',
      ticket_states: {
        ticket_id: display_id, // Assigned once at creation
        opened_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt,
        inbound_count: 1, // Initial creation counts as inbound +1
        outbound_count: 0,
        reopened_count: 0,
        status_updated_at: createdAt,
        // Other fields default to null/false as per schema
      },
    });

    await ticket.save();
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    res.status(201).json(populatedTicket);
  } catch (err) {
    console.error('Error creating ticket:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const { limit = 10, page = 1, filters, userId, sort = 'updated_at', direction = 'desc' } = req.query;
    let query = {};
    if (filters === 'newAndMyOpen') {
      const agent = await Agent.findOne({ email: userId });
      query = {
        $or: [
          { responder_id: null },
          { responder_id: agent ? agent._id : new mongoose.Types.ObjectId('6868527ff5d2b14198b52653') }
        ],
        status: { $in: [2, 3] }
      };
    } else if (filters === 'openTickets') {
      query = { status: { $in: [2, 3] } };
    }
    const tickets = await Ticket.find(query)
      .sort({ [sort]: direction === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('responder_id', 'name')
      .populate('requester_id', 'name')
      .populate('company_id', 'name');
    const total = await Ticket.countDocuments(query);
    res.json({ tickets, total });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get ticket by display_id
app.get('/api/tickets/display/:display_id', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ display_id: parseInt(req.params.display_id) })
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get tickets by user_id
app.get('/api/tickets/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const tickets = await Ticket.find({ 'requester.id': userId })
      .sort({ updated_at: -1 })
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    res.json(tickets);
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    res.status(400).json({ error: err.message });
  }
});

// New endpoint: fetch ticket fields
app.get('/api/ticketfields', async (req, res) => {
  try {
    const fields = await TicketField.find({
      type: {
        $in: [
          'default_ticket_type',
          'default_status',
          'default_priority',
          'default_group',
          'default_agent',
          'default_source',
        ],
      },
    });
    const groups = await Group.find().select('id name');
    const agents = await Agent.find().select('name email _id');

    const result = fields.map((field) => {
      if (field.name === 'group') {
        return {
          ...field.toObject(),
          choices: groups.map((g) => ({ name: g.name, id: g.id })),
        };
      }
      if (field.name === 'agent') {
        return {
          ...field.toObject(),
          choices: agents.map((a) => ({ name: a.name, email: a.email, _id: a._id })),
        };
      }
      if (field.name === 'status') {
        return {
          ...field.toObject(),
          choices: Object.entries(field.choices).map(([code, [name]]) => ({
            name,
            code: parseInt(code),
          })),
        };
      }
      if (field.name === 'priority') {
        return {
          ...field.toObject(),
          choices: Object.entries(field.choices).map(([name, code]) => ({
            name,
            code,
          })),
        };
      }
      if (field.name === 'source') {
        return {
          ...field.toObject(),
          choices: Object.entries(field.choices).map(([name, code]) => ({
            name,
            code,
          })),
        };
      }
      return field;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching ticket fields' });
  }
});


// Search endpoint
app.get('/api/tickets/search', async (req, res) => {
  try {
    const { q, limit = 10, page = 1, filters, userId, sort = 'updated_at', direction = 'desc' } = req.query;
    let query = {
      $or: [
        { display_id: parseInt(q) || -1 },
        { subject: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'conversations.body_text': { $regex: q, $options: 'i' } },
        { 'requester.name': { $regex: q, $options: 'i' } },
        { responder_name: { $regex: q, $options: 'i' } },
      ],
    };
    if (filters === 'newAndMyOpen') {
      const agent = await Agent.findOne({ email: userId });
      const filterQuery = {
        $or: [
          { responder_id: null },
          { responder_id: agent ? agent._id : new mongoose.Types.ObjectId('6868527ff5d2b14198b52653') }
        ],
        status: { $in: [2, 3] }
      };
      query = {
        $and: [
          query,
          filterQuery
        ]
      };
    } else if (filters === 'openTickets') {
      query = {
        $and: [
          query,
          { status: { $in: [2, 3] } }
        ]
      };
    }
    const tickets = await Ticket.find(query)
      .sort({ [sort]: direction === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    const total = await Ticket.countDocuments(query);
    res.json({ tickets, total });
  } catch (err) {
    console.error('Error searching tickets:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find().select('id _id name email');
    res.json(agents);
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update ticket
app.patch('/api/tickets/:id', async (req, res) => {
  try {

    // Step 1: Fetch the current ticket
    const currentTicket = await Ticket.findById(req.params.id);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { priority, status, responder_id, priority_name, status_name, responder_name, closed_at, conversations } = req.body;
    const updates = {};
    const ticketStatesUpdates = {};
    const currentTime = new Date().toISOString();
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) {
      updates.status = status;
      ticketStatesUpdates.status_updated_at = currentTime;
      if (status === 4 || status === 5) { // Resolved or Closed
        ticketStatesUpdates.resolved_at = currentTime;
        ticketStatesUpdates.closed_at = currentTime;
        ticketStatesUpdates.sla_timer_stopped_at = currentTime;
        ticketStatesUpdates.resolution_time_updated_at = currentTime;
        // Calculate resolution_time_by_bhrs, etc. - implement BH calculation logic here
      } else if (status === 3) { // Pending
        ticketStatesUpdates.pending_since = currentTime;
        ticketStatesUpdates.sla_timer_stopped_at = currentTime;
      } else if (status === 2) { // Open
        ticketStatesUpdates.pending_since = null;
        ticketStatesUpdates.resolved_at = null;
        ticketStatesUpdates.closed_at = null;
        ticketStatesUpdates.sla_timer_stopped_at = null;
        ticketStatesUpdates.resolution_time_updated_at = null;
      }
    }
    if (responder_id !== undefined) {
      updates.responder_id = responder_id;
      // currentTicket
      //if (!ticket.responder_id) {
      if (!currentTicket.responder_id) {
        ticketStatesUpdates.first_assigned_at = currentTime;
      }
      ticketStatesUpdates.assigned_at = responder_id ? currentTime : null;
    }
    if (priority_name) updates.priority_name = priority_name;
    if (status_name) updates.status_name = status_name;
    if (responder_name) updates.responder_name = responder_name;
    //if (closed_at) updates.closed_at = closed_at;
    if (closed_at) updates['ticket_states.closed_at'] = closed_at; // Use dot notation for nested field
    if (conversations) updates.conversations = conversations;
    updates.updated_at = currentTime;
    ticketStatesUpdates.updated_at = currentTime;

    console.log(JSON.stringify(ticketStatesUpdates, null, 2));
    const newTicketStates = { ...currentTicket.ticket_states, ...ticketStatesUpdates };

    // Flatten newTicketStates to dotted keys
    const ticketStatesSet = Object.fromEntries(
      Object.entries(newTicketStates).map(([key, value]) => [`ticket_states.${key}`, value])
    );

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: { ...updates, ...ticketStatesSet } },
      { new: true }
    )
    .populate('responder_id', 'name')
    .populate('company_id', 'name');

    res.json(ticket);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add conversation
app.post('/api/tickets/:id/conversations', async (req, res) => {
  try {
    const { body_text, private: isPrivate, user_id, incoming, created_at, updated_at, id } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const currentTime = new Date().toISOString();
    const isAgent = await Agent.exists({ id: user_id });
    ticket.conversations.push({
      id: id || ticket.conversations.length + 1,
      body_text,
      private: isPrivate,
      user_id,
      incoming,
      created_at: created_at || currentTime,
      updated_at: updated_at || currentTime,
    });
    ticket.updated_at = currentTime;
    ticket.ticket_states.updated_at = currentTime;
    if (incoming) { // User reply
      ticket.ticket_states.inbound_count = (ticket.ticket_states.inbound_count || 0) + 1;
      ticket.ticket_states.requester_responded_at = currentTime;
      if (ticket.status === 4 || ticket.status === 5) { // Reopen if resolved/closed
        ticket.status = 2;
        ticket.status_name = 'Open';
        ticket.ticket_states.resolved_at = null;
        ticket.ticket_states.closed_at = null;
        ticket.ticket_states.reopened_count = (ticket.ticket_states.reopened_count || 0) + 1;
        ticket.ticket_states.sla_timer_stopped_at = null;
        ticket.ticket_states.resolution_time_updated_at = null;
        ticket.ticket_states.status_updated_at = currentTime;
        // Reset resolution times to null
        ticket.ticket_states.resolution_time_by_bhrs = null;
        ticket.ticket_states.avg_response_time_by_bhrs = null;
      } else if (ticket.status === 3) { // Pending to Open
        ticket.status = 2;
        ticket.status_name = 'Open';
        ticket.ticket_states.pending_since = null;
        ticket.ticket_states.sla_timer_stopped_at = null;
        ticket.ticket_states.status_updated_at = currentTime;
        // Recalculate due_by/frDueBy adding paused time
      }
    } else if (!isPrivate) { // Agent reply (not note)
      ticket.ticket_states.outbound_count = (ticket.ticket_states.outbound_count || 0) + 1;
      ticket.ticket_states.agent_responded_at = currentTime;
      if (!ticket.ticket_states.first_response_time) {
        ticket.ticket_states.first_response_time = (new Date(currentTime) - new Date(ticket.created_at)) / 1000; // Seconds
        // Calculate first_resp_time_by_bhrs with BH logic
      }
      // Update avg_response_time and avg_response_time_by_bhrs with BH logic
    }
    await ticket.save();
    const populatedTicket = await Ticket.findById(req.params.id)
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    res.json(populatedTicket);
  } catch (err) {
    console.error('Error adding conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reply endpoint
app.post('/api/tickets/reply', async (req, res) => {
  try {
    const { ticketId, body, user_id } = req.body;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const currentTime = new Date().toISOString();
    ticket.conversations.push({
      id: ticket.conversations.length + 1,
      body_text: body,
      private: false,
      user_id,
      incoming: false,
      created_at: currentTime,
      updated_at: currentTime,
    });
    ticket.updated_at = currentTime;
    ticket.ticket_states.updated_at = currentTime;
    ticket.ticket_states.outbound_count = (ticket.ticket_states.outbound_count || 0) + 1;
    ticket.ticket_states.agent_responded_at = currentTime;
    if (!ticket.ticket_states.first_response_time) {
      ticket.ticket_states.first_response_time = (new Date(currentTime) - new Date(ticket.created_at)) / 1000; // Seconds
      // Calculate first_resp_time_by_bhrs with BH logic
    }
    // Update avg_response_time and avg_response_time_by_bhrs with BH logic
    await ticket.save();
    const populatedTicket = await Ticket.findById(ticketId)
      .populate('responder_id', 'name')
      .populate('company_id', 'name');
    res.json(populatedTicket);
  } catch (err) {
    console.error('Error adding reply:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      //.populate('responder_id', 'name')
      .populate('requester', 'name')
      .populate('company_id')
      .populate('group_id');
      //.populate('company_id', 'name')
      //.populate('group_id', 'name');
      //.populate('requester group_id company_id agent').lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
    res.json({ ...ticket, display_id: mapEntry?.display_id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.patch('/api/tickets/:id/close', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'Closed';
    ticket.updated_at = new Date().toISOString();
    ticket.ticket_states.closed_at = ticket.updated_at;
    ticket.ticket_states.resolved_at = ticket.updated_at;
    ticket.ticket_states.sla_timer_stopped_at = ticket.updated_at;
    ticket.ticket_states.status_updated_at = ticket.updated_at;
    ticket.ticket_states.resolution_time_updated_at = ticket.updated_at;
    // Calculate resolution_time_by_bhrs, etc. - implement BH calculation logic here
    await ticket.save();
    res.json({ message: 'Ticket closed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close ticket: ' + err.message });
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    await TicketDisplayIdMap.deleteOne({ ticket_id: ticket._id });
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

app.post('/api/tickets/:id/conversations', async (req, res) => {
  const { body_text, incoming } = req.body;
  const user_id = req.body.user_id || null;
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.conversations.push({
      body_text,
      body: body_text,
      user_id,
      incoming: incoming || false,
    });
    ticket.updated_at = new Date().toISOString();
    await ticket.save();
    if (!incoming) {
      const user = await User.findById(ticket.requester);
      const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
      if (!process.env.DISABLE_EMAILS) {
        await transporter.sendMail({
          from: `"${(await EmailConfig.findOne()).name}" <${(await EmailConfig.findOne()).reply_email}>`,
          to: user.email,
          subject: `New comment on ticket: ${ticket.subject} #${mapEntry.display_id}`,
          text: `A new comment was added:\n\n"${body_text}"\n\nView ticket: http://localhost:5001/tickets/${mapEntry.display_id}\n\nSincerely,\n${process.env.TEAM_NAME || 'Refresh Desk Team'}`,
        });
      } else {
        console.log("Would have sent email 1");
      }
    }
    res.status(201).json({ message: 'Conversation added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add conversation' });
  }
});

app.put('/api/tickets/:id/conversations/:conversationId', async (req, res) => {
  const { body_text } = req.body;
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const conversation = ticket.conversations.id(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    conversation.body_text = body_text;
    conversation.body = body_text;
    conversation.updated_at = new Date().toISOString();
    ticket.updated_at = new Date().toISOString();
    await ticket.save();
    res.json({ message: 'Conversation updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

app.post('/api/tickets/reply', async (req, res) => {
  const { ticketId, body, user_id } = req.body;
  if (!ticketId || !body) return res.status(400).json({ error: 'ticketId and body are required' });
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.conversations.push({
      body_text: body,
      body,
      user_id,
      incoming: false,
    });
    ticket.updated_at = new Date().toISOString();
    const user = await User.findById(ticket.requester);
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
    if (!process.env.DISABLE_EMAILS) {
      const info = await transporter.sendMail({
        from: `"${(await EmailConfig.findOne()).name}" <${(await EmailConfig.findOne()).reply_email}>`,
        to: user.email,
        subject: `Re: ${ticket.subject} #${mapEntry.display_id}`,
        text: `${body}\n\nView ticket: http://localhost:5001/tickets/${mapEntry.display_id}\n\nSincerely,\n${process.env.TEAM_NAME || 'Refresh Desk Team'}`,
      });
    } else {
      console.log("Would have send email 2");
    }
    const newMessageId = info.messageId || `reply-${Date.now()}`;
    ticket.in_reply_to = ticket.in_reply_to || [];
    ticket.in_reply_to.push(newMessageId);
    await ticket.save();
    res.status(200).json({ message: 'Reply sent successfully', messageId: newMessageId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reply', details: err.message });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().populate('company');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Updated endpoint: Search contacts
app.get('/api/users/search', async (req, res) => {
  const { q } = req.query;
  console.log(q);
  try {
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const contacts = await User.find({
      name: { $regex: q, $options: 'i' },
    })
      .select('name email _id id')
      .limit(10);
    res.json(contacts);
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('company');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Companies
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const company = new Company(req.body);
    await company.save();
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agents
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents', async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/agents/:id', async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ message: 'Agent deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Groups
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.find().populate('agents');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('agents');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const group = new Group(req.body);
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Solutions
app.get('/api/solutions', async (req, res) => {
  try {
    const solutions = await Solution.find();
    res.json(solutions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/solutions/:id', async (req, res) => {
  try {
    const solution = await Solution.findById(req.params.id);
    if (!solution) return res.status(404).json({ error: 'Solution not found' });
    res.json(solution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solutions', async (req, res) => {
  try {
    const solution = new Solution(req.body);
    await solution.save();
    res.json(solution);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/solutions/:id', async (req, res) => {
  try {
    const solution = await Solution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!solution) return res.status(404).json({ error: 'Solution not found' });
    res.json(solution);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/solutions/:id', async (req, res) => {
  try {
    const solution = await Solution.findByIdAndDelete(req.params.id);
    if (!solution) return res.status(404).json({ error: 'Solution not found' });
    res.json({ message: 'Solution deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Canned Responses
app.get('/api/canned-responses', async (req, res) => {
  try {
    const cannedResponses = await CannedResponse.find();
    res.json(cannedResponses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/canned-responses/:id', async (req, res) => {
  try {
    const cannedResponse = await CannedResponse.findById(req.params.id);
    if (!cannedResponse) return res.status(404).json({ error: 'Canned Response not found' });
    res.json(cannedResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/canned-responses', async (req, res) => {
  try {
    const cannedResponse = new CannedResponse(req.body);
    await cannedResponse.save();
    res.json(cannedResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/canned-responses/:id', async (req, res) => {
  try {
    const cannedResponse = await CannedResponse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cannedResponse) return res.status(404).json({ error: 'Canned Response not found' });
    res.json(cannedResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/canned-responses/:id', async (req, res) => {
  try {
    const cannedResponse = await CannedResponse.findByIdAndDelete(req.params.id);
    if (!cannedResponse) return res.status(404).json({ error: 'Canned Response not found' });
    res.json({ message: 'Canned Response deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Time Entries
app.get('/api/time-entries', async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find().populate('ticket_id');
    res.json(timeEntries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/time-entries/:id', async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id).populate('ticket_id');
    if (!timeEntry) return res.status(404).json({ error: 'Time Entry not found' });
    res.json(timeEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/time-entries', async (req, res) => {
  try {
    const timeEntry = new TimeEntry(req.body);
    await timeEntry.save();
    res.json(timeEntry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/time-entries/:id', async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!timeEntry) return res.status(404).json({ error: 'Time Entry not found' });
    res.json(timeEntry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/time-entries/:id', async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findByIdAndDelete(req.params.id);
    if (!timeEntry) return res.status(404).json({ error: 'Time Entry not found' });
    res.json({ message: 'Time Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ticket Display ID Map
app.get('/api/ticket-display-id-maps', async (req, res) => {
  try {
    const maps = await TicketDisplayIdMap.find();
    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ticket-display-id-maps/:id', async (req, res) => {
  try {
    const map = await TicketDisplayIdMap.findById(req.params.id);
    if (!map) return res.status(404).json({ error: 'Ticket Display ID Map not found' });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ticket-display-id-maps', async (req, res) => {
  try {
    const map = new TicketDisplayIdMap(req.body);
    await map.save();
    res.json(map);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/ticket-display-id-maps/:id', async (req, res) => {
  try {
    const map = await TicketDisplayIdMap.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!map) return res.status(404).json({ error: 'Ticket Display ID Map not found' });
    res.json(map);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/ticket-display-id-maps/:id', async (req, res) => {
  try {
    const map = await TicketDisplayIdMap.findByIdAndDelete(req.params.id);
    if (!map) return res.status(404).json({ error: 'Ticket Display ID Map not found' });
    res.json({ message: 'Ticket Display ID Map deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Roles
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/roles/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roles', async (req, res) => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/roles/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/roles/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Skills
app.get('/api/skills', async (req, res) => {
  try {
    const skills = await Skill.find();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/skills', async (req, res) => {
  try {
    const skill = new Skill(req.body);
    await skill.save();
    res.json(skill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    res.json(skill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email Configs
app.get('/api/email-configs', async (req, res) => {
  try {
    const emailConfigs = await EmailConfig.find();
    res.json(emailConfigs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/email-configs/:id', async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findById(req.params.id);
    if (!emailConfig) return res.status(404).json({ error: 'Email Config not found' });
    res.json(emailConfig);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/email-configs', async (req, res) => {
  try {
    const emailConfig = new EmailConfig(req.body);
    await emailConfig.save();
    res.json(emailConfig);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/email-configs/:id', async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!emailConfig) return res.status(404).json({ error: 'Email Config not found' });
    res.json(emailConfig);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/email-configs/:id', async (req, res) => {
  try {
    const emailConfig = await EmailConfig.findByIdAndDelete(req.params.id);
    if (!emailConfig) return res.status(404).json({ error: 'Email Config not found' });
    res.json({ message: 'Email Config deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SLA Policies
app.get('/api/sla-policies', async (req, res) => {
  try {
    const slaPolicies = await SlaPolicy.find();
    res.json(slaPolicies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sla-policies/:id', async (req, res) => {
  try {
    const SlaPolicy = await SlaPolicy.findById(req.params.id);
    if (!SlaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
    res.json(SlaPolicy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sla-policies', async (req, res) => {
  try {
    const SlaPolicy = new SlaPolicy(req.body);
    await SlaPolicy.save();
    res.json(SlaPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/sla-policies/:id', async (req, res) => {
  try {
    const SlaPolicy = await SlaPolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!SlaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
    res.json(SlaPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sla-policies/:id', async (req, res) => {
  try {
    const SlaPolicy = await SlaPolicy.findByIdAndDelete(req.params.id);
    if (!SlaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
    res.json({ message: 'SLA Policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Business Hours
app.get('/api/business-hours', async (req, res) => {
  try {
    const businessHours = await BusinessHour.find();
    res.json(businessHours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/business-hours/:id', async (req, res) => {
  try {
    const businessHour = await BusinessHour.findById(req.params.id);
    if (!businessHour) return res.status(404).json({ error: 'Business Hour not found' });
    res.json(businessHour);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/business-hours', async (req, res) => {
  try {
    const businessHour = new BusinessHour(req.body);
    await businessHour.save();
    res.json(businessHour);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/business-hours/:id', async (req, res) => {
  try {
    const businessHour = await BusinessHour.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!businessHour) return res.status(404).json({ error: 'Business Hour not found' });
    res.json(businessHour);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/business-hours/:id', async (req, res) => {
  try {
    const businessHour = await BusinessHour.findByIdAndDelete(req.params.id);
    if (!businessHour) return res.status(404).json({ error: 'Business Hour not found' });
    res.json({ message: 'Business Hour deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/:id', async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.id);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const setting = new Setting(req.body);
    await setting.save();
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/settings/:id', async (req, res) => {
  try {
    const setting = await Setting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/settings/:id', async (req, res) => {
  try {
    const setting = await Setting.findByIdAndDelete(req.params.id);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json({ message: 'Setting deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ticket Fields
app.get('/api/ticket-fields', async (req, res) => {
  try {
    const ticketFields = await TicketField.find();
    res.json(ticketFields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ticket-fields/:id', async (req, res) => {
  try {
    const ticketField = await TicketField.findById(req.params.id);
    if (!ticketField) return res.status(404).json({ error: 'Ticket Field not found' });
    res.json(ticketField);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ticket-fields', async (req, res) => {
  try {
    const ticketField = new TicketField(req.body);
    await ticketField.save();
    res.json(ticketField);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/ticket-fields/:id', async (req, res) => {
  try {
    const ticketField = await TicketField.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticketField) return res.status(404).json({ error: 'Ticket Field not found' });
    res.json(ticketField);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/ticket-fields/:id', async (req, res) => {
  try {
    const ticketField = await TicketField.findByIdAndDelete(req.params.id);
    if (!ticketField) return res.status(404).json({ error: 'Ticket Field not found' });
    res.json({ message: 'Ticket Field deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let cutoffDate = new Date(process.env.CUTOFF_DATE || '2025-07-05T00:00:00Z');
let lastFetchTime = new Date();

// IMAP Email Processing
async function processEmail(mail) {
  //console.log("processEmail()");
  const { from, subject, text, to, date, messageId } = mail;

  const email = from.value[0].address;
  const [name] = from.value[0].name?.split(' ') || ['Customer'];
  //console.log('to: ' + JSON.stringify(to, null, 2));
  const toAddresses = to?.value?.map(a => a.address?.toLowerCase()) || [];
  const emailConfig = await EmailConfig.findOne();
  const targetAddress = emailConfig?.to_email?.toLowerCase() || 'helpdesk@exotech.pro';
  cutoffDate = new Date(process.env.CUTOFF_DATE || '2025-07-05T00:00:00Z');
  
  //console.log('cutoffDate: ' + cutoffDate);
  
  if (!toAddresses.includes(targetAddress) || (date < cutoffDate  )) return;

  let dupCheck = await Ticket.findOne({ messageId: messageId });
  if( dupCheck ) {
    // console.log("duplicate messageId: " + messageId);
    // console.log("DUPCHECK: " + JSON.stringify(dupCheck, null, 2));
    return;
  }
  console.log( "processEmail from " + email + " with Subject: " + subject );

  try {

    // Validate email fields
    if (!email || !subject || !text) {
      throw new Error('Missing email fields');
    }

    let ticketFields = null;
    let defaultAgent = null;
    const fetchTicketFields = async () => {
      try {
        const response = await axios.get(process.env.REACT_APP_API_URL + '/api/ticketfields');
        const fields = response.data.reduce((acc, field) => {
          acc[field.name] = field.choices || [];
          return acc;
        }, {});
        // setTicketFields(fields);
        // console.log('fields: ' + JSON.stringify(fields, null, 2));
        ticketFields = fields;

        defaultAgent = fields.agent.find(
          (agent) => agent.email === process.env.CURRENT_AGENT_EMAIL
        );
      } catch (error) {
        console.error('Error fetching ticket fields:', error);
        setError('Failed to load ticket fields: ' + (error.response?.data?.details || error.message));
      }
    };

    await fetchTicketFields();

    requester = await User.findOne({ email: email });
    const statusCode = ticketFields.status.find((s) => s.name === "Open")?.code || 2;
    const priorityCode = ticketFields.priority.find((p) => p.name === "Low")?.code || 1;
    const sourceCode = ticketFields.source.find((s) => s.name === "Email")?.code || 1;
    const groupId = ticketFields.group.find((g) => g.name === "IT")?.code || 9000171202;

    const ticketData = {
      subject: subject,
      description: text,
      requester_id: requester._id || null,
      responder_id: defaultAgent || null,
      ticket_type: 'Incident',
      status: statusCode,
      priority: priorityCode,
      source: sourceCode,
      group_id: groupId,
      status_name: "Open",
      priority_name: "Low",
      source_name: "Email",
      requester_name: requester.name || null,
      responder_name: defaultAgent.name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      account_id: process.env.ACCOUNT_ID || 320932,
      delta: true,
      requester: requester
        ? {
            id: requester.id || Math.floor(Math.random() * 1000000),
            name: requester.name,
            email: requester.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            active: true,
          }
        : null,
      ticket_states: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      messageId: messageId,
    };

    // Make POST request to /api/tickets
    const response = await axios.post(process.env.REACT_APP_API_URL + '/api/tickets', ticketData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Return the created ticket
    return response.data;
  } catch (error) {
    console.error('Error processing email:', error.message);
    if (error.response) {
      // Handle HTTP errors from the POST request
      throw new Error(`Failed to create ticket: ${error.response.data.error || error.message}`);
    }
    throw error;
  }
}

let loginAttempts = 0;
const maxAttempts = 3;

function connectImap() {
  if (loginAttempts >= maxAttempts) return;
  imap.connect();
  imap.once('ready', () => {
    loginAttempts = 0;
    imap.openBox('INBOX', true, (err) => {
      if (err) return console.log(`Failed to open INBOX: ${err.message}`);
      function checkNewMail() {
        // console.log( "checkNewMail" );
        console.log(`Email processing check for account_id: ${account_id} since ${cutoffDate}`);

        imap.search(['UNSEEN', ['SINCE', cutoffDate]], (err, results) => {
          if (err) return console.log(`Search error: ${err.message}`);
          if (results?.length > 0) {
            const f = imap.fetch(results, { bodies: '' });
            f.on('message', msg => {
              msg.on('body', stream => {
                simpleParser(stream, (err, mail) => {
                  if (!err && mail) processEmail(mail);
                });
              });
            });
            f.once('end', () => {
              cutoffDate = lastFetchTime;
              lastFetchTime = new Date();
            });
          }
        });
      }
      checkNewMail();
      setInterval(checkNewMail, parseInt(process.env.CHECK_INTERVAL) || 60000);
    });
  });
  imap.once('error', (err) => {
    loginAttempts++;
    setTimeout(connectImap, 5000);
  });
}

if (!process.env.DISABLE_EMAILS) {
  console.log( "Email processing is enabled." );
  connectImap();
} else {
  console.log( "Email processing is disabled." );
}

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));