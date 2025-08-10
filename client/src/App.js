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
  const [filter, setFilter] = useState(() => {
    const saved = localStorage.getItem('filter');
    return saved !== null ? saved : 'newAndMyOpen';
  });
  const [sortField, setSortField] = useState(() => {
    const saved = localStorage.getItem('sortField');
    return saved !== null ? saved : 'updated_at';
  });
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('sortOrder');
    return saved !== null ? saved : 'desc';
  });
  const [search, setSearch] = useState(() => {
    const saved = localStorage.getItem('search');
    return saved !== null ? saved : '';
  });
  const filterRef = useRef(null); // Add this in App()

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

  return (
    <ThemeProvider theme={theme}>
      <NavBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }} component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Refresh Desk
          </Typography>

          <FormControl sx={{ m: 1, minWidth: 120 }} variant="outlined">
            <InputLabel sx={{ color: 'white', '&.Mui-focused': { color: 'white' }, '&.MuiInputLabel-shrink': { color: 'white' } }}>Filter</InputLabel>
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setTimeout(() => {
                  document.activeElement.blur(); // Blur the active element (the input)
                }, 100); // Increased timeout for reliability
              }}
              label="Filter"
              sx={{
                color: 'white',
                '.MuiSelect-icon': { color: 'white' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '& .MuiSelect-select': { color: 'white' },
                '& .MuiSelect-select:focus': { backgroundColor: 'transparent' },
                '& [aria-expanded="true"] ~ .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
              }}
              renderValue={(value) => {
                if (value === '') return null; // Show "Filter" placeholder for All
                if (value === 'newAndMyOpen') return 'New & My Open';
                if (value === 'openTickets') return 'Open Tickets';
                if (value === 'closed') return 'Closed';
                return value;
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="newAndMyOpen">New & My Open</MenuItem>
              <MenuItem value="openTickets">Open Tickets</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }} variant="outlined">
            <InputLabel sx={{ color: 'white', '&.Mui-focused': { color: 'white' }, '&.MuiInputLabel-shrink': { color: 'white' } }}>Sort</InputLabel>
            <Select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field);
                setSortOrder(order);
              }}
              label="Sort"
              sx={{
                color: 'white',
                '.MuiSelect-icon': { color: 'white' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                '& .MuiSelect-select': { color: 'white' },
                '& .MuiSelect-select:focus': { backgroundColor: 'transparent' },
                '& [aria-expanded="true"] ~ .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
              }}
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
            sx={{
              m: 1,
              '& .MuiInputBase-input': { color: 'white' },
              '& .MuiInputLabel-root': { color: 'white' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
              '& .MuiInputLabel-shrink': { color: 'white' },
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
            }}
          />  
          <Button color="inherit" component={Link} to="/new-ticket">New Ticket</Button>
          <Button color="inherit" onClick={handleReset}>Reset</Button>
        </Toolbar>
      </NavBar>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', overflowX: 'visible' }}>
        <Dashboard filter={filter} sortField={sortField} sortOrder={sortOrder} search={search} />
      </div>
    </ThemeProvider>
  );
}

function Dashboard({ filter, sortField, sortOrder, search }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = process.env.REACT_APP_DEFAULT_LIMIT || 10;
  const ticketRefs = useRef({});
  const [updatedTicketId, setUpdatedTicketId] = useState(null);

  const [priorities, setPriorities] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
      const agentId = agentResponse.data._id;
      const agentEmail = agentResponse.data.email;
      const params = {
        q: search || undefined,
        filters: filter || undefined,
        sort: sortField,
        direction: sortOrder,
        limit: limit,
        page: currentPage,
        agent_id: agentId,
        userId: agentEmail
      };
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tickets/search`, { params });
      const ticketData = response.data.tickets || [];
      console.log('Fetched tickets data:', ticketData);
      setTickets(ticketData.map(t => ({
        ...t,
        responder_id: t.responder_id?._id || t.responder_id?.$oid || t.responder_id || '',
        priority_id: t.priority || 1,
        status_id: t.status || 2,
        agentValue: t.group_id + '|' + t.responder_id?._id || t.responder_id?.$oid || t.responder_id || '',
      })));
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filter, sortField, sortOrder, search, currentPage, limit]);

  const onPriorityChange = async (ticketId, newPriorityId) => {
    try {
      const newPriorityName = priorities.find(p => p._id === newPriorityId).name;
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { priority: newPriorityId, priority_name: newPriorityName });
      setUpdatedTicketId(ticketId);
      fetchTickets(); // Force refresh from DB
    } catch (err) {
      console.error('Error updating priority:', err);
    }
  };

  const onAgentChange = async (ticketId, newAgentId, newGroupId) => {
    try {
      const agent = agents.find(a => a._id === newAgentId);
      const agentName = agent ? agent.name : '';
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { responder_id: newAgentId || null, group_id: newGroupId || null, responder_name: agentName });
      setUpdatedTicketId(ticketId);
      fetchTickets(); // Force refresh from DB
    } catch (err) {
      console.error('Error updating agent:', err);
    }
  };

  const onStatusChange = async (ticketId, newStatusId) => {
    try {
      const newStatusName = statuses.find(s => s._id === newStatusId).name;
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}`, { status: newStatusId, status_name: newStatusName });
      setUpdatedTicketId(ticketId);
      fetchTickets(); // Force refresh from DB
    } catch (err) {
      console.error('Error updating status:', err);
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

    const loadData = async () => {
      setLoading(true);
      try {
        const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
        const agentId = agentResponse.data._id;
        const agentEmail = agentResponse.data.email;

        const [groupsRes, fieldsRes, agentsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/groups?populate=agent_ids`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/agents`)
        ]);

        if (mounted) {
          const groupsData = groupsRes.data || [];
          // console.log(JSON.stringify(groupsData, null, 2));
          setGroups(groupsData);
          const fields = fieldsRes.data;
          setPriorities((fields.priority || []).map(p => ({ _id: p.value.toString(), name: p.label })));
          setStatuses((fields.status || []).map(s => ({ _id: s.value.toString(), name: s.label })));

          const agentsData = agentsRes.data || [];
          setAgents(agentsData);

          await fetchTickets(); // Fetch tickets after other data is loaded
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, [fetchTickets]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticketId');
    if (ticketId && ticketRefs.current[ticketId]) {
      ticketRefs.current[ticketId].scrollIntoView({ behavior: 'smooth' });
      ticketRefs.current[ticketId].style.border = '2px solid #1976d2';
      setTimeout(() => {
        if (ticketRefs.current[ticketId]) ticketRefs.current[ticketId].style.border = '';
      }, 2500);
    }
  }, [tickets]);

  useEffect(() => {
    if (updatedTicketId && ticketRefs.current[updatedTicketId]) {
      ticketRefs.current[updatedTicketId].scrollIntoView({ behavior: 'smooth' });
      ticketRefs.current[updatedTicketId].style.boxShadow = theme.shadows[6]; // Mimic hover
      setTimeout(() => {
        if (ticketRefs.current[updatedTicketId]) ticketRefs.current[updatedTicketId].style.boxShadow = '';
      }, 2500);
    }
  }, [updatedTicketId, tickets]);

  useEffect(() => {
    const handleResetEvent = () => {
      setCurrentPage(1);
    };

    document.addEventListener('reset-tickets', handleResetEvent);

    return () => {
      document.removeEventListener('reset-tickets', handleResetEvent);
    };
  }, []);

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
                    value={ticket.agentValue || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        onAgentChange(ticket._id, '', '');
                      } else {
                        const [groupId, agentId] = value.split('|');
                        onAgentChange(ticket._id, agentId, groupId);
                      }
                    }}
                    label="Agent"
                    sx={{
                      '& .MuiInputBase-input': { color: 'black !important' },
                      '.MuiSelect-icon': { color: 'black' },
                      '.MuiOutlinedInput-notchedOutline': { borderColor: 'grey' }
                    }}
                    renderValue={(value) => {
                      //console.log('ticket.agentValue: ' + ticket.agentValue);
                      //console.log('value: ' + value);
                      if (!value) return 'Unassigned';
                      //console.log('value: ' + value);
                      const [groupId, agentId] = value.split('|');
                      const group = groups.find(g => g._id === groupId);
                      const agent = agents.find(a => a._id === agentId);
                      console.log(`${group?.name} / ${agent?.name}`);
                      if (group && agent) return `${group.name} / ${agent.name}`;
                      return 'Unassigned';
                      //return ticket.responder_name || 'Unknown';
                    }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {groups.flatMap(group => group.agent_ids.map(agentId => {
                      const agent = agents.find(a => a._id === agentId);
                      if (!agent) return null;
                      return <MenuItem key={`${group._id}-${agentId}`} value={`${group._id}|${agentId}`}>{`${group.name} / ${agent.name}`}</MenuItem>;
                    }))}
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, width: '100%' }}>
        <Button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>Previous</Button>
        <Typography sx={{ mx: 2 }}>Page {currentPage}</Typography>
        <Button disabled={tickets.length < limit} onClick={() => setCurrentPage(prev => prev + 1)}>Next</Button>
      </Box>
    </Grid>
  );
}

export default App;