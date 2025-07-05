const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

const app = express();

// Load environment variables
dotenv.config();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas from models
const Ticket = require('./models/Ticket');
const User = require('./models/User');
const Company = require('./models/Company');
const Agent = require('./models/Agent');

// Function to get unique user ObjectIds from a ticket
function getUniqueUserObjectIdsOld(ticket) {
  const userIds = [
    ticket.requester_id,
    ...ticket.conversations.map((conv) => conv.user_id),
  ].filter(id => id && /^[0-9a-fA-F]{24}$/.test(id));
  const uniqueIds = [...new Set(userIds)];
  return uniqueIds.map(id => new mongoose.Types.ObjectId(id));
}

// Function to get unique user ObjectIds from a ticket
function getUniqueUserObjectIds(ticket) {
  // Extract user IDs from ticket, expecting ObjectId
  const userIds = [
    ticket.requester_id,
    ...ticket.conversations.map((conv) => conv.user_id),
  ].filter(id => id && mongoose.Types.ObjectId.isValid(id)); // Filter valid ObjectIds

  // Get unique IDs, preserving ObjectId type
  const uniqueIds = [...new Set(userIds.map(id => id.toString()))].map(
    id => new mongoose.Types.ObjectId(id)
  );

  return uniqueIds;
}

// Function to fetch users by IDs (from previous response)
async function findUsersByIds(uniqueIds) {
  try {
    const users = await User.find({ _id: { $in: uniqueIds } }).select('name email').lean();
    return users;
  } catch (error) {
    console.error('Error finding users by IDs:', error.message);
    throw new Error('Failed to fetch users');
  }
}

// Function to transform tickets with user data, matching ticketSchema
function transformTicketsWithUsers(tickets, users) {
  return tickets.map(ticket => ({
    // Spread all ticket fields to match ticketSchema
    ...ticket,
    // Add requester field with user data
    requester: users.find(user => user._id.toString() === ticket.requester_id.toString()) || null,
    // Update conversations to include user data
    conversations: ticket.conversations.map(conv => ({
      ...conv,
      user: users.find(user => user._id.toString() === conv.user_id.toString()) || null
    }))
  }));
}

// Routes
app.get('/api/tickets', async (req, res) => {
  try {
    let query = Ticket.find();
    
    // Filters
    if (req.query.status) {
      query = query.where('status').equals(parseInt(req.query.status));
    }
    if (req.query.priority) {
      query = query.where('priority').equals(parseInt(req.query.priority));
    }
    if (req.query.requester_id) {
      query = query.where('requester_id').equals(parseInt(req.query.requester_id));
    }
    if (req.query.company_id) {
      query = query.where('company_id').equals(parseInt(req.query.company_id));
    }

    // Pagination
    const limit = parseInt(req.query.limit || process.env.REACT_APP_DEFAULT_LIMIT || 10);
    const page = parseInt(req.query.page || 1);
    const skip = (page - 1) * limit;
    query = query.limit(limit).skip(skip).sort({ updated_at: -1 });

    const tickets = await query.exec();
    const total = await Ticket.countDocuments(query.getQuery());

    const allUserIds = tickets.flatMap(ticket => getUniqueUserObjectIds(ticket));
    const uniqueUserIds = [...new Set(allUserIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
    console.log('uniqueUserIds: ' + JSON.stringify(uniqueUserIds));
    const users = await findUsersByIds(uniqueUserIds);
    console.log('users: ' + JSON.stringify(users));

    /*
    const ticketsWithUsers = tickets.map(ticket => ({
      ...ticket,
      
      // requester: users.find(user => user._id.toString() === ticket.requester_id) || null,
      requester: users.find(user => user._id.toString() === ticket.requester_idtoString() ) || null,

      conversations: ticket.conversations.map(conv => ({
        ...conv,
        user: users.find(user => user._id.toString() === conv.user_id.toString()) || null
      }))
    }));
    */
    const ticketsWithUsers = transformTicketsWithUsers(tickets, users);
    
    res.json({
      ticketsWithUsers,
      tickets,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: parseInt(req.params.id) });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Fetch users and agents for requester_id and conversation user_ids
    console.log('Fetch users and agents for requester_id and conversation user_ids');
    console.log(req.params.id);

    const userIds = [
      ticket.requester_id,
      ...ticket.conversations.map((conv) => conv.user_id),
    //].filter(Boolean);
    ].filter(id => id && /^[0-9a-fA-F]{24}$/.test(id)); // Filter valid 24-char hex strings

    const uniqueIds = [...new Set(userIds)];

    const uniqueUserObjectIds = uniqueIds.map(id => new mongoose.Types.ObjectId(id));
    console.log(JSON.stringify(uniqueUserObjectIds));
    
    console.log('find user');
    const users = await User.find({ _id: { $in: uniqueUserObjectIds } }).select('name email').lean();
    console.log(JSON.stringify(users));

    console.log('find agent');
    const agents = await Agent.find({ _id: { $in: uniqueUserObjectIds } }).select('name email').lean();
    console.log(JSON.stringify(agents));
    
    // Create a map of ID to name/email
    const userMap = {};
    users.forEach((user) => {
      console.log('User');
      userMap[user._id] = { name: user.name, email: user.email };
    });
    agents.forEach((agent) => {
      console.log('Agent');
      userMap[agent._id] = { name: agent.name, email: agent.email };
    });

    // Attach user data to ticket
    ticket.requester = userMap[ticket.requester_id] || { name: 'Unknown', email: 'N/A' };
    ticket.conversations = ticket.conversations.map((conv) => ({
      ...conv,
      user: userMap[conv.user_id] || { name: 'Unknown', email: 'N/A' },
    }));

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets-old', async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { subject, description, status, priority, requester_id, company_id, conversations, tags } = req.body;
    const ticket = await Ticket.create({
      ticket_id: Date.now(),
      subject: subject || 'No Subject',
      description: description || '',
      status: status || 2,
      priority: priority || 1,
      created_at: new Date(),
      updated_at: new Date(),
      requester_id: requester_id || null,
      company_id: company_id || null,
      conversations: conversations || [],
      tags: tags || [],
      custom_fields: {}
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  try {
    const { status, priority, conversations } = req.body;
    const ticket = await Ticket.findOne({ id: parseInt(req.params.id) });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (conversations) ticket.conversations.push(...conversations);
    ticket.updated_at = new Date();
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets/:id/conversations', async (req, res) => {
  try {
    const { user_id, body, incoming } = req.body;
    const ticket = await Ticket.findOne({ ticket_id: parseInt(req.params.id) });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    ticket.conversations.push({
      id: Date.now(),
      user_id: user_id || null,
      body: body || '',
      created_at: new Date(),
      attachments: [],
      incoming: incoming || false
    });
    ticket.updated_at = new Date();
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/tickets/:ticketId/conversations/:convId', async (req, res) => {
  const { body_html, private } = req.body;
  const { ticketId, convId } = req.params;
  const user = req.user; // Assume user is set by auth middleware

  try {
    const ticket = await Ticket.findById(ticketId);
    const conversation = ticket.conversations.id(convId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Only allow creator (agent/admin) to edit private conversations
    if (
      conversation.private &&
      user.role !== 'admin' &&
      user.role !== 'agent' &&
      conversation.user_id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    conversation.body_html = body_html;
    conversation.private = private;
    await ticket.save();
    res.json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));