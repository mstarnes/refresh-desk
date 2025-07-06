require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Schemas
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const Company = require('./models/Company');
const Agent = require('./models/Agent');
const Group = require('./models/Group');
const Solution = require('./models/Solution');
const CannedResponse = require('./models/CannedResponse');
const TimeEntry = require('./models/TimeEntry');
const TicketDisplayIdMap = require('./models/TicketDisplayIdMap');
const Role = require('./models/Role');
const Skill = require('./models/Skill');
const EmailConfig = require('./models/EmailConfig');
const SLAPolicy = require('./models/SLAPolicy');
const BusinessHour = require('./models/BusinessHour');
const Setting = require('./models/Setting');
const TicketField = require('./models/TicketField');

// Set strictPopulate to false as a fallback
mongoose.set('strictPopulate', false);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Email Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOSTNAME,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
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

// Routes
app.get('/api/test', (req, res) => res.json({ message: 'Refresh Desk API is up!' }));

app.get('/api/tickets/search', async (req, res) => {
  const { q } = req.query;
  try {
    const tickets = await Ticket.find({
      $or: [
        { display_id: parseInt(q) || -1 },
        { subject: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'conversations.body': { $regex: q, $options: 'i' } },
        { responder_id: { $in: await User.find({ name: { $regex: q, $options: 'i' } }).distinct('_id') } },
      ],
    })
      //.populate('responder_id', 'name')
      .populate('requester', 'name')
      .populate('company_id')
      .populate('group_id');
      //.populate('company_id', 'name')
      //.populate('group_id', 'name');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tickets
app.get('/api/tickets', async (req, res) => {
  try {
    let query = Ticket.find()
      //.populate('responder_id', 'name')
      .populate('requester', 'name')
      .populate('company_id')
      .populate('group_id');
      //.populate('company_id', 'name')
      //.populate('group_id', 'name');
      //.populate('requester group_id company_id agent');
    if (req.query.status) query = query.where('status').equals(req.query.status);
    if (req.query.priority) query = query.where('priority').equals(req.query.priority);
    if (req.query.requester) query = query.where('requester').equals(req.query.requester);
    if (req.query.company) query = query.where('company_id').equals(req.query.company);
    const limit = parseInt(req.query.limit || process.env.DEFAULT_LIMIT || 10);
    const page = parseInt(req.query.page || 1);
    const skip = (page - 1) * limit;
    query = query.limit(limit).skip(skip).sort({ updated_at: -1 });
    const tickets = await query.exec();
    const total = await Ticket.countDocuments(query.getQuery());
    const ticketsWithDisplayId = await Promise.all(tickets.map(async ticket => {
      const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
      return { ...ticket.toObject(), display_id: mapEntry?.display_id };
    }));
    res.json({ tickets: ticketsWithDisplayId, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets-old', async (req, res) => {
  const limit = parseInt(process.env.DEFAULT_LIMIT) || 10;
  const cutoffDate = new Date(process.env.CUTOFF_DATE || '2025-07-05T00:00:00Z');
  const filters = req.query.filters || 'allTickets';
  let query = { created_at: { $gte: cutoffDate } };
  if (filters === 'newAndMyOpen') {
    query = {
      $or: [
        { status: 'Open' },
        { agent: req.query.userId || null, status: 'Open' },
        { agent: null, status: 'Open' }
      ]
    };
  } else if (filters === 'openTickets') {
    query.status = 'Open';
  }
  const tickets = await Ticket.find(query)
    .populate('requester group_id company_id agent')
    .sort({ updated_at: -1, created_at: -1 })
    .limit(limit)
    .lean();
  const truncatedTickets = await Promise.all(tickets.map(async ticket => {
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
    return {
      ...ticket,
      priority: ticket.priority || 'Low',
      description: ticket.description ? (ticket.description.length > 100 ? ticket.description.substring(0, 100) + '...' : ticket.description) : '',
      display_id: mapEntry?.display_id
    };
  }));
  res.json(truncatedTickets);
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

app.get('/api/tickets/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }
    const tickets = await Ticket.find({ requester: userId })
      .select('subject created_at status')
      .sort({ created_at: -1 })
      .limit(3)
      .lean();
    const ticketsWithDisplayId = await Promise.all(tickets.map(async ticket => {
      const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
      return { ...ticket, display_id: mapEntry?.display_id || null };
    }));
    res.json(ticketsWithDisplayId);
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const ticketFields = await TicketField.find();
    const statusField = ticketFields.find(f => f.name === 'status');
    const priorityField = ticketFields.find(f => f.name === 'priority');
    const ticketTypeField = ticketFields.find(f => f.name === 'ticket_type');
    const sourceField = ticketFields.find(f => f.name === 'source');
    const groupField = ticketFields.find(f => f.name === 'group');
    const ticket = new Ticket({
      ...req.body,
      status: req.body.status || statusField.choices['2'][0], // Open
      priority: req.body.priority || priorityField.choices.Low, // Low
      ticket_type: req.body.ticket_type || ticketTypeField.choices[0],
      source: req.body.source || sourceField.choices.Email,
      group_id: req.body.group_id || groupField.choices.IT,
    });
    await ticket.save();
    const ticketCount = await Ticket.countDocuments();
    const mapEntry = new TicketDisplayIdMap({
      ticket_id: ticket._id,
      display_id: ticketCount,
    });
    await mapEntry.save();
    res.json({ ...ticket.toObject(), display_id: mapEntry.display_id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tickets/:id', async (req, res) => {
  const { priority, agent, status, ticket_type, source, group_id } = req.body;
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (priority) ticket.priority = priority;
    if (agent) ticket.agent = agent;
    if (status) ticket.status = status;
    if (ticket_type) ticket.ticket_type = ticket_type;
    if (source) ticket.source = source;
    if (group_id) ticket.group_id = group_id;
    ticket.updated_at = new Date();
    await ticket.save();
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
    res.json({ ...ticket.toObject(), display_id: mapEntry?.display_id });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update ticket: ' + err.message });
  }
});

app.patch('/api/tickets/:id/close', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'Closed';
    ticket.updated_at = new Date();
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
    ticket.updated_at = new Date();
    await ticket.save();
    if (!incoming) {
      const user = await User.findById(ticket.requester);
      const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
      await transporter.sendMail({
        from: `"${(await EmailConfig.findOne()).name}" <${(await EmailConfig.findOne()).reply_email}>`,
        to: user.email,
        subject: `New comment on ticket: ${ticket.subject} #${mapEntry.display_id}`,
        text: `A new comment was added:\n\n"${body_text}"\n\nView ticket: http://localhost:5001/tickets/${mapEntry.display_id}\n\nSincerely,\n${process.env.TEAM_NAME || 'Refresh Desk Team'}`,
      });
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
    conversation.updated_at = new Date();
    ticket.updated_at = new Date();
    await ticket.save();
    res.json({ message: 'Conversation updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

app.get('/api/tickets/display/:displayId', async (req, res) => {
  try {
    const { displayId } = req.params;
    const mapEntry = await TicketDisplayIdMap.findOne({ display_id: Number(displayId) });
    if (!mapEntry) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = await Ticket.findById(mapEntry.ticket_id).populate('requester group_id company_id agent').lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ...ticket, display_id: mapEntry.display_id });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
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
    ticket.updated_at = new Date();
    const user = await User.findById(ticket.requester);
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: ticket._id });
    const info = await transporter.sendMail({
      from: `"${(await EmailConfig.findOne()).name}" <${(await EmailConfig.findOne()).reply_email}>`,
      to: user.email,
      subject: `Re: ${ticket.subject} #${mapEntry.display_id}`,
      text: `${body}\n\nView ticket: http://localhost:5001/tickets/${mapEntry.display_id}\n\nSincerely,\n${process.env.TEAM_NAME || 'Refresh Desk Team'}`,
    });
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

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('company');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
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
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find().select('name email');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const slaPolicies = await SLAPolicy.find();
    res.json(slaPolicies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sla-policies/:id', async (req, res) => {
  try {
    const slaPolicy = await SLAPolicy.findById(req.params.id);
    if (!slaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
    res.json(slaPolicy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sla-policies', async (req, res) => {
  try {
    const slaPolicy = new SLAPolicy(req.body);
    await slaPolicy.save();
    res.json(slaPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/sla-policies/:id', async (req, res) => {
  try {
    const slaPolicy = await SLAPolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
    res.json(slaPolicy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sla-policies/:id', async (req, res) => {
  try {
    const slaPolicy = await SLAPolicy.findByIdAndDelete(req.params.id);
    if (!slaPolicy) return res.status(404).json({ error: 'SLA Policy not found' });
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

// IMAP Email Processing
async function processEmail(mail) {
  const { from, subject, text, to, date, messageId } = mail;
  const email = from.value[0].address;
  const [name] = from.value[0].name?.split(' ') || ['Customer'];
  const toAddresses = to?.value?.map(a => a.address.toLowerCase()) || [];
  const emailConfig = await EmailConfig.findOne();
  const targetAddress = emailConfig?.to_email?.toLowerCase() || 'helpdesk@exotech.pro';
  const cutoffDate = new Date(process.env.CUTOFF_DATE || '2025-07-05T00:00:00Z');
  if (!toAddresses.includes(targetAddress) || date < cutoffDate) return;

  const user = await User.findOne({ email });
  if (!user) {
    console.error('User not found:', email);
    return;
  }

  const ticketFields = await TicketField.find();
  const ticketTypeField = ticketFields.find(f => f.name === 'ticket_type');
  const sourceField = ticketFields.find(f => f.name === 'source');
  const statusField = ticketFields.find(f => f.name === 'status');
  const priorityField = ticketFields.find(f => f.name === 'priority');
  const groupField = ticketFields.find(f => f.name === 'group');

  const displayIdMatch = subject.match(/#(\d+)/) || (text || '').match(/http:\/\/localhost:5001\/tickets\/(\d+)/);
  if (displayIdMatch) {
    const display_id = parseInt(displayIdMatch[1]);
    const mapEntry = await TicketDisplayIdMap.findOne({ ticket_id: mongoose.Types.ObjectId(display_idMatch[1]) });
    if (mapEntry) {
      const ticket = await Ticket.findById(mapEntry.ticket_id);
      if (ticket) {
        ticket.conversations = ticket.conversations || [];
        ticket.conversations.push({
          body_text: text,
          body: mail.html || text,
          user_id: user._id,
          incoming: true,
        });
        ticket.updated_at = new Date();
        await ticket.save();
        console.log(`Updated ticket ${display_id}`);
        return;
      }
    }
  }

  const ticketCount = await Ticket.countDocuments();
  const ticket = new Ticket({
    subject: subject || 'No Subject',
    description: text || 'No Description',
    status: statusField.choices['2'][0], // Open
    priority: priorityField.choices.Low, // Low
    requester: user._id,
    group_id: groupField.choices.IT, // IT
    source: sourceField.choices.Email, // Email
    ticket_type: ticketTypeField.choices[0], // First type
    created_at: new Date(),
  });
  await ticket.save();

  const mapEntry = new TicketDisplayIdMap({
    ticket_id: ticket._id,
    display_id: ticketCount + 1,
  });
  await mapEntry.save();

  await transporter.sendMail({
    from: `"${emailConfig.name}" <${emailConfig.reply_email}>`,
    to: email,
    subject: `Ticket Received #${mapEntry.display_id}`,
    text: `Dear ${user.name},\n\nWe would like to acknowledge that we have received your request and a ticket has been created.\nA support representative will be reviewing your request and will send you a personal response (usually within 24 hours).\n\nTo view the status of the ticket or add comments, please visit\nhttp://localhost:5001/tickets/${mapEntry.display_id}\n\nThank you for your patience.\n\nSincerely,\n${emailConfig.name}`,
  });
  console.log(`Created ticket ${mapEntry.display_id}`);
}

let loginAttempts = 0;
const maxAttempts = 3;
let lastFetchTime = new Date();

function connectImap() {
  if (loginAttempts >= maxAttempts) return;
  imap.connect();
  imap.once('ready', () => {
    loginAttempts = 0;
    imap.openBox('INBOX', true, (err) => {
      if (err) return console.log(`Failed to open INBOX: ${err.message}`);
      function checkNewMail() {
        imap.search(['UNSEEN', ['SINCE', lastFetchTime]], (err, results) => {
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

connectImap();

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));