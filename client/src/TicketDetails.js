import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Grid, TextField, Select, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Alert, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';

const ConversationItem = styled(ListItem)(({ theme, isPrivate }) => ({
  backgroundColor: isPrivate ? theme.palette.grey[200] : 'inherit',
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
}));

function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [formData, setFormData] = useState({});
  const [ticketFields, setTicketFields] = useState({});
  const [agentId, setAgentId] = useState('');
  const [conversationText, setConversationText] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [requesterHistory, setRequesterHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ticketResponse, fieldsResponse, agentResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/tickets/${id}`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/ticket-fields`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/agents/email/${process.env.REACT_APP_CURRENT_AGENT_EMAIL}`),
        ]);
        setTicket(ticketResponse.data);
        setFormData({
          subject: ticketResponse.data.subject,
          description_html: ticketResponse.data.description_html || ticketResponse.data.description || '',
          status: ticketResponse.data.status,
          priority: ticketResponse.data.priority,
          ticket_type: ticketResponse.data.ticket_type || '',
          source: ticketResponse.data.source,
          group_id: ticketResponse.data.group_id || '',
          agent: ticketResponse.data.responder_id || '',
          tags: ticketResponse.data.tags?.join(', ') || '',
        });
        setTicketFields(fieldsResponse.data);
        setAgentId(agentResponse.data._id);
        const historyResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/tickets`, {
          params: { requester_id: ticketResponse.data.requester_id, account_id: process.env.REACT_APP_ACCOUNT_ID },
        });
        setRequesterHistory(historyResponse.data.filter((t) => t._id !== id));
      } catch (err) {
        setError('Failed to load ticket data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuillChange = (value) => {
    setFormData({ ...formData, description_html: value });
  };

  const handleUpdate = async () => {
    if (!formData.subject || !formData.description_html) {
      setError('Subject and description are required');
      return;
    }
    setLoading(true);
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/api/tickets/${id}`, {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()) : [],
      });
      navigate(`/dashboard?ticketId=${id}`);
    } catch (err) {
      setError('Failed to update ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/tickets/${id}`);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to delete ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConversation = async () => {
    if (!conversationText) {
      setError('Conversation text is required');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/tickets/${id}/conversations`, {
        body: conversationText,
        user_id: agentId,
        private: false,
      });
      setConversationText('');
      const ticketResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/tickets/${id}`);
      setTicket(ticketResponse.data);
    } catch (err) {
      setError('Failed to add conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={2} sx={{ padding: 2, maxWidth: 1000, margin: 'auto' }}>
      <Grid item xs={12}>
        <Typography variant="h4">Ticket #{ticket?.display_id}</Typography>
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
          <Grid item xs={12} md={6}>
            <TextField
              label="Subject"
              name="subject"
              value={formData.subject || ''}
              onChange={handleChange}
              fullWidth
              required
              error={!formData.subject}
            />
            <Typography>Description</Typography>
            <ReactQuill value={formData.description_html} onChange={handleQuillChange} />
            <Select
              label="Status"
              name="status"
              value={formData.status || ''}
              onChange={handleChange}
              fullWidth
            >
              {ticketFields.status?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <Select
              label="Priority"
              name="priority"
              value={formData.priority || ''}
              onChange={handleChange}
              fullWidth
            >
              {ticketFields.priority?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <Select
              label="Ticket Type"
              name="ticket_type"
              value={formData.ticket_type || ''}
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
            <Select
              label="Source"
              name="source"
              value={formData.source || ''}
              onChange={handleChange}
              fullWidth
            >
              {ticketFields.source?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <Select
              label="Group"
              name="group_id"
              value={formData.group_id || ''}
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
            <Select
              label="Agent"
              name="agent"
              value={formData.agent || ''}
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
            <TextField
              label="Tags (comma-separated)"
              name="tags"
              value={formData.tags || ''}
              onChange={handleChange}
              fullWidth
            />
            <Button variant="contained" onClick={handleUpdate} disabled={loading}>
              {loading ? 'Updating...' : 'Update Ticket'}
            </Button>
            <Button color="error" onClick={() => setOpenDeleteDialog(true)} disabled={loading}>
              Delete Ticket
            </Button>
            <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Conversation History</Typography>
            <List>
              {ticket?.conversations?.map((conv) => (
                <ConversationItem key={conv._id} isPrivate={conv.private}>
                  <ListItemText
                    primary={<div dangerouslySetInnerHTML={{ __html: conv.body || conv.body_text }} />}
                    secondary={`By ${conv.user_id === agentId ? 'You' : conv.user_id} on ${new Date(conv.created_at).toLocaleString()}`}
                  />
                </ConversationItem>
              ))}
            </List>
            <Typography>Add Conversation</Typography>
            <ReactQuill value={conversationText} onChange={setConversationText} />
            <Button variant="contained" onClick={handleAddConversation} disabled={loading}>
              {loading ? 'Adding...' : 'Add Conversation'}
            </Button>
            <Typography variant="h6" sx={{ mt: 2 }}>Requester History</Typography>
            <List>
              {requesterHistory.map((t) => (
                <ListItem key={t._id} button component={Link} to={`/tickets/${t._id}`}>
                  <ListItemText primary={t.subject} secondary={`#${t.display_id} - ${t.status_name}`} />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <Typography>Are you sure you want to delete ticket #{ticket?.display_id}?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
              <Button color="error" onClick={handleDelete} disabled={loading}>
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Grid>
  );
}

export default TicketDetails;