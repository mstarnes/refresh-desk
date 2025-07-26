import { Link } from 'react-router-dom';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import { AppBar, Toolbar, Button, Typography, Grid, Card, CardContent, CardActions, CircularProgress, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import axios from 'axios';
import { useState, useEffect, useRef, useCallback } from 'react';

const theme = createTheme({
  palette: { primary: { main: '#1976d2' }, secondary: { main: '#dc004e' } },
  typography: { fontFamily: 'Roboto, Arial, sans-serif' },
});

const NavBar = styled(AppBar)(({ theme }) => ({ marginBottom: theme.spacing(2) }));
const TicketCard = styled(Card)(({ theme }) => ({
  minWidth: 300,
  margin: theme.spacing(4),
  '&:hover': { boxShadow: theme.shadows[6] },
  transition: 'box-shadow 0.3s',
}));

function App() {
  const [filter, setFilter] = useState(() => localStorage.getItem('filter') || 'newAndMyOpen');
  const [sortField, setSortField] = useState(() => localStorage.getItem('sortField') || 'updated_at');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('sortOrder') || 'desc');
  const [search, setSearch] = useState(() => localStorage.getItem('search') || '');
  const [agent, setAgent] = useState(null);

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
      setAgent(newAgentId);
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
      <Dashboard filter={filter} sortField={sortField} sortOrder={sortOrder} search={search} onAgentChange={handleAgentChange} />
    </ThemeProvider>
  );
}

function Dashboard({ filter, sortField, sortOrder, search, onAgentChange }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ticketRefs = useRef({});

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
      console.log('Fetched tickets length:', ticketData.length, 'data:', ticketData);
      setTickets(ticketData.map(t => ({ ...t, responder_id: t.responder_id?._id || t.responder_id || '' }))); // Ensure responder_id is a string
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filter, sortField, sortOrder, search]);

  useEffect(() => {
    fetchTickets();
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
    <Grid container spacing={8} sx={{ padding: 2, maxWidth: '100%', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {loading ? (
        <CircularProgress sx={{ m: 'auto' }} />
      ) : error ? (
        <Typography sx={{ m: 'auto', color: 'error.main' }}>{error}</Typography>
      ) : tickets.length === 0 ? (
        <Typography sx={{ m: 'auto' }}>No tickets found</Typography>
      ) : (
        tickets.map((ticket) => (
          <Grid width={{ xs: 12, sm: 12, md: 12 }} key={ticket._id}>
            <TicketCard ref={(el) => (ticketRefs.current[ticket._id] = el)} sx={{ minWidth: 300, padding: theme.spacing(1) }}>
              <CardContent sx={{ padding: theme.spacing(2), display: 'flex', flexDirection: 'column', gap: theme.spacing(2) }}>
                <Typography variant="h6" component={Link} to={`/tickets/${ticket._id}`} sx={{ wordBreak: 'break-word' }}>
                  {ticket.subject}
                </Typography>
                <Typography>Status: {ticket.status_name || 'Unknown'}</Typography>
                <Typography>Priority: {ticket.priority_name || 'Unknown'}</Typography>
                <Typography>Requester: {ticket.requester_name || 'Unknown'}</Typography>
                <FormControl fullWidth>
                  <InputLabel>Agent</InputLabel>
                  <Select
                    value={ticket.responder_id || ''}
                    onChange={(e) => onAgentChange(ticket._id, e.target.value)}
                    label="Agent"
                    sx={{ color: 'white', '.MuiSelect-icon': { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' } }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {/* Placeholder; update with dynamic agents if API available */}
                  </Select>
                </FormControl>
              </CardContent>
              <CardActions>
                <Button size="small" component={Link} to={`/tickets/${ticket._id}`}>
                  View Details
                </Button>
              </CardActions>
            </TicketCard>
          </Grid>
        ))
      )}
    </Grid>
  );
}

export default App;