import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, TextField, Select, MenuItem, Button, Alert, Typography, CircularProgress } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';

function NewTicket() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    description_html: '',
    status: '',
    priority: '',
    ticket_type: '',
    source: '',
    group_id: '',
    agent: '',
    tags: '',
  });
  const [ticketFields, setTicketFields] = useState({});
  const [agentId, setAgentId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [fieldsResponse, agentResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`),
        ]);
        setTicketFields(fieldsResponse.data);
        setAgentId(agentResponse.data._id);
        setFormData((prev) => ({ ...prev, agent: agentResponse.data._id }));
      } catch (err) {
        setError('Failed to load ticket fields or agent');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuillChange = (value) => {
    setFormData({ ...formData, description_html: value });
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.description_html) {
      setError('Subject and description are required');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/tickets`, {
        ...formData,
        account_id: process.env.REACT_APP_ACCOUNT_ID,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()) : [],
      });
      navigate(`/dashboard?ticketId=${response.data._id}`);
    } catch (err) {
      setError('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={2} sx={{ padding: 2, maxWidth: 800, margin: 'auto' }}>
      <Grid item xs={12}>
        <Typography variant="h4">Create New Ticket</Typography>
      </Grid>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}
      {loading ? (
        <CircularProgress sx={{ m: 'auto' }} />
      ) : (
        <>
          <Grid item xs={12}>
            <TextField
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              fullWidth
              required
              error={!formData.subject}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography>Description</Typography>
            <ReactQuill value={formData.description_html} onChange={handleQuillChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {ticketFields.status?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {ticketFields.priority?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Ticket Type"
              name="ticket_type"
              value={formData.ticket_type}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {ticketFields.ticket_type?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {ticketFields.source?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Group"
              name="group_id"
              value={formData.group_id}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {ticketFields.group?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              label="Agent"
              name="agent"
              value={formData.agent}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {ticketFields.agent?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Tags (comma-separated)"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </Button>
            <Button onClick={() => navigate('/dashboard')}>Cancel</Button>
          </Grid>
        </>
      )}
    </Grid>
  );
}

export default NewTicket;