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
  const [groupId, setGroupId] = useState('');
  const [type, setType] = useState('');
  const [tags, setTags] = useState('');
  const [ticketFields, setTicketFields] = useState([]);
  const [agent, setAgent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentAndFields = async () => {
      try {
        const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
        setAgent(agentResponse.data);
        const fieldsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`);
        setTicketFields(fieldsResponse.data || []); // Ensure array if data is undefined
      } catch (err) {
        console.error('Error fetching agent or ticket fields:', err);
        setTicketFields([]); // Default to empty array on error
      }
    };
    fetchAgentAndFields();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/tickets`, {
        subject,
        description,
        account_id: process.env.REACT_APP_ACCOUNT_ID,
        group_id: groupId || '6868527ff5d2b14198b5269a', // Default to IT group if not selected
        requester_id: agent?._id,
        responder_id: agentId || agent?._id,
        status: parseInt(status) || 2, // Default to Open (2)
        priority: parseInt(priority) || 1, // Default to Low (1)
        type: type || 'default', // Default type if not selected
        tags: tagArray.length > 0 ? tagArray : undefined,
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
              {Array.isArray(ticketFields) && ticketFields.filter(field => field.type === 'priority').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
              {Array.isArray(ticketFields) && ticketFields.filter(field => field.type === 'status').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Group</InputLabel>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} label="Group">
              {Array.isArray(ticketFields) && ticketFields.filter(field => field.type === 'group').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select value={type} onChange={(e) => setType(e.target.value)} label="Type">
              {Array.isArray(ticketFields) && ticketFields.filter(field => field.type === 'type').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Enter tags separated by commas (e.g., tag1, tag2)"
          />
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
            Submit
          </Button>
        </form>
      </Grid>
    </Grid>
  );
}

export default NewTicket;