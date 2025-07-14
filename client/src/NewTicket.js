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
import './styles/App.css';

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

        // Set default agent
        const defaultAgent = fields.agent.find(
          (agent) => agent.email === process.env.REACT_APP_CURRENT_AGENT_EMAIL
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
    if (input.length < 2) return;
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
    try {
      const statusCode = ticketFields.status.find((s) => s.name === formData.status)?.code || 2;
      const priorityCode = ticketFields.priority.find((p) => p.name === formData.priority)?.code || 1;
      const sourceCode = ticketFields.source.find((s) => s.name === formData.source)?.code || 3;
      const groupId = ticketFields.group.find((g) => g.name === formData.group_id)?.id || 9000171202;

      const ticketData = {
        ...formData,
        requester_id: formData.contact ? formData.contact._id : null,
        responder_id: formData.responder_id ? formData.responder_id._id : null,
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
          ticket_id: 0, // Will be updated by server
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      await axios.post('/api/tickets', ticketData);
      navigate('/');
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create ticket: ' + (error.response?.data?.details || error.message));
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
    <Container>
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
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Subject"
              value={formData.subject}
              onChange={handleTextChange('subject')}
              variant="outlined"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={contacts}
              getOptionLabel={(option) => option.name || ''}
              onInputChange={(e, value) => handleContactSearch(value)}
              onChange={handleChange('contact')}
              value={formData.contact}
              renderInput={(params) => <TextField {...params} label="Contact" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.ticket_type}
              value={formData.ticket_type}
              onChange={handleChange('ticket_type')}
              renderInput={(params) => <TextField {...params} label="Ticket Type" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.status.map((s) => s.name)}
              value={formData.status}
              onChange={handleChange('status')}
              renderInput={(params) => <TextField {...params} label="Status" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.priority.map((p) => p.name)}
              value={formData.priority}
              onChange={handleChange('priority')}
              renderInput={(params) => <TextField {...params} label="Priority" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.group.map((g) => g.name)}
              value={formData.group_id}
              onChange={handleChange('group_id')}
              renderInput={(params) => <TextField {...params} label="Group" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.agent}
              getOptionLabel={(option) => option.name || ''}
              value={formData.responder_id}
              onChange={handleChange('responder_id')}
              renderInput={(params) => <TextField {...params} label="Agent" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={ticketFields.source.map((s) => s.name)}
              value={formData.source}
              onChange={handleChange('source')}
              renderInput={(params) => <TextField {...params} label="Source" variant="outlined" />}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              multiline
              rows={4}
              value={formData.description}
              onChange={handleTextChange('description')}
              variant="outlined"
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
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
      </form>
    </Container>
  );
};

export default NewTicket;