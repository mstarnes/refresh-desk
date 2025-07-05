import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const App = () => {
  const [tickets, setTickets] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [statuses, setStatuses] = useState({});
  const [assignedAgents, setAssignedAgents] = useState({});
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [ticketsPerPage, setTicketsPerPage] = useState(10);
  const [filter, setFilter] = useState('allTickets');
  const [userId] = useState('mitch.starnes@gmail.com'); // Placeholder for authentication
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTickets = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/tickets', {
        params: { limit: ticketsPerPage, filters: filter, userId }
      });
      console.log('Fetched tickets response:', response.data);
      setTickets(Array.isArray(response.data.tickets) ? response.data.tickets : []);
    } catch (err) {
      setError('Failed to fetch tickets');
      console.error('Fetch error:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/agents');
      setAgents(response.data);
    } catch (err) {
      setError('Failed to fetch agents');
      console.error('Fetch agents error:', err);
    }
  };

  const updateField = async (ticketId, field, value) => {
    try {
      const response = await axios.patch(`http://localhost:5001/api/tickets/${ticketId}`, { [field]: value });
      const updatedTicket = response.data;
      setPriorities(prev => ({ ...prev, [ticketId]: updatedTicket.priority || 'Low' }));
      setStatuses(prev => ({ ...prev, [ticketId]: updatedTicket.status || 'Open' }));
      setAssignedAgents(prev => ({ ...prev, [ticketId]: updatedTicket.agent || 'Unassigned' }));
      setTickets(prevTickets =>
        prevTickets.map(t => t._id === ticketId ? { ...t, ...updatedTicket } : t)
      );
      const refreshResponse = await axios.get('http://localhost:5001/api/tickets', {
        params: { limit: ticketsPerPage, filters: filter, userId }
      });
      setTickets(Array.isArray(refreshResponse.data.tickets) ? refreshResponse.data.tickets : []);
    } catch (err) {
      setError('Failed to update ticket');
      console.error('Update error:', err);
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
    fetchTickets();
    fetchAgents();
  }, [ticketsPerPage, filter, currentPage, userId]);

  if (error) return <div>Error: {error}</div>;

  return (
    <div className="App">
      <h1>Refresh Desk</h1>
      <div className="controls">
        <select value={ticketsPerPage} onChange={(e) => setTicketsPerPage(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="allTickets">All Tickets</option>
          <option value="newAndMyOpen">New & My Open Tickets</option>
          <option value="openTickets">Open Tickets</option>
        </select>
        <div className="pagination">
          {Array.from({ length: Math.ceil(3623 / ticketsPerPage) }, (_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)} disabled={currentPage === i + 1}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="ticket-grid">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="ticket-card" style={{ borderLeft: `5px solid ${getPriorityColor(ticket.priority)}` }}>
            <h3>
              <Link to={`/ticket/${ticket.display_id}`}>Ticket #{ticket.display_id}: {ticket.subject}</Link>
            </h3>
            <p>{ticket.description.substring(0, 100)}...</p>
            <select
              value={priorities[ticket._id] || ticket.priority || 'Low'}
              onChange={(e) => updateField(ticket._id, 'priority', e.target.value)}
              className="priority-select"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <select
              value={assignedAgents[ticket._id] || ticket.agent || 'Unassigned'}
              onChange={(e) => updateField(ticket._id, 'agent', e.target.value === 'Unassigned' ? null : e.target.value)}
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
              value={statuses[ticket._id] || ticket.status || 'Open'}
              onChange={(e) => updateField(ticket._id, 'status', e.target.value)}
              className="status-select"
            >
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;