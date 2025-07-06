// client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './App.css';

function App() {
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'updated_at',
    direction: 'desc',
  });
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
  const [userId] = useState('mitch.starnes@gmail.com');

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, [filter, userId, ticketsPerPage]);
  
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/tickets', {
        params: { limit: ticketsPerPage, filters: filter, userId },
      });
      console.log('Fetched tickets response:', response.data);
      const tickets = Array.isArray(response.data) ? response.data : [];
      setTickets(tickets);
      const initialPriorities = tickets.reduce(
        (acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.priority || 1,
        }),
        {}
      );
      const initialStatuses = tickets.reduce(
        (acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.status || 2,
        }),
        {}
      );
      const initialAgents = tickets.reduce(
        (acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.responder_id?._id || 'Unassigned',
        }),
        {}
      );
      setPriorities(initialPriorities);
      setStatuses(initialStatuses);
      setAssignedAgents(initialAgents);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
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
  
    const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    try {
      setLoading(true);
    if (query) {
        const response = await axios.get('http://localhost:5001/api/tickets/search', {
          params: { q: query, limit: ticketsPerPage, filters: filter, userId },
        });
        setTickets(Array.isArray(response.data) ? response.data : []);
    } else {
      fetchTickets();
      }
      setLoading(false);
    } catch (err) {
      console.error('Error searching tickets:', err);
      setError(`Error searching tickets: ${err.message}`);
      setLoading(false);
    }
  };

  const sortData = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    const sortedTickets = [...tickets].sort((a, b) => {
      if (key === 'subject') {
        return direction === 'asc'
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      } else if (key === 'updated_at' || key === 'created_at') {
        return direction === 'asc'
          ? new Date(a[key]) - new Date(b[key])
          : new Date(b[key]) - new Date(a[key]);
      }
      return 0;
    });
    setTickets(sortedTickets);
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.description &&
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(
    indexOfFirstTicket,
    indexOfLastTicket
  );
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
          user_id: userId,
        });
        closeReplyForm();
        fetchTickets();
      } catch (err) {
        setError('Failed to send reply');
      }
    }
  };

  const updateField = async (ticketId, field, value) => {
    try {
      const updates = {};
      if (field === 'priority') {
        updates.priority = value === 'Low' ? 1 : value === 'Medium' ? 2 : value === 'High' ? 3 : 4;
        updates.priority_name = value;
      } else if (field === 'status') {
        updates.status = value === 'Open' ? 2 : value === 'Pending' ? 3 : value === 'Resolved' ? 4 : 5;
        updates.status_name = value;
        if (value === 'Closed') updates.closed_at = new Date().toISOString();
      } else if (field === 'agent') {
        updates.responder_id = value === 'Unassigned' ? null : value;
        updates.responder_name = value === 'Unassigned' ? null : agents.find(a => a._id === value)?.name;
      }
      const response = await axios.patch(`http://localhost:5001/api/tickets/${ticketId}`, updates);
      const updatedTicket = response.data;
      setPriorities((prev) => ({
        ...prev,
        [ticketId]: updatedTicket.priority || 1,
      }));
      setStatuses((prev) => ({
        ...prev,
        [ticketId]: updatedTicket.status || 2,
      }));
      setAssignedAgents((prev) => ({
        ...prev,
        [ticketId]: updatedTicket.responder_id?._id || 'Unassigned',
      }));
      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          t._id === ticketId ? { ...t, ...updatedTicket } : t
        )
      );
    } catch (err) {
      setError('Failed to update ticket');
      console.error('Update error:', err);
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
      return `Updated ${new Date(lastConversation.updated_at).toLocaleDateString()}`;
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
          <select
            value={sortConfig.key}
            onChange={(e) => sortData(e.target.value)}
          >
            <option value="updated_at">Last Modified</option>
            <option value="created_at">Date Created</option>
            <option value="subject">Subject</option>
          </select>
          <select
            value={sortConfig.direction}
            onChange={(e) =>
              setSortConfig({ ...sortConfig, direction: e.target.value })
            }
          >
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
      <input
        type="text"
        placeholder="Search tickets..."
        value={searchQuery}
        onChange={handleSearch}
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
                <td data-label="Avatar">
                  <div
                    className="priority-indicator"
                    style={{
                      backgroundColor: getPriorityColor(priorities[ticket._id]),
                    }}
                  ></div>
                </td>
                <td data-label="Ticket">
                  <div className="ticket-card">
                    {isTicketNew(ticket) && (
                      <span className="new-indicator"></span>
                    )}
                    <div className="ticket-header">
                      <Link to={`/tickets/${ticket.display_id}`}>
                        {ticket.subject || 'No Subject'} #{ticket.display_id}
                      </Link>
                    </div>
                    <div className="ticket-meta">
                      {ticket.requester && ticket.requester.name ? (
                        `${ticket.requester.name} (${ticket.company_id?.name || 'Unknown Company'}, ${ticket.responder_id?.name || 'Unassigned'})`
                      ) : (
                        `Unknown (${ticket.company_id?.name || 'Unknown Company'}, ${ticket.responder_id?.name || 'Unassigned'})`
                      )} | {getLastAction(ticket)} | {getSLAStatus(ticket)}
                    </div>
                  </div>
                </td>

                <td data-label="Details">
                  <select
                    value={priorities[ticket._id] || 'Low'}
                    onChange={(e) =>
                      updateField(
                        ticket._id,
                        'priority',
                        e.target.value === 'Low'
                          ? 1
                          : e.target.value === 'Medium'
                          ? 2
                          : e.target.value === 'High'
                          ? 3
                          : 4
                      )
                    }
                    className="priority-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <select
                    value={assignedAgents[ticket._id] || 'Unassigned'}
                    onChange={(e) =>
                      updateField(
                        ticket._id,
                        'agent',
                        e.target.value === 'Unassigned' ? null : e.target.value
                      )
                    }
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
                    onChange={(e) =>
                      updateField(
                        ticket._id,
                        'status',
                        e.target.value === 'Open'
                          ? 2
                          : e.target.value === 'Pending'
                          ? 3
                          : e.target.value === 'Resolved'
                          ? 4
                          : 5
                      )
                    }
                    className="status-select"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
      {replyTicket && (
        <div className="modal reply-modal">
          <div className="modal-content">
            <h2>Reply to Ticket: {replyTicket.subject}</h2>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply here..."
              className="reply-textarea"
            />
            <button
              onClick={sendReply}
              className="send-reply-button"
              disabled={!replyContent.trim()}
            >
              Send Reply
            </button>
            <button onClick={closeReplyForm} className="close-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;