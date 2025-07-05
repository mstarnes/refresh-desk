import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = parseInt(process.env.REACT_APP_DEFAULT_LIMIT) || 10;
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [agents, setAgents] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [statuses, setStatuses] = useState({});
  const [assignedAgents, setAssignedAgents] = useState({});
  const [filter, setFilter] = useState('allTickets');
  const [userId] = useState('mitch.starnes@gmail.com'); // Remove setUserId

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/tickets', {
          params: { limit: ticketsPerPage, filters: filter, userId }
        });
        console.log('Fetched tickets response:', response.data);
        setTickets(Array.isArray(response.data.tickets) ? response.data.tickets : []);
        const initialPriorities = response.data.tickets.reduce((acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.priority || 1
        }), {});
        const initialStatuses = response.data.tickets.reduce((acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.status || 2
        }), {});
        const initialAgents = response.data.tickets.reduce((acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.agent || 'Unassigned'
        }), {});
        setPriorities(initialPriorities);
        setStatuses(initialStatuses);
        setAssignedAgents(initialAgents);
        setLoading(false);
      } catch (err) {
        setError(`Failed to fetch tickets: ${err.message}`);
        setLoading(false);
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
    fetchTickets();
    fetchAgents();
  }, [filter, userId, ticketsPerPage]);

  const sortData = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sortedTickets = [...tickets].sort((a, b) => {
      if (key === 'subject') {
        return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      } else if (key === 'updated_at' || key === 'created_at') {
        return direction === 'asc' ? new Date(a[key]) - new Date(b[key]) : new Date(b[key]) - new Date(a[key]);
      }
      return 0;
    });
    setTickets(sortedTickets);
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const openReplyForm = (ticket) => {
    setReplyTicket(ticket);
    setReplyContent('');
  };

  const closeReplyForm = () => {
    setReplyTicket(null);
  };

  const sendReply = async () => {
    if (replyTicket && replyContent.trim()) {
      try {
        await axios.post('http://localhost:5001/api/tickets/reply', {
          ticketId: replyTicket._id,
          body: replyContent,
          user_id: userId
        });
        closeReplyForm();
        const response = await axios.get('http://localhost:5001/api/tickets', {
          params: { limit: ticketsPerPage, filters: filter, userId }
        });
        setTickets(Array.isArray(response.data.tickets) ? response.data.tickets : []);
      } catch (err) {
        setError('Failed to send reply');
      }
    }
  };

  const updateField = async (ticketId, field, value) => {
    try {
      const response = await axios.patch(`http://localhost:5001/api/tickets/${ticketId}`, { [field]: value });
      const updatedTicket = response.data;
      setPriorities(prev => ({ ...prev, [ticketId]: updatedTicket.priority || 1 }));
      setStatuses(prev => ({ ...prev, [ticketId]: updatedTicket.status || 2 }));
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
    const safePriority = priority || 1;
    switch (safePriority) {
      case 1: return 'green';
      case 2: return 'blue';
      case 3: return '#FFA500';
      case 4: return 'red';
      default: return 'gray';
    }
  };

  const getLastAction = (ticket) => {
    const lastConversation = ticket.conversations?.find(conv => !conv.incoming);
    if (lastConversation) {
      const author = lastConversation.user_id === userId ? 'Agent' : 'User';
      return `${author} responded on ${new Date(lastConversation.created_at || lastConversation.updated_at).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}`;
    }
    return '';
  };

  const isTicketNew = (ticket) => !ticket.updated_at;

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="App">
      <div className="dashboard-controls">
        <div className="filters">
          <label>Filter: </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="newAndMyOpen">New and My Open Tickets</option>
            <option value="openTickets">Open Tickets</option>
            <option value="allTickets">All Tickets</option>
          </select>
        </div>
        <div className="sort">
          <label>Sort by: </label>
          <select value={sortConfig.key} onChange={(e) => sortData(e.target.value)}>
            <option value="updated_at">Last Modified</option>
            <option value="created_at">Date Created</option>
            <option value="subject">Subject</option>
          </select>
          <select value={sortConfig.direction} onChange={(e) => setSortConfig({ ...sortConfig, direction: e.target.value })}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
      <h1>Ticket Dashboard</h1>
      <input
        type="text"
        placeholder="Search tickets..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      {currentTickets.length === 0 ? (
        <p>No tickets available or matching your filter/search.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th onClick={() => sortData('subject')}>Ticket</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {currentTickets.map((ticket) => (
              <tr key={`${ticket._id}-${statuses[ticket._id]}`}>
                <td data-label="Avatar"><div className="priority-indicator" style={{ backgroundColor: getPriorityColor(ticket.priority) }}></div></td>
                <td data-label="Ticket">
                  <div>
                    {isTicketNew(ticket) && <span className="new-indicator"></span>}
                    <strong><Link to={`/ticket/${ticket._id}`} className="ticket-link">{ticket.subject} #{(ticket._id)}</Link></strong>
                    <br /><a href={`mailto:${ticket.requester?.email}`}>{ticket.requester?.name || ticket.requester?.email?.split('@')[0]}</a>
                    <br /><span>Ticket opened on {new Date(ticket.created_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <br />{getLastAction(ticket)}
                    <button onClick={() => openReplyForm(ticket)} className="reply-button">Reply</button>
                  </div>
                </td>
                <td data-label="Details">
                  <select value={priorities[ticket._id]} onChange={(e) => updateField(ticket._id, 'priority', parseInt(e.target.value))} className="priority-select">
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Urgent</option>
                  </select>
                  <select value={assignedAgents[ticket._id] || 'Unassigned'} onChange={(e) => updateField(ticket._id, 'agent', e.target.value === 'Unassigned' ? null : e.target.value)} className="agent-select">
                    <option value="Unassigned">Unassigned</option>
                    {agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.name}</option>)}
                  </select>
                  <select value={statuses[ticket._id]} onChange={(e) => updateField(ticket._id, 'status', parseInt(e.target.value))} className="status-select">
                    <option value={2}>Open</option>
                    <option value={3}>Pending</option>
                    <option value={4}>Resolved</option>
                    <option value={5}>Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
      </div>
      {replyTicket && (
        <div className="modal reply-modal">
          <div className="modal-content">
            <h2>Reply to Ticket: {replyTicket.subject}</h2>
            <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Type your reply here..." className="reply-textarea" />
            <button onClick={sendReply} className="send-reply-button" disabled={!replyContent.trim()}>Send Reply</button>
            <button onClick={closeReplyForm} className="close-button">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;