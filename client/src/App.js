import { Link } from 'react-router-dom';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import { AppBar, Toolbar, Button, Typography, Grid, Card, CardContent, CardActions, CircularProgress, Select, MenuItem, FormControl, InputLabel, TextField, Box } from '@mui/material';
import axios from 'axios';
import { useState, useEffect, useRef, useCallback } from 'react';


const theme = createTheme({
  palette: { primary: { main: '#1976d2' }, secondary: { main: '#dc004e' } },
  typography: { fontFamily: 'Roboto, Arial, sans-serif' },
});

const NavBar = styled(AppBar)(({ theme }) => ({ marginBottom: theme.spacing(2) }));
const TicketCard = styled(Card)(({ theme }) => ({
  width: '100%',
  '&:hover': { boxShadow: theme.shadows[6] },
  transition: 'box-shadow 0.3s',
}));

function App() {
  const [filter, setFilter] = useState(() => localStorage.getItem('filter') || 'newAndMyOpen');
  const [sortField, setSortField] = useState(() => localStorage.getItem('sortField') || 'updated_at');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('sortOrder') || 'desc');
  const [search, setSearch] = useState(() => localStorage.getItem('search') || '');

  useEffect(() => {
    const oldKeys = ['filterType', 'searchQuery', 'sortBy', 'sortDirection'];
    oldKeys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem('filter', filter);
    localStorage.setItem('sortField', sortField);
    localStorage.setItem('sortOrder', sortOrder);
    localStorage.setItem('search', search);
  }, [filter, sortField, sortOrder, search]);

  const handleReset = () => {
    setFilter('newAndMyOpen');
    setSortField('updated_at');
    setSortOrder('desc');
    setSearch('');
    document.dispatchEvent(new Event('reset-tickets'));
  };

  const handleAgentChange = async (ticketId, newAgentId) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { responder_id: newAgentId });
    } catch (err) {
      console.error('Error updating agent:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <NavBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }} component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Refresh Desk
          </Typography>
          <FormControl sx={{ m: 1, minWidth: 120 }} variant="outlined">
            <InputLabel sx={{ color: 'white' }}>Filter</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              label="Filter"
              sx={{ color: 'white', '.MuiSelect-icon': { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
            >
              <MenuItem value="newAndMyOpen">New & My Open</MenuItem>
              <MenuItem value="openTickets">Open Tickets</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="">All</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} variant="outlined">
            <InputLabel sx={{ color: 'white' }}>Sort</InputLabel>
            <Select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field);
                setSortOrder(order);
              }}
              label="Sort"
              sx={{ color: 'white', '.MuiSelect-icon': { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
            >
              <MenuItem value="updated_at-desc">Updated (Newest)</MenuItem>
              <MenuItem value="updated_at-asc">Updated (Oldest)</MenuItem>
              <MenuItem value="created_at-desc">Created (Newest)</MenuItem>
              <MenuItem value="created_at-asc">Created (Oldest)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Search"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ m: 1, input: { color: 'white' }, label: { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
          />
          <Button color="inherit" component={Link} to="/new-ticket">New Ticket</Button>
          <Button color="inherit" onClick={handleReset}>Reset</Button>
        </Toolbar>
      </NavBar>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', overflowX: 'visible' }}>
        <Dashboard filter={filter} sortField={sortField} sortOrder={sortOrder} search={search} onAgentChange={handleAgentChange} />
      </div>
    </ThemeProvider>
  );
}

function Dashboard({ filter, sortField, sortOrder, search, onAgentChange }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const ticketRefs = useRef({});

  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
      const agentId = agentResponse.data._id;
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tickets/search`, {
        params: {
          account_id: process.env.REACT_APP_ACCOUNT_ID,
          agent_id: agentId,
          q: search || undefined,
          filters: filter || undefined,
          sort: sortField,
          direction: sortOrder,
          limit: process.env.REACT_APP_DEFAULT_LIMIT || 10,
          page: 1,
        },
      });
      const ticketData = response.data.tickets || [];
      console.log('Fetched tickets data:', ticketData);
      // setTickets(ticketData.map(t => ({ ...t, responder_id: t.responder_id?._id?.toString() || '' })));
      /*
      setTickets(ticketData.map(t => ({
        ...t,
        responder_id: t.responder_id?._id?.toString() || '',
        priority_id: t.priority?._id?.toString() || '',
        status_id: t.status?._id?.toString() || ''
      })));
      */
      setTickets(ticketData.map(t => ({
        ...t,
        responder_id: t.responder_id || '',
        priority_id: t.priority || '',
        status_id: t.status || ''
      })));

    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filter, sortField, sortOrder, search]);

  const onPriorityChange = async (ticketId, newPriorityId) => {
    try {
      const newPriorityName = priorities.find(p => p._id === newPriorityId).name;
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { priority: newPriorityId, priority_name: newPriorityName });
      setTickets(tickets.map(t => t._id === ticketId ? { ...t, priority_id: newPriorityId, priority_name: newPriorityName } : t));
      fetchTickets(); // Force refresh from DB
    } catch (err) {
      console.error('Error updating priority:', err);
      // Optional: Add UI toast/error message here
    }
  };

  const onStatusChange = async (ticketId, newStatusId) => {
    try {
      const newStatusName = statuses.find(s => s._id === newStatusId).name;
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { status: newStatusId, status_name: newStatusName });
      setTickets(tickets.map(t => t._id === ticketId ? { ...t, status_id: newStatusId, status_name: newStatusName } : t));
      fetchTickets(); // Force refresh from DB
    } catch (err) {
      console.error('Error updating status:', err);
      // Optional: Add UI toast/error message here
    }
  };
  
  const getSlaStatus = (created_at) => {
    const hoursSinceCreation = (Date.now() - new Date(created_at)) / (1000 * 60 * 60);
    if (hoursSinceCreation > 48) return 'Overdue';
    if (hoursSinceCreation > 24) return 'Warning';
    return 'On Time';
  };

  useEffect(() => {
    let mounted = true;
    fetchTickets();
    const fetchGroups = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/groups`);
        if (mounted) setGroups(response.data || []);
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };
    const fetchTicketFields = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`);
        if (mounted) {
          const fields = response.data;
          setPriorities((fields.priority || []).map(p => ({ _id: p.value, name: p.label })));
          setStatuses((fields.status || []).map(s => ({ _id: s.value, name: s.label })));
        }
      } catch (err) {
        console.error('Error fetching ticket fields:', err);
      }
    };
    fetchGroups();
    fetchTicketFields();
    return () => { mounted = false; };
  }, [fetchTickets]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticketId');
    if (ticketId && ticketRefs.current[ticketId]) {
      ticketRefs.current[ticketId].scrollIntoView({ behavior: 'smooth' });
      ticketRefs.current[ticketId].style.border = '2px solid #1976d2';
      setTimeout(() => {
        ticketRefs.current[ticketId].style.border = '';
      }, 2500);
    }
  }, [tickets]);

  console.log('Rendering Dashboard with tickets length:', tickets.length, 'data:', tickets);

  return (
    <Grid container spacing={3} sx={{ padding: 2, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
      {loading ? (
        <CircularProgress sx={{ m: 'auto' }} />
      ) : error ? (
        <Typography sx={{ m: 'auto', color: 'error.main' }}>{error}</Typography>
      ) : tickets.length === 0 ? (
        <Typography sx={{ m: 'auto' }}>No tickets found</Typography>
      ) : (
        tickets.map((ticket) => (
          <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 3 }} key={ticket._id}>
            <TicketCard ref={(el) => (ticketRefs.current[ticket._id] = el)} sx={{ padding: theme.spacing(1) }}>
              <CardContent sx={{ padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(3) }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                  <Typography variant="subtitle1" sx={{ mr: 1, color: 'text.secondary' }}>
                    {`#${ticket.display_id}`}
                  </Typography>
                  <Typography variant="subtitle1" component={Link} to={`/tickets/${ticket._id}`} sx={{ wordBreak: 'break-word', textDecoration: 'none', color: 'inherit' }}>
                    {ticket.subject}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {ticket.requester_name || 'Unknown'} ({ticket.company_id ? 'Company' : 'Unknown Company'}) | Created {new Date(ticket.created_at).toLocaleDateString()} | {getSlaStatus(ticket.created_at)}
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={ticket.priority_id || ''}
                    onChange={(e) => onPriorityChange(ticket._id, e.target.value)}
                    label="Priority"
                    sx={{
                      '& .MuiInputBase-input': { color: 'black !important' },
                      '.MuiSelect-icon': { color: 'black' },
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'grey' }
                    }}
                    renderValue={(value) => priorities.find(p => p._id === value)?.name || ticket.priority_name || 'Unknown'}
                  >
                    {priorities.map(priority => (
                      <MenuItem key={priority._id} value={priority._id}>{priority.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Agent</InputLabel>
                  <Select
                    value={ticket.responder_id || ''}
                    onChange={(e) => onAgentChange(ticket._id, e.target.value)}
                    label="Agent"
                    sx={{
                      '& .MuiInputBase-input': { color: 'black !important' },
                      '.MuiSelect-icon': { color: 'black' },
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'grey' }
                    }}
                    renderValue={(value) => {
                      if (!value) return 'Unassigned';
                      for (const group of groups) {
                        const agent = group.agents.find(a => a._id === value);
                        if (agent) return `${group.name} / ${agent.name}`;
                      }
                      return 'Unknown';
                    }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {groups.map(group => (
                      group.agents.map(agent => (
                        <MenuItem key={agent._id} value={agent._id}>{`${group.name} / ${agent.name}`}</MenuItem>
                      ))
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={ticket.status_id || ''}
                    onChange={(e) => onStatusChange(ticket._id, e.target.value)}
                    label="Status"
                    sx={{
                      '& .MuiInputBase-input': { color: 'black !important' },
                      '.MuiSelect-icon': { color: 'black' },
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'grey' }
                    }}
                    renderValue={(value) => statuses.find(s => s._id === value)?.name || ticket.status_name || 'Unknown'}
                  >
                    {statuses.map(status => (
                      <MenuItem key={status._id} value={status._id}>{status.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </TicketCard>
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default App;