import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Grid, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';
import axios from 'axios';
import ReactQuill from 'react-quill'; // For rich text editor
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

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
  const [agentsByGroup, setAgentsByGroup] = useState({});
  const [agent, setAgent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgentAndFields = async () => {
      try {
        const agentResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`);
        setAgent(agentResponse.data);
        const fieldsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`);
        setTicketFields(fieldsResponse.data || []);
        // Fetch groups and agents
        const groupsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/groups`); // Assuming an endpoint
        const groupsData = groupsResponse.data || [];
        const agentsMap = {};
        groupsData.forEach(group => {
          agentsMap[group.group.id] = group.group.agents.map(a => ({ id: a.id, name: a.name }));
        });
        setAgentsByGroup(agentsMap);
      } catch (err) {
        console.error('Error fetching agent, fields, or groups:', err);
        setTicketFields([]);
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
        group_id: groupId || '6868527ff5d2b14198b5269a',
        requester_id: agent?._id,
        responder_id: agentId || null,
        status: parseInt(status) || 2,
        priority: parseInt(priority) || 1,
        type: type || 'default',
        tags: tagArray.length > 0 ? tagArray : undefined,
        source: 2,
      });
      navigate(`/tickets/${response.data._id}`);
    } catch (err) {
      console.error('Error creating ticket:', err);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Grid container sx={{ padding: 2 }}>
      <Grid>
        <Typography variant="h4">New Ticket</Typography>
        <Button variant="outlined" onClick={handleBack} sx={{ mb: 2 }}>Back to Dashboard</Button>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            margin="normal"
          />
          <ReactQuill
            value={description}
            onChange={setDescription}
            modules={{ toolbar: [['bold', 'italic', 'underline'], ['link']] }}
            formats={['bold', 'italic', 'underline', 'link']}
            style={{ marginBottom: '16px' }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Group</InputLabel>
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} label="Group">
              {Array.isArray(ticketFields) && ticketFields.filter(field => field.type === 'group').map(field => (
                <MenuItem key={field._id} value={field.value}>{field.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Agent</InputLabel>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} label="Agent">
              <MenuItem value="">Unassigned</MenuItem>
              {groupId && agentsByGroup[groupId] && agentsByGroup[groupId].map(a => (
                <MenuItem key={a.id} value={a.id}>{`${groupId === '9000171202' ? 'IT' : 'RE'} / ${a.name}`}</MenuItem>
              ))}
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