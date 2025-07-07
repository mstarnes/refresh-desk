// client/src/TicketDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './TicketDetails.css';
import { Link } from 'react-router-dom';

const mongoose = require('mongoose');

function TicketDetails() {
  const { display_id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);
  const [priorities, setPriorities] = useState({});
  const [statuses, setStatuses] = useState({});
  const [assignedAgents, setAssignedAgents] = useState({});
  const [agents, setAgents] = useState([]);
  const [userId] = useState(process.env.REACT_APP_CURRENT_AGENT_EMAIL || 'mitch.starnes@exotech.pro');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/tickets/display/${display_id}`);
        console.log('Fetched ticket data:', response.data);
        setTicket(response.data);
        setPriorities({ [response.data._id]: response.data.priority_name || 'Low' });
        setStatuses({ [response.data._id]: response.data.status_name || 'Open' });
        setAssignedAgents({ [response.data._id]: response.data.responder_id?._id || 'Unassigned' });
      } catch (err) {
        setError(`Failed to fetch ticket: ${err.message}`);
      }
    };

    const fetchTimeline = async () => {
      if (ticket?.requester_id) {
        try {
          const response = await axios.get(`http://localhost:5001/api/tickets/user/${ticket.requester_id}`);
          setTimeline(response.data);
        } catch (err) {
          setError(`Failed to fetch timeline: ${err.message}`);
        }
      }
    };

    const fetchAgents = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/agents');
        setAgents(response.data);
      } catch (err) {
        console.error('Fetch Agents Error:', err);
      }
    };

    fetchTicket();
    fetchAgents();
    if (ticket?.requester_id) {
      fetchTimeline();
    }
  }, [display_id, ticket?.requester_id]);

  const updateField = async (ticketId, field, value) => {
    try {
      const updates = {};
      let conversationText = '';
      const agent = agents.find(a => a.email === userId) || { id: 9006333765, name: 'Mitch Starnes' };
      if (field === 'priority') {
        updates.priority = value === 'Low' ? 1 : value === 'Medium' ? 2 : value === 'High' ? 3 : 4;
        updates.priority_name = value;
        conversationText = `Agent ${agent.name} changed priority to ${value} on ${new Date().toLocaleString()}`;
      } else if (field === 'status') {
        updates.status = value === 'Open' ? 2 : value === 'Pending' ? 3 : value === 'Resolved' ? 4 : 5;
        updates.status_name = value;
        if (value === 'Closed') updates.closed_at = new Date().toISOString();
        conversationText = `Agent ${agent.name} changed status to ${value} on ${new Date().toLocaleString()}`;
      } else if (field === 'responder_id') {
        updates.responder_id = value === 'Unassigned' ? null : new mongoose.Types.ObjectId('6868527ff5d2b14198b52653');
        updates.responder_name = value === 'Unassigned' ? null : agent.name;
        conversationText = `Agent ${agent.name} ${value === 'Unassigned' ? 'unassigned' : 'assigned'} ticket on ${new Date().toLocaleString()}`;
      }
      const response = await axios.patch(`http://localhost:5001/api/tickets/${ticketId}`, {
        ...updates,
        conversations: conversationText ? [
          ...(ticket?.conversations || []),
          {
            id: Math.floor(Math.random() * 1000000),
            body_text: conversationText,
            private: false,
            user_id: agent.id,
            incoming: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ] : undefined
      });
      const updatedTicket = response.data;
      setTicket(updatedTicket);
      setPriorities({ [ticketId]: updatedTicket.priority_name || 'Low' });
      setStatuses({ [ticketId]: updatedTicket.status_name || 'Open' });
      setAssignedAgents({ [ticketId]: updatedTicket.responder_id?._id || 'Unassigned' });
    } catch (err) {
      setError('Failed to update ticket');
      console.error('Error updating ticket:', err);
    }
  };

  const getPriorityColor = (priority) => {
    const safePriority = priority || 'Low';
    switch (safePriority) {
      case 'Low':
      case 1:
        return 'green';
      case 'Medium':
      case 2:
        return 'blue';
      case 'High':
      case 3:
        return '#FFA500';
      case 'Urgent':
      case 4:
        return 'red';
      default:
        return 'gray';
    }
  };

  const getLastAction = (ticket) => {
    if (ticket.status === 5 && ticket.closed_at) {
      return `Closed ${new Date(ticket.closed_at).toLocaleDateString()}`;
    }
    const lastConversation = ticket.conversations?.slice(-1)[0];
    if (lastConversation) {
      const isAgent = agents.some(agent => agent.id === lastConversation.user_id);
      return `${isAgent ? 'Agent' : 'User'} Updated ${new Date(lastConversation.updated_at).toLocaleDateString()}`;
    }
    return `Created ${new Date(ticket.created_at).toLocaleDateString()}`;
  };

  const getSLAStatus = (ticket) => {
    if (ticket.status === 5) {
      return new Date(ticket.closed_at) <= new Date(ticket.due_by)
        ? 'Closed on time'
        : 'Closed late';
    }
    const dueBy = new Date(ticket.due_by);
    const now = new Date();
    const diffHours = (dueBy - now) / (1000 * 60 * 60);
    if (diffHours > 0) {
      return `Due in ${Math.round(diffHours)} hours`;
    }
    return `Overdue by ${Math.abs(Math.round(diffHours))} hours`;
  };

  if (error) return <p>Error: {error}</p>;
  if (!ticket) return <p>Loading...</p>;

  return (
    <div className="ticket-details">
      <div className="ticket-header">
      <h2>{ticket.subject || 'No Subject'} #{ticket.display_id}</h2>
        <div className="ticket-meta">
          {ticket.requester && ticket.requester.name ? (
            `${ticket.requester.name} (${ticket.company_id?.name || 'Unknown Company'})`
          ) : (
            `Unknown (${ticket.company_id?.name || 'Unknown Company'})`
          )} | {getLastAction(ticket)} | {getSLAStatus(ticket)}
        </div>
        <div className="ticket-controls">
          <select
            value={priorities[ticket._id] || 'Low'}
            onChange={(e) => updateField(ticket._id, 'priority', e.target.value)}
            className="priority-select"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select
            value={assignedAgents[ticket._id] || 'Unassigned'}
            onChange={(e) => updateField(ticket._id, 'responder_id', e.target.value)}
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
            value={statuses[ticket._id] || 'Open'}
            onChange={(e) => updateField(ticket._id, 'status', e.target.value)}
            className="status-select"
          >
            <option value="Open">Open</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="ticket-description">
        <h3>Description</h3>
        <p>{ticket.description || 'No description'}</p>
      </div>
      <div className="ticket-conversations">
        <h3>Conversations</h3>
        {ticket.conversations?.length ? (
          ticket.conversations.map((conv) => (
            <div key={conv.id} className="conversation">
              <p>{conv.body_text}</p>
              <p className="conversation-meta">
                {conv.user_id === ticket.requester.id
                  ? ticket.requester.name
                  : agents.find((a) => a.id === conv.user_id)?.name || `Agent ${conv.user_id}`} |{' '}
                {conv.private ? 'Note' : 'Reply'} | {new Date(conv.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p>No conversations</p>
        )}
      </div>
      <div className="ticket-timeline">
        <h3>Timeline (Recent Tickets from Requester)</h3>
        {timeline.length ? (
          timeline.map((t) => (
            <div key={t._id} className="timeline-item">
              <Link to={`/ticket/${t.display_id}`}>
                {t.subject || 'No Subject'} #{t.display_id}
              </Link>
            </div>
          ))
        ) : (
          <p>No other tickets from this requester</p>
        )}
      </div>
    </div>
  );
}

export default TicketDetails;