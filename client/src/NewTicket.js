import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Grid, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';
import axios from 'axios';

function NewTicket() {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [ticketFields, setTicketFields] = useState([]);
  const [agent, setAgent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentAndFields = async () => {
      try {
        const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
        setAgent(agentResponse.data);
        const fieldsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`);
        setTicketFields(fieldsResponse.data);
      } catch (err) {
        console.error('Error fetching agent or ticket fields:', err);
      }
    };
    fetchAgentAndFields();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/tickets`, {
        subject,
        description,
        account_id: process.env.REACT_APP_ACCOUNT_ID,
        group_id: '6868527ff5d2b14198b5269a',
        requester_id: agent?._id,
        responder_id: agentId || agent?._id,
        status: parseInt(status) || 2, // Default to Open (2) if not selected
        priority: parseInt(priority) || 1, // Default to Low (1) if not selected
        source: 2, // Web
      });
      navigate(`/tickets/${response.data._id}`);
    } catch (err) {
      console.error('Error creating ticket:', err);
    }
  };

  return (
    <Grid container sx={{ padding: 2 }}>
      <Grid>
        <Typography variant="h4">New Ticket</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Agent</InputLabel>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} label="Agent">
              {agent && <MenuItem value={agent._id}>{agent.name}</MenuItem>}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} label="Priority">
              {ticketFields.filter(field => field.type === 'priority').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
              {ticketFields.filter(field => field.type === 'status').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
            Submit
          </Button>
        </form>
      </Grid>
    </Grid>
  );
}

export default NewTicket;