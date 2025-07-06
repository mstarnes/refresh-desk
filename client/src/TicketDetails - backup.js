import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TicketDetails.css';

const TicketDetails = () => {
  const { display_id } = useParams(); // id is now display_id
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/tickets/display/${display_id}`); // New endpoint
      console.log('Fetched ticket data:', response.data);
      setTicket(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch ticket: ' + err.message);
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    if (!ticket?.requester_id) return;
    try {
      const response = await axios.get(`http://localhost:5001/api/tickets/user/${ticket.requester_id}`);
      setTimeline(response.data);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setError('Failed to fetch timeline: ' + err.message);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/agents');
      setAgents(response.data);
    } catch (err) {
      setError('Failed to fetch agents: ' + err.message);
    }
  };

  const updateField = async (field, value) => {
    try {
      const response = await axios.patch(`http://localhost:5001/api/tickets/${ticket._id}`, { [field]: value }); // Use _id for updates
      setTicket(response.data);
      if (field === 'status' && value === 'Closed') {
        setTimeout(() => navigate('/'), 0);
      }
    } catch (err) {
      setError('Failed to update ticket: ' + err.message);
    }
  };

  const getPriorityColor = (priority) => {
    const safePriority = priority || 'Low';
    switch (safePriority) {
      case 'Low': return 'green';
      case 'Medium': return 'blue';
      case 'High': return '#FFA500';
      case 'Urgent': return 'red';
      default: return 'gray';
    }
  };

  useEffect(() => {
    fetchTicket();
    fetchAgents();
  }, [display_id]);

  useEffect(() => {
    fetchTimeline();
  }, [ticket?.requester_id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!ticket) return <div>No ticket found</div>;

  return (
    <div className="ticket-details">
      <h2>Ticket #{ticket.display_id}: {ticket.subject}</h2>
      <table className="ticket-table">
        <tbody>
          <tr>
            <td data-label="Description">{ticket.description}</td>
            <td data-label="Details">
              <select
                value={ticket.priority || 'Low'}
                onChange={(e) => updateField('priority', e.target.value)}
                className="priority-select"
                style={{ color: getPriorityColor(ticket.priority) }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <select
                value={ticket.agent?._id || 'Unassigned'}
                onChange={(e) => updateField('agent', e.target.value === 'Unassigned' ? null : e.target.value)}
                className="agent-select"
              >
                <option value="Unassigned">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                value={ticket.status || 'Open'}
                onChange={(e) => updateField('status', e.target.value)}
                className="status-select"
              >
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="timeline">
        <h3>Timeline</h3>
        {timeline.length > 0 ? (
          timeline.map((item, index) => (
            <div key={index} className="timeline-item">
              <p>{item.subject} - {new Date(item.created_at).toLocaleString()}</p>
              <p>Status: {item.status}</p>
            </div>
          ))
        ) : (
          <p>No timeline events found.</p>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;