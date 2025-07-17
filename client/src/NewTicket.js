import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  TextField,
  Autocomplete,
  Typography,
  Container,
  Grid,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import axios from './axiosConfig';
import './styles/NewTicket.css';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong: {this.state.error.message}</h1>;
    }
    return this.props.children;
  }
}

const NewTicket = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    contact: null,
    ticket_type: 'Incident',
    status: 'Open',
    priority: 'Low',
    group_id: 'IT',
    responder_id: null,
    source: 'Phone',
    description: '',
  });
  const [contacts, setContacts] = useState([]);
  const [ticketFields, setTicketFields] = useState({
    ticket_type: [],
    status: [],
    priority: [],
    group: [],
    agent: [],
    source: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicketFields = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/ticketfields');
        const fields = response.data.reduce((acc, field) => {
          acc[field.name] = field.choices || [];
          return acc;
        }, {});
        setTicketFields(fields);

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

  const handleContactSearch = async (input) => {
    if (!input || input.length < 2) {
      setContacts([]);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`/api/users/search?q=${input}`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error searching contacts:', error);
      setError('Failed to search contacts: ' + (error.response?.data?.details || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contact) {
      setError('Please select a contact');
      return;
    }
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    try {
      const statusCode = ticketFields.status.find((s) => s.name === formData.status)?.code || 2;
      const priorityCode = ticketFields.priority.find((p) => p.name === formData.priority)?.code || 1;
      const sourceCode = ticketFields.source.find((s) => s.name === formData.source)?.code || 3;
      const groupId = ticketFields.group.find((g) => g.name === formData.group_id)?.id || 9000171202;

      const ticketData = {
        subject: formData.subject,
        description: formData.description,
        requester_id: formData.contact ? formData.contact._id : null,
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
      navigate('/');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create ticket: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleChange = (field) => (event, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleTextChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Container maxWidth={false}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          New Ticket
        </Typography>
        {loading && <CircularProgress />}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          message={error}
        />
        <Grid container spacing={2} sx={{ width: '100%', display: 'block' }}>
          <Grid sx={{ width: '100%', my: 2 }}>
            <TextField
              className="new-ticket-field"
              label="Subject"
              value={formData.subject}
              onChange={handleTextChange('subject')}
              variant="outlined"
              fullWidth
              sx={{ width: '100% !important' }}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
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
                  sx={{ width: '100% !important' }}
                />
              )}
              onInputChange={(e, value) => handleContactSearch(value)}
              onChange={handleChange('contact')}
              value={formData.contact || null}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.ticket_type}
              value={formData.ticket_type}
              onChange={handleChange('ticket_type')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Ticket Type"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.status.map((s) => s.name)}
              value={formData.status}
              onChange={handleChange('status')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Status"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.priority.map((p) => p.name)}
              value={formData.priority}
              onChange={handleChange('priority')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Priority"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.group.map((g) => g.name)}
              value={formData.group_id}
              onChange={handleChange('group_id')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Group"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.agent}
              getOptionLabel={(option) => option.name || ''}
              value={formData.responder_id}
              onChange={handleChange('responder_id')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Agent"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Autocomplete
              options={ticketFields.source.map((s) => s.name)}
              value={formData.source}
              onChange={handleChange('source')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  className="new-ticket-field"
                  label="Source"
                  variant="outlined"
                  fullWidth
                  sx={{ width: '100% !important' }}
                />
              )}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <TextField
              className="new-ticket-field"
              label="Description"
              multiline
              rows={4}
              value={formData.description}
              onChange={handleTextChange('description')}
              variant="outlined"
              fullWidth
              sx={{ width: '100% !important' }}
            />
          </Grid>
          <Grid sx={{ width: '100%', my: 2 }}>
            <Button variant="contained" color="primary" type="submit">
              Create Ticket
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate('/')}
              sx={{ ml: 1 }}
            >
              Cancel
            </Button>
          </Grid>
        </Grid>
      </Container>
    </form>
    </ErrorBoundary>
  );
};

export default NewTicket;