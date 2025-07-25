import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme, styled } from '@mui/material/styles';
import { AppBar, Toolbar, Button, Typography, Grid, Card, CardContent, CardActions, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';
import NewTicket from './NewTicket';
import TicketDetails from './TicketDetails';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

const NavBar = styled(AppBar)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const TicketCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  '&:hover': { boxShadow: theme.shadows[6] },
  transition: 'box-shadow 0.3s',
}));

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <NavBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Refresh Desk</Typography>
            <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={Link} to="/new-ticket">New Ticket</Button>
          </Toolbar>
        </NavBar>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-ticket" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetails />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const ticketRefs = useRef({});

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
      const agentId = agentResponse.data._id;
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tickets`, {
        params: {
          account_id: process.env.REACT_APP_ACCOUNT_ID,
          agent_id: agentId,
          sort_by: 'updated_at',
          sort_order: 'desc',
          limit: process.env.REACT_APP_DEFAULT_LIMIT || 10,
        },
      });
      setTickets(response.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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

  const handleReset = () => {
    setTickets([]);
    fetchTickets();
  };

  return (
    <Grid container spacing={2} sx={{ padding: 2 }}>
      {loading ? (
        <CircularProgress sx={{ m: 'auto' }} />
      ) : tickets.length === 0 ? (
        <Typography sx={{ m: 'auto' }}>No tickets found</Typography>
      ) : (
        tickets.map((ticket) => (
          <Grid item xs={12} sm={6} md={4} key={ticket._id}>
            <TicketCard ref={(el) => (ticketRefs.current[ticket._id] = el)}>
              <CardContent>
                <Typography variant="h6" component={Link} to={`/tickets/${ticket._id}`}>
                  {ticket.subject}
                </Typography>
                <Typography>Status: {ticket.status_name}</Typography>
                <Typography>Priority: {ticket.priority_name}</Typography>
                <Typography>Requester: {ticket.requester_name}</Typography>
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
      <Grid item xs={12}>
        <Button variant="contained" component={Link} to="/new-ticket">
          New Ticket
        </Button>
        <Button variant="outlined" onClick={handleReset} sx={{ ml: 1 }}>
          Reset
        </Button>
      </Grid>
    </Grid>
  );
}

export default App;