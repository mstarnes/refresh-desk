import React, { useState, useEffect, useCallback } from 'react';
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
  Box,
  Pagination,
  Avatar,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import ReactQuill from 'react-quill'; // Added for HTML toolbar
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './styles/App.css';

// Mock ticketfields data (replace with API call if dynamic)
const ticketFields = [
  { name: 'priority', choices: { Low: 1, Medium: 2, High: 3, Urgent: 4 } },
  { name: 'status', choices: { '2': ['Open'], '3': ['Pending'], '4': ['Resolved'], '5': ['Closed'] } },
  { name: 'ticket_type', choices: ['Question', 'Incident', 'Problem', 'Feature Request', 'Lead', 'Documentation'] },
  { name: 'source', choices: { Email: 1, Portal: 2, Phone: 3, Forum: 4, Twitter: 5, Facebook: 6, Chat: 7, MobiHelp: 8, 'Feedback Widget': 9, 'Outbound Email': 10, Ecommerce: 11, Bot: 12, Whatsapp: 13, 'Chat - Internal Task': 14 } },
  { name: 'group', choices: { IT: 9000171202, RE: 9000171690 } },
  { name: 'agent', choices: { 'Mitch Starnes': '6868527ff5d2b14198b52653' } },
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
    const entry = Object.entries(field.choices).find(([key, value]) => value === label || (Array.isArray(value) && value[0] === label));
    return entry ? (fieldName === 'status' || fieldName === 'group' ? parseInt(entry[0]) : entry[1]) : null; // Ensure numeric for status/group
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
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
  const [subject, setSubject] = useState('');
  const [formData, setFormData] = useState({
    requester_id: '6868527ef5d2b14198b52400',
    subject: 'Not set',
    ticket_type: 'Incident',
    status: 'Open',
    priority: 'Low',
    group: 'IT',
    agent: 'Mitch Starnes',
    source: 'Phone',
    description_html: 'Not set',
  });

  const [ticketFields1, setTicketFields1] = useState({
    ticket_type: [],
    status: [],
    priority: [],
    group: [],
    agent: [],
    source: [],
  });

  const fetchTickets = useCallback(async () => {
    try {
      const agentId = '6868527ff5d2b14198b52653';
      const endpoint = searchQuery ? '/api/tickets/search' : '/api/tickets';
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${endpoint}`, {
        params: {
          filters: filterType,
          sort: sortBy,
          direction: sortDirection,
          q: searchQuery,
          page,
          limit: 10,
          userId: agentId,
        }
      });
      const ticketData = response.data.tickets || [];
      const enrichedTickets = ticketData.map(ticket => ({
        ...ticket,
        priority_name: getFieldLabel('priority', ticket.priority) || 'Low',
        status_name: getFieldLabel('status', ticket.status) || 'Open',
        responder_id: ticket.responder_id ? { name: getFieldLabel('agent', ticket.responder_id) || 'Mitch Starnes' } : null,
      }));
      console.log('Enriched tickets response:', enrichedTickets);
      setTickets(enrichedTickets);
      const totalCount = response.data.total || parseInt(response.headers['x-total-count'], 10) || 0;
      setTotalPages(Math.ceil(totalCount / 10));
      console.log('Fetched from:', endpoint, 'Tickets:', enrichedTickets, 'Total:', totalCount);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    }
  }, [filterType, sortBy, sortDirection, searchQuery, page, setTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const fetchTicketFields = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/ticketfields');
        const fields = response.data.reduce((acc, field) => {
          acc[field.name] = field.choices || [];
          return acc;
        }, {});
        setTicketFields1(fields);

        const defaultAgent = fields.agent.find(
          (agent) => agent.email === process.env.CURRENT_AGENT_EMAIL
        );
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
    const now = new Date('2025-07-21T00:00:00-05:00'); // Updated to 12:00 AM CDT, July 21, 2025
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
    setShowTicketDetails(true);
  };

  const handleContactSearch = async (input) => {
    if (!input || input.length < 2) {
      setContacts([]);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users/search?q=${encodeURIComponent(input)}`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        setSelectedTicket(prev => prev ? { ...prev, priority_name: newPriority } : prev); // Update dialog state
        await fetchTickets();
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
    console.log('Sending agentId:', agentMongooseId);
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          responder_id: agentMongooseId,
        });
        setSelectedTicket(prev => prev ? { ...prev, responder_id: agentMongooseId ? { name: newAgent } : null } : prev); // Update dialog state
        await fetchTickets();
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
        setSelectedTicket(prev => prev ? { ...prev, status_name: newStatus } : prev); // Update dialog state
        await fetchTickets();
        console.log('Status updated:', response.data);
      } catch (error) {
        console.error('Error updating status:', error.response?.data || error.message);
      }
    } else {
      console.warn('No valid ticket or status code found');
    }
  };

  const handleGroupChange = async (event, ticket) => {
    const newGroup = event.target.value;
    const groupCode = getFieldCode('group', newGroup) || 9000171202;
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          group_id: groupCode,
        });
        setSelectedTicket(prev => prev ? { ...prev, group_id: groupCode } : prev); // Update dialog state
        await fetchTickets();
        console.log('Group updated:', response.data);
      } catch (error) {
        console.error('Error updating group:', error.response?.data || error.message);
      }
    }
  };

  const handleTicketTypeChange = async (event, ticket) => {
    const newType = event.target.value;
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          ticket_type: newType,
        });
        setSelectedTicket(prev => prev ? { ...prev, ticket_type: newType } : prev);
        await fetchTickets();
        console.log('Ticket type updated:', response.data);
      } catch (error) {
        console.error('Error updating ticket type:', error.response?.data || error.message);
      }
    }
  };
  const handleNewTicketSubmit = async (e) => {
    e.preventDefault();
    console.log('handleNewTicketSubmit formData: ' + JSON.stringify(formData, null, 2));
/*
    if (!formData.requester_id) {
      console.error('requester_id is required');
      return;
      setError('Please select a contact');
    }
    if (!formData.subject) {
      console.error('Subject is required');
      setError('Subject is required');
      return;
    }
    if (!formData.description_html.trim() || formData.description.trim()) {
      console.error('Description is required');
      setError('Description is required');
      return;
    }
*/
    try {
      const statusCode = ticketFields1.status.find((s) => s.name === formData.status)?.code || 2;
      const priorityCode = ticketFields1.priority.find((p) => p.name === formData.priority)?.code || 1;
      const sourceCode = ticketFields1.source.find((s) => s.name === formData.source)?.code || 3;
      const groupId = ticketFields1.group.find((g) => g.name === formData.group_id)?.id || 9000171202;

      const ticketData = {
        subject: formData.subject,
        description: formData.description,
        requester_id: formData.requester_id,
        responder_id: formData.responder_id ? formData.responder_id._id : null,
        ticket_type: formData.ticket_type,
        status: statusCode,
        priority: priorityCode,
        source: sourceCode,
        group_id: groupId,
        status_name: formData.status,
        priority_name: formData.priority,
        source_name: formData.source,
        requester_name: formData.contact ? formData.contact.name : null,
        responder_name: formData.responder_id ? formData.responder_id.name : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        account_id: process.env.ACCOUNT_ID || 320932,
        delta: true,
        requester: formData.contact
          ? {
              id: formData.contact.id || Math.floor(Math.random() * 1000000),
              name: formData.contact.name,
              email: formData.contact.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              active: true,
            }
          : null,
        ticket_states: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      await axios.post('/api/tickets', ticketData);
      console.log('ticketData: ' + JSON.stringify(ticketData, null, 2));
      // navigate('/');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create ticket: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleNewTicketSubmitOld = async (event) => {
    event.preventDefault();
    const newTicket = {
      subject: formData.subject || 'No Subject',
      description_html: formData.description_html,
      priority: getFieldCode('priority', formData.priority) || 1,
      status: getFieldCode('status', formData.status) || 2,
      requester_id: formData.requester_id || '6868527ef5d2b14198b52400',
      responder_id: formData.agent === 'unassigned' ? null : getFieldCode('agent', formData.agent),
      source: getFieldCode('source', formData.source) || 3, // Default to Phone (3)
      ticket_type: formData.ticket_type || 'Incident',
      group_id: getFieldCode('group', formData.group) || 9000171202,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };
    console.log('Submitting new ticket:', newTicket);
    try {
      console.log('newTicket form data: ' + JSON.stringify(newTicket, null, 2));
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets`, newTicket);
      await fetchTickets();
      setShowNewTicket(false);
      setTags(''); // Clear tags
      setFormData({
        requester_id: '6868527ef5d2b14198b52400',
        subject: '',
        ticket_type: 'Incident',
        status: 'Open',
        priority: 'Low',
        group: 'IT',
        agent: 'Mitch Starnes',
        description_html: '',
        source: 'Phone',
      });
      console.log('New ticket created:', response.data);
    } catch (error) {
      console.error('Error creating ticket:', error.response?.data || error.message);
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
        <Dialog open={showNewTicket} onClose={() => setShowNewTicket(false)}>
          <DialogTitle>New Ticket</DialogTitle>
          <DialogContent>
            <form onSubmit={handleNewTicketSubmit}>
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={handleChange('subject')}
                //onChange={(e) => setSubject(e.target.value)}
                margin="normal"
                required
                placeholder="Enter subject"
                //sx={{ '& .MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' } }} // Custom styling to float label
                //variant="outlined"
              />
              <Autocomplete
                options={formData.contact ? [formData.contact, ...contacts.filter(c => c._id !== formData.contact._id)] : contacts.length === 0 ? [{ name: 'Type to search', disabled: true }] : contacts}
                getOptionLabel={(option) => option.disabled ? option.name : option.email ? `${option.name} <${option.email}>` : `${option.name} <no email address on file>`}
                filterOptions={(options) => options}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    className="new-ticket-field"
                    label="Contact"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                onInputChange={(e, value) => handleContactSearch(value)}
                onChange={handleChange('contact')}
                value={formData.contact || null}
              />
              <Autocomplete
                options={ticketFields.find(f => f.name === 'ticket_type').choices}
                value={formData.ticket_type}
                onChange={handleChange('ticket_type')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ticket Type"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <Autocomplete
                options={Object.keys(ticketFields.find(f => f.name === 'status').choices).map(code => ticketFields.find(f => f.name === 'status').choices[code][0])}
                value={formData.status}
                onChange={handleChange('status')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Status"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <Autocomplete
                options={Object.keys(ticketFields.find(f => f.name === 'priority').choices)}
                value={formData.priority}
                onChange={handleChange('priority')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Priority"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <Autocomplete
                options={Object.keys(ticketFields.find(f => f.name === 'group').choices).map(key => key)}
                value={formData.group}
                onChange={handleChange('group')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Group"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <Autocomplete
                options={Object.keys(ticketFields.find(f => f.name === 'source').choices).map(key => key)}
                value={formData.source}
                onChange={handleChange('source')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Source"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <Autocomplete
                options={['Mitch Starnes', 'unassigned']}
                value={formData.agent}
                onChange={handleChange('agent')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Agent"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                  />
                )}
                sx={{ my: 2 }}
              />
              <ReactQuill
                value={formData.description_html}
                onChange={(value) => setFormData(prev => ({ ...prev, description_html: value }))}
                modules={{ toolbar: [
                  [{ 'header': [1, 2, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  ['link'],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ] }}
                formats={['header', 'bold', 'italic', 'underline', 'strike', 'link', 'list']}
                placeholder="Enter description (HTML)"
                style={{ marginBottom: '16px' }}
              />
              <TextField
                fullWidth
                label="Tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                margin="normal"
                placeholder="Enter tags, comma-separated"
              />
              <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
                Create Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={showTicketDetails} onClose={() => setShowTicketDetails(false)} maxWidth="md" fullWidth>
          <DialogTitle>Ticket Details #{selectedTicket?.display_id}</DialogTitle>
          <DialogContent>
            {selectedTicket && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="h6">Subject: {selectedTicket.subject}</Typography>
                  <Box sx={{ mt: 2 }}>
                    <strong>Description:</strong>
                    <div dangerouslySetInnerHTML={{ __html: selectedTicket.description_html || selectedTicket.description || '<p>No description</p>' }} />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <strong>Conversations:</strong>
                    {[...selectedTicket.conversations].reverse().map((conv, index) => (
                      <div
                        key={index}
                        className={`conversation ${conv.private ? 'conversation-private' : ''}`}
                        dangerouslySetInnerHTML={{ __html: conv.body || conv.body_text || '<p>No content</p>' }}
                        sx={{ mt: 1, borderLeft: conv.private ? '3px solid #FF4500' : '3px solid #007bff', paddingLeft: '10px', marginBottom: '10px' }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ mt: 2 }} className="ticket-timeline">
                    <Typography variant="h6">Requester History</Typography>
                    {selectedTicket.requester && selectedTicket.requester._id ? (
                      tickets.filter(t => t.requester_id === selectedTicket.requester._id && t._id !== selectedTicket._id).length ? (
                        tickets.filter(t => t.requester_id === selectedTicket.requester._id && t._id !== selectedTicket._id).map((t) => (
                          <div key={t._id} className="timeline-item">
                            <Typography component="span">
                              {t.subject || 'No Subject'} #{t.display_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t.requester?.name || 'Unknown'} ({t.company_id?.name || 'Unknown Company'}) | {getSlaStatus(t.created_at)}
                            </Typography>
                          </div>
                        ))
                      ) : (
                        <Typography variant="body2">No other tickets from this requester</Typography>
                      )
                    ) : (
                      <Typography variant="body2">No requester history available</Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Select
                    value={selectedTicket.priority_name.toLowerCase()}
                    onChange={(e) => handlePriorityChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {Object.entries(ticketFields.find(f => f.name === 'priority').choices).map(([label, value]) => (
                      <MenuItem key={value} value={label.toLowerCase()}>{label}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={selectedTicket.responder_id ? selectedTicket.responder_id.name.toLowerCase() : 'unassigned'}
                    onChange={(e) => handleAgentChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {Object.entries(ticketFields.find(f => f.name === 'agent').choices).map(([label, value]) => (
                      <MenuItem key={value} value={label.toLowerCase()}>{label}</MenuItem>
                    ))}
                    <MenuItem value="unassigned">Unassigned</MenuItem>
                  </Select>
                  <Select
                    value={selectedTicket.status_name.toLowerCase()}
                    onChange={(e) => handleStatusChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {Object.entries(ticketFields.find(f => f.name === 'status').choices).map(([code, [validLabel]]) => (
                      <MenuItem key={`${code}-${validLabel}`} value={validLabel.toLowerCase()}>{validLabel}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={getFieldLabel('group', selectedTicket.group_id) || 'IT'}
                    onChange={(e) => handleGroupChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {Object.entries(ticketFields.find(f => f.name === 'group').choices).map(([label, value]) => (
                      <MenuItem key={value} value={label}>{label}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={selectedTicket.ticket_type || 'Incident'}
                    onChange={(e) => handleTicketTypeChange(e, selectedTicket)}
                    fullWidth
                    sx={{ border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {ticketFields.find(f => f.name === 'ticket_type').choices.map((type, index) => (
                      <MenuItem key={index} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Box>
            )}
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