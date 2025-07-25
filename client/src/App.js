import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Box,
  Pagination,
  Avatar,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './styles/App.css';

// Mock ticketfields data (replace with API call if dynamic)
// Updated to use Mongoose _id for agent
const ticketFields = [
  { name: 'priority', choices: { Low: 1, Medium: 2, High: 3, Urgent: 4 } },
  { name: 'status', choices: { '2': ['Open'], '3': ['Pending'], '4': ['Resolved'], '5': ['Closed'] } },
  { name: 'ticket_type', choices: ['Question', 'Incident', 'Problem', 'Feature Request', 'Lead', 'Documentation'] },
  { name: 'source', choices: { Email: 1, Portal: 2, Phone: 3, Forum: 4, Twitter: 5, Facebook: 6, Chat: 7, MobiHelp: 8, 'Feedback Widget': 9, 'Outbound Email': 10, Ecommerce: 11, Bot: 12, Whatsapp: 13, 'Chat - Internal Task': 14 } },
  { name: 'group', choices: { IT: 9000171202, RE: 9000171690 } },
  { name: 'agent', choices: { 'Mitch Starnes': '6868527ff5d2b14198b52653' } }, // Corrected to Mongoose _id
];

// Utility to map code to label
const getFieldLabel = (fieldName, code) => {
  const field = ticketFields.find(f => f.name === fieldName);
  if (field) {
    if (fieldName === 'status') {
      const statusEntry = Object.entries(field.choices).find(([key]) => key === code.toString());
      return statusEntry ? statusEntry[1][0] : null;
    }
    return Object.keys(field.choices).find(key => field.choices[key] === code) || null;
  }
  return null;
};

// Utility to map label to code
const getFieldCode = (fieldName, label) => {
  const field = ticketFields.find(f => f.name === fieldName);
  if (field) {
    return Object.entries(field.choices).find(([key, value]) => value === label || (Array.isArray(value) && value[0] === label))?.[1] || null;
  }
  return null;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    priority: {
      low: '#4caf50',
      medium: '#ffca28',
      high: '#f44336',
      urgent: '#ff0000',
    },
  },
});

const App = () => {
  const [tickets, setTickets] = useState([]);
  const [filterType, setFilterType] = useState(localStorage.getItem('filterType') || 'newAndMyOpen');
  const [sortBy, setSortBy] = useState(localStorage.getItem('sortBy') || 'updated_at');
  const [sortDirection, setSortDirection] = useState((localStorage.getItem('sortDirection') || 'desc').toLowerCase());
  const [searchQuery, setSearchQuery] = useState(localStorage.getItem('searchQuery') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [tags, setTags] = useState('');
  const [agents, setAgents] = useState([]);
  const [formData, setFormData] = useState({
    requester_id: null,
    subject: '',
    ticket_type: '',
    status: '',
    priority: '',
    group: '',
    responder_id: null,
    source: '',
    description_html: '',
    contact: null,
  });
  const [ticketFields, setTicketFields] = useState({
    ticket_type: [],
    status: [],
    priority: [],
    group: [],
    agent: [],
    source: [],
  });

  const getFieldLabel = (fieldName, code) => {
    const field = ticketFields[fieldName];
    if (field) {
      if (fieldName === 'status' || fieldName === 'priority' || fieldName === 'source') {
        const item = field.find(item => item.code === code);
        return item ? item.name : null;
      } else if (fieldName === 'group') {
        const item = field.find(item => item.id === code);
        return item ? item.name : null;
      } else if (fieldName === 'agent') {
        const item = field.find(item => item._id === code);
        return item ? item.name : 'Unassigned';
      }
    }
    return null;
  };

  const getFieldCode = (fieldName, label) => {
    const field = ticketFields[fieldName];
    if (field) {
      if (fieldName === 'status' || fieldName === 'priority' || fieldName === 'source') {
        const item = field.find(item => item.name === label);
        return item ? item.code : null;
      } else if (fieldName === 'group') {
        const item = field.find(item => item.name === label);
        return item ? item.id : null;
      } else if (fieldName === 'agent') {
        const item = field.find(item => item.name === label);
        return item ? item._id : null;
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchTicketFields = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/ticketfields');
        const fields = response.data.reduce((acc, field) => {
          acc[field.name] = field.choices || [];
          return acc;
        }, {});
        console.log('Fetched ticketFields:', fields);
        console.log('Agent data:', fields.agent);
        setTicketFields(fields);

        const defaultAgent = fields.agent.find(
          (agent) => agent.email === process.env.REACT_APP_CURRENT_AGENT_EMAIL
        );
        console.log('Default agent:', defaultAgent);
        setFormData((prev) => ({ ...prev, responder_id: defaultAgent || null }));
      } catch (error) {
        console.error('Error fetching ticket fields:', error);
        setError('Failed to load ticket fields: ' + (error.response?.data?.details || error.message));
      } finally {
        setLoading(false);
      }
    };
    fetchTicketFields();
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      // console.log('ticketFields: ' + JSON.stringify( ticketFields, null, 2));
      const agent = ticketFields.agent.find(
        (agent) => agent.email === process.env.REACT_APP_CURRENT_AGENT_EMAIL
      );

      const agentId = agent ? agent._id : "6868527ff5d2b14198b52653";
      //if (!agentId) {
      //  console.warn('No agent found for REACT_APP_CURRENT_AGENT_EMAIL:', process.env.REACT_APP_CURRENT_AGENT_EMAIL);
      //  setTickets([]);
      //  return;
      //}
      const endpoint = searchQuery ? '/api/tickets/search' : '/api/tickets';
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${endpoint}`, {
        params: {
          filters: filterType,
          sort: sortBy,
          direction: sortDirection,
          q: searchQuery,
          page,
          limit: 10,
          ...(agentId && filterType === 'newAndMyOpen' ? { userId: agentId } : {}),
        }
      });
      const ticketData = response.data.tickets || [];
      console.log('Raw ticket data:', ticketData);
      const enrichedTickets = ticketData.map(ticket => ({
        ...ticket,
        priority_name: getFieldLabel('priority', ticket.priority) || 'Low',
        status_name: getFieldLabel('status', ticket.status) || 'Open',
        responder_id: ticket.responder_id ? { name: getFieldLabel('agent', ticket.responder_id) || 'Mitch Starnes' } : null,
      }));
      console.log('Enriched tickets response:', enrichedTickets); // Debug enriched data
      setTickets(enrichedTickets);
      const totalCount = response.data.total || parseInt(response.headers['x-total-count'], 10) || 0;
      setTotalPages(Math.ceil(totalCount / 10));
      console.log('Fetched from:', endpoint, 'Tickets:', enrichedTickets, 'Total:', totalCount);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    }
  }, [filterType, sortBy, sortDirection, searchQuery, page, ticketFields]);


  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/agents');
      setAgents(response.data);
    } catch (err) {
      console.error('Fetch Agents Error:', err);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    localStorage.setItem('filterType', filterType);
    localStorage.setItem('sortBy', sortBy);
    localStorage.setItem('sortDirection', sortDirection);
    localStorage.setItem('searchQuery', searchQuery);
  }, [filterType, sortBy, sortDirection, searchQuery]);

  const getPriorityColor = (priority) => {
    const priorityMap = { '1': '#4caf50', '2': '#ffca28', '3': '#f44336', '4': '#ff0000' };
    return priorityMap[priority] || '#4caf50';
  };

  const getSlaStatus = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date('2025-07-23T11:31:00-05:00');
    const diffHours = Math.floor((now - created) / (1000 * 60 * 60));
    return diffHours > 3 ? `Overdue by ${diffHours} hours` : 'Within SLA';
  };

  const handleFilterChange = (event) => {
    setFilterType(event.target.value);
    setPage(1);
  };
  const handleSortByChange = (event) => {
    setSortBy(event.target.value);
    setPage(1);
  };
  const handleSortDirectionChange = (event) => {
    setSortDirection(event.target.value);
    setPage(1);
  };
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };
  const handleReset = () => {
    setFilterType('newAndMyOpen');
    setSortBy('updated_at');
    setSortDirection('desc');
    setSearchQuery('');
    setPage(1);
    localStorage.clear();
  };
  const handleNewTicket = () => setShowNewTicket(true);
  const handlePageChange = (event, value) => {
    setPage(value);
    fetchTickets();
  };
  const handleTitleClick = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handlePriorityChange = async (event, ticket) => {
    console.log('Priority change triggered for ticket:', ticket._id);
    const newPriority = event.target.value;
    const priorityCode = Object.keys(ticketFields.find(f => f.name === 'priority').choices).find(key => key.toLowerCase() === newPriority);
    if (ticket && priorityCode) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          priority: ticketFields.find(f => f.name === 'priority').choices[priorityCode],
        });
        await fetchTickets(); // Re-fetch to update UI
        console.log('Priority updated:', response.data);
      } catch (error) {
        console.error('Error updating priority:', error.response?.data || error.message);
      }
    } else {
      console.warn('No valid ticket or priority code found');
    }
  };

  const handleAgentChange = async (event, ticket) => {
    console.log('Agent change triggered for ticket:', ticket._id, 'New agent:', event.target.value);
    const newAgent = event.target.value;
    const agentId = newAgent === 'unassigned' ? null : Object.keys(ticketFields.find(f => f.name === 'agent').choices).find(key => key.toLowerCase() === newAgent.toLowerCase());
    const agentMongooseId = agentId ? ticketFields.find(f => f.name === 'agent').choices[agentId] : null;
    console.log('Sending agentId:', agentMongooseId); // Debug sent value
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          responder_id: agentMongooseId,
        });
        await fetchTickets(); // Re-fetch to update UI
        console.log('Agent updated:', response.data.responder_id);
      } catch (error) {
        console.error('Error updating agent:', error.response?.data || error.message);
      }
    } else {
      console.warn('No valid ticket found');
    }
  };

  const handleStatusChange = async (event, ticket) => {
    console.log('Status change triggered for ticket:', ticket._id);
    const newStatus = event.target.value;
    const statusCode = Object.keys(ticketFields.find(f => f.name === 'status').choices).find(key => ticketFields.find(f => f.name === 'status').choices[key][0].toLowerCase() === newStatus);
    if (ticket && statusCode) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          status: parseInt(statusCode),
        });
        await fetchTickets(); // Re-fetch to update UI
        console.log('Status updated:', response.data);
      } catch (error) {
        console.error('Error updating status:', error.response?.data || error.message);
      }
    } else {
      console.warn('No valid ticket or status code found');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', overflow: 'auto' }}>
        <AppBar position="static">
          <Toolbar>
            <Select value={filterType} onChange={handleFilterChange} sx={{ marginRight: 2, color: 'inherit' }}>
              <MenuItem value="newAndMyOpen">New and My Open Tickets</MenuItem>
              <MenuItem value="closed">Closed Tickets</MenuItem>
              <MenuItem value="all">All Tickets</MenuItem>
            </Select>
            <Select value={sortBy} onChange={handleSortByChange} sx={{ marginRight: 2, color: 'inherit' }}>
              <MenuItem value="updated_at">Last Modified</MenuItem>
              <MenuItem value="created_at">Date Created</MenuItem>
              <MenuItem value="subject">Subject</MenuItem>
            </Select>
            <Select value={sortDirection} onChange={handleSortDirectionChange} sx={{ marginRight: 2, color: 'inherit' }}>
              <MenuItem value="desc">Descending</MenuItem>
              <MenuItem value="asc">Ascending</MenuItem>
            </Select>
            <Button color="inherit" onClick={handleReset} sx={{ marginRight: 2 }}>Reset</Button>
            <Button color="inherit" onClick={handleNewTicket}>New Ticket</Button>
            <TextField
              variant="outlined"
              placeholder="Search"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ marginLeft: 'auto', backgroundColor: 'white', borderRadius: 1, color: 'black' }}
              InputProps={{ sx: { color: 'black' } }}
            />
          </Toolbar>
        </AppBar>
        <Typography variant="h4" align="center" sx={{ my: 2 }}>
          Refresh Desk Dashboard
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, p: 2 }}>
          {tickets.map((ticket) => (
            <Card key={ticket._id} sx={{ cursor: 'pointer', boxShadow: 3 }}>
              <CardContent sx={{ padding: 2 }}>
                <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: getPriorityColor(ticket.priority),
                      color: 'white',
                      marginRight: 2,
                    }}
                  >
                    {ticket.requester.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h6"
                      component="div"
                      onClick={() => handleTitleClick(ticket)}
                      style={{ cursor: 'pointer' }}
                    >
                      <strong>{ticket.subject} #{ticket.display_id}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ticket.requester.name} ({ticket.company_id ? 'Company' : 'Unknown Company'}) | Created {new Date(ticket.created_at).toLocaleDateString()} | {getSlaStatus(ticket.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', padding: 2 }}>
                <Select
                  value={ticket.priority_name.toLowerCase()}
                  onChange={(e) => handlePriorityChange(e, ticket)}
                  sx={{ minWidth: 100, mr: 1 }}
                >
                  {Object.entries(ticketFields.find(f => f.name === 'priority').choices).map(([label, value]) => (
                    <MenuItem key={value} value={label.toLowerCase()}>{label}</MenuItem>
                  ))}
                </Select>
                <Select
                  value={ticket.responder_id ? ticket.responder_id.name.toLowerCase() : 'unassigned'}
                  onChange={(e) => handleAgentChange(e, ticket)}
                  sx={{ minWidth: 100, mr: 1 }}
                >
                  {Object.entries(ticketFields.find(f => f.name === 'agent').choices).map(([label, value]) => (
                    <MenuItem key={value} value={label.toLowerCase()}>{label}</MenuItem>
                  ))}
                  <MenuItem value="unassigned">Unassigned</MenuItem>
                </Select>
                <Select
                  value={ticket.status_name.toLowerCase()}
                  onChange={(e) => handleStatusChange(e, ticket)}
                  sx={{ minWidth: 100 }}
                >
                  {Object.entries(ticketFields.find(f => f.name === 'status').choices).map(([code, [validLabel]]) => (
                    <MenuItem key={`${code}-${validLabel}`} value={validLabel.toLowerCase()}>{validLabel}</MenuItem>
                  ))}
                </Select>
              </CardActions>
            </Card>
          ))}
        </Box>
        <Dialog open={!!selectedTicket} onClose={() => setSelectedTicket(null)}>
          <DialogTitle>{selectedTicket?.subject} #{selectedTicket?.display_id}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              <strong>Requester:</strong> {selectedTicket?.requester?.name} ({selectedTicket?.company_id ? 'Company' : 'Unknown Company'})<br />
              <strong>Created:</strong> {new Date(selectedTicket?.created_at).toLocaleDateString()}<br />
              <strong>Last Modified:</strong> {new Date(selectedTicket?.updated_at).toLocaleDateString()}<br />
              <strong>SLA:</strong> {getSlaStatus(selectedTicket?.created_at)}<br />
              <strong>Last Activity:</strong> {selectedTicket?.conversations[0]?.private ? 'Private: ' : 'Public: '} {selectedTicket?.conversations[0]?.body_text}
            </DialogContentText>
          </DialogContent>
        </Dialog>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={handlePageChange} />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;