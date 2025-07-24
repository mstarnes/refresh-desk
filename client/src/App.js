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
  Snackbar,
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './styles/App.css';

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
  const [sortDirection, setSortDirection] = useState(localStorage.getItem('sortDirection') || 'desc');
  const [searchQuery, setSearchQuery] = useState(localStorage.getItem('searchQuery') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [tags, setTags] = useState('');
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

  // Fetch ticket fields
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
          (agent) => agent.email.toLowerCase() === process.env.REACT_APP_CURRENT_AGENT_EMAIL?.toLowerCase()
        ) || fields.agent.find(agent => agent._id === '6868527ff5d2b14198b52653') || null;
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

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!ticketFields.agent.length) {
      console.log('Waiting for ticketFields to load');
      return;
    }
    try {
      const agent = ticketFields.agent.find(agent => agent.email.toLowerCase() === process.env.REACT_APP_CURRENT_AGENT_EMAIL?.toLowerCase()) || 
        ticketFields.agent.find(agent => agent._id === '6868527ff5d2b14198b52653') || null;
      const agentId = agent ? agent._id : null;
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
        responder_id: ticket.responder_id ? { name: getFieldLabel('agent', ticket.responder_id) || 'Unassigned' } : null,
      }));
      console.log('Enriched tickets response:', enrichedTickets);
      setTickets(enrichedTickets);
      const totalCount = response.data.total || parseInt(response.headers['x-total-count'], 10) || 0;
      setTotalPages(Math.ceil(totalCount / 10));
      console.log('Fetched from:', endpoint, 'Tickets:', enrichedTickets, 'Total:', totalCount);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to fetch tickets: ' + (error.response?.data?.error || error.message));
      setTickets([]);
    }
  }, [filterType, sortBy, sortDirection, searchQuery, page, ticketFields]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, filterType, sortBy, sortDirection, searchQuery, page]);

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
    const now = new Date('2025-07-23T11:36:00-05:00');
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
    if (field === 'subject' || field === 'description_html') {
      setFormData(prev => ({ ...prev, [field]: event.target.value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePriorityChange = async (event, ticket) => {
    console.log('Priority change triggered for ticket:', ticket._id);
    const newPriority = event.target.value;
    const priorityCode = ticketFields.priority.find(item => item.name.toLowerCase() === newPriority)?.code;
    if (ticket && priorityCode) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          priority: priorityCode,
        });
        setSelectedTicket(prev => prev ? { ...prev, priority_name: newPriority } : prev);
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
    const agentId = newAgent === 'unassigned' ? null : ticketFields.agent.find(item => item.name.toLowerCase() === newAgent.toLowerCase())?._id;
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          responder_id: agentId,
        });
        setSelectedTicket(prev => prev ? { ...prev, responder_id: agentId ? { name: newAgent } : null } : prev);
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
    const statusCode = ticketFields.status.find(item => item.name.toLowerCase() === newStatus)?.code;
    if (ticket && statusCode) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          status: statusCode,
        });
        setSelectedTicket(prev => prev ? { ...prev, status_name: newStatus } : prev);
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
    const groupCode = ticketFields.group.find(item => item.name === newGroup)?.id || 9000171202;
    if (ticket) {
      try {
        const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/tickets/${ticket._id}`, {
          group_id: groupCode,
        });
        setSelectedTicket(prev => prev ? { ...prev, group_id: groupCode } : prev);
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
    console.log('handleNewTicketSubmit formData:', JSON.stringify(formData, null, 2));

    if (!formData.requester_id) {
      setError('Please select a contact');
      return;
    }
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.ticket_type) {
      setError('Ticket Type is required');
      return;
    }
    if (!formData.status) {
      setError('Status is required');
      return;
    }
    if (!formData.priority) {
      setError('Priority is required');
      return;
    }
    if (!formData.group) {
      setError('Group is required');
      return;
    }
    if (!formData.source) {
      setError('Source is required');
      return;
    }

    try {
      const statusCode = ticketFields.status.find((s) => s.name === formData.status)?.code || 2;
      const priorityCode = ticketFields.priority.find((p) => p.name === formData.priority)?.code || 1;
      const sourceCode = ticketFields.source.find((s) => s.name === formData.source)?.code || 3;
      const groupId = ticketFields.group.find((g) => g.name === formData.group)?.id || 9000171202;

      const ticketData = {
        subject: formData.subject,
        description_html: formData.description_html || '<p>No description</p>',
        requester_id: formData.requester_id,
        responder_id: formData.responder_id ? formData.responder_id._id : null,
        ticket_type: formData.ticket_type,
        status: statusCode,
        priority: priorityCode,
        source: sourceCode,
        group_id: groupId,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
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
      console.log('ticketData before POST:', JSON.stringify(ticketData, null, 2));
      await axios.post('/api/tickets', ticketData);
      console.log('ticketData after POST:', JSON.stringify(ticketData, null, 2));
      await fetchTickets();
      setShowNewTicket(false);
      setTags('');
      setFormData({
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
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create ticket: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCloseError = () => {
    setError(null);
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
        {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 2 }} />}
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
                  {ticketFields.priority.map(item => (
                    <MenuItem key={item.code} value={item.name.toLowerCase()}>{item.name}</MenuItem>
                  ))}
                </Select>
                <Select
                  value={ticket.responder_id ? ticket.responder_id.name.toLowerCase() : 'unassigned'}
                  onChange={(e) => handleAgentChange(e, ticket)}
                  sx={{ minWidth: 100, mr: 1 }}
                >
                  {ticketFields.agent.map(item => (
                    <MenuItem key={item._id} value={item.name.toLowerCase()}>{item.name}</MenuItem>
                  ))}
                  <MenuItem value="unassigned">Unassigned</MenuItem>
                </Select>
                <Select
                  value={ticket.status_name.toLowerCase()}
                  onChange={(e) => handleStatusChange(e, ticket)}
                  sx={{ minWidth: 100 }}
                >
                  {ticketFields.status.map(item => (
                    <MenuItem key={item.code} value={item.name.toLowerCase()}>{item.name}</MenuItem>
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
              <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseError}
                message={error}
              />
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={handleChange('subject')}
                margin="normal"
                required
                placeholder="Enter subject"
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
                options={ticketFields.ticket_type.map(item => item.name)}
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
                options={ticketFields.status.map(item => item.name)}
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
                options={ticketFields.priority.map(item => item.name)}
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
                options={ticketFields.group.map(item => item.name)}
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
                options={ticketFields.source.map(item => item.name)}
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
                options={[{ name: 'Unassigned', _id: null }, ...ticketFields.agent]}
                getOptionLabel={(option) => option.name || 'Unassigned'}
                value={formData.responder_id}
                onChange={handleChange('responder_id')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Agent"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                  />
                )}
                sx={{ my: 2 }}
              />
              <ReactQuill
                value={formData.description_html}
                onChange={(value) => setFormData(prev => ({ ...prev, description_html: value }))}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['link'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                  ]
                }}
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
                    {ticketFields.priority.map(item => (
                      <MenuItem key={item.code} value={item.name.toLowerCase()}>{item.name}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={selectedTicket.responder_id ? selectedTicket.responder_id.name.toLowerCase() : 'unassigned'}
                    onChange={(e) => handleAgentChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {ticketFields.agent.map(item => (
                      <MenuItem key={item._id} value={item.name.toLowerCase()}>{item.name}</MenuItem>
                    ))}
                    <MenuItem value="unassigned">Unassigned</MenuItem>
                  </Select>
                  <Select
                    value={selectedTicket.status_name.toLowerCase()}
                    onChange={(e) => handleStatusChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {ticketFields.status.map(item => (
                      <MenuItem key={item.code} value={item.name.toLowerCase()}>{item.name}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={getFieldLabel('group', selectedTicket.group_id) || 'IT'}
                    onChange={(e) => handleGroupChange(e, selectedTicket)}
                    fullWidth
                    sx={{ mb: 2, border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {ticketFields.group.map(item => (
                      <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>
                    ))}
                  </Select>
                  <Select
                    value={selectedTicket.ticket_type || 'Incident'}
                    onChange={(e) => handleTicketTypeChange(e, selectedTicket)}
                    fullWidth
                    sx={{ border: '1px solid #ccc', borderRadius: 4 }}
                  >
                    {ticketFields.ticket_type.map((type, index) => (
                      <MenuItem key={index} value={type.name}>{type.name}</MenuItem>
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