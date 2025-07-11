// client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import mongoose from 'mongoose';

function App() {
  const [tickets, setTickets] = useState([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('searchQuery') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'updated_at',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = parseInt(process.env.REACT_APP_DEFAULT_LIMIT) || 10;
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [noteTicket, setNoteTicket] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [agents, setAgents] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [statuses, setStatuses] = useState({});
  const [assignedAgents, setAssignedAgents] = useState({});
  const [filter, setFilter] = useState(() => localStorage.getItem('filter') || 'newAndMyOpen');
  const [userId] = useState(process.env.REACT_APP_CURRENT_AGENT_EMAIL || 'mitch.starnes@exotech.pro');
  const [dialog, setDialog] = useState({ visible: false, ticket: null });
  const [dialogTimeout, setDialogTimeout] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchTickets();
    fetchAgents();
    localStorage.setItem('filter', filter);
  }, [filter, currentPage, sortConfig]); // Removed searchQuery
  
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/tickets', {
        params: {
          limit: ticketsPerPage,
          page: currentPage,
          filters: filter,
          userId,
          sort: sortConfig.key,
          direction: sortConfig.direction,
        },
      });
      console.log('Fetched tickets response:', response.data);
      const { tickets: fetchedTickets, total } = response.data;
      setTickets(Array.isArray(fetchedTickets) ? fetchedTickets : []);
      setTotalTickets(total || 0);
      const initialPriorities = fetchedTickets.reduce(
        (acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.priority_name || 'Low',
        }),
        {}
      );
      const initialStatuses = fetchedTickets.reduce(
        (acc, ticket) => ({
          ...acc,
          [ticket._id]: ticket.status_name || 'Open',
        }),
        {}
      );
      const initialAgents = fetchedTickets.reduce(
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
    if (e.key === 'Enter') {
      const query = e.target.value;
      setSearchQuery(query);
      setFilter(''); // Clear filter during search
      setCurrentPage(1);
      localStorage.setItem('filter', '');
      localStorage.setItem('searchQuery', query); // Persist searchQuery
      try {
        setLoading(true);
        if (query) {
          const response = await axios.get('http://localhost:5001/api/tickets/search', {
            params: {
              q: query,
              limit: ticketsPerPage,
              page: 1,
              filters: '',
              userId,
              sort: sortConfig.key,
              direction: sortConfig.direction,
            },
          });
          const { tickets: fetchedTickets, total } = response.data;
          setTickets(Array.isArray(fetchedTickets) ? fetchedTickets : []);
          setTotalTickets(total || 0);
          const initialPriorities = fetchedTickets.reduce(
            (acc, ticket) => ({
              ...acc,
              [ticket._id]: ticket.priority_name || 'Low',
            }),
            {}
          );
          const initialStatuses = fetchedTickets.reduce(
            (acc, ticket) => ({
              ...acc,
              [ticket._id]: ticket.status_name || 'Open',
            }),
            {}
          );
          const initialAgents = fetchedTickets.reduce(
            (acc, ticket) => ({
              ...acc,
              [ticket._id]: ticket.responder_id?._id || 'Unassigned',
            }),
            {}
          );
          setPriorities(initialPriorities);
          setStatuses(initialStatuses);
          setAssignedAgents(initialAgents);
        } else {
          await fetchTickets(); // Reset to filtered tickets when query is empty
        }
        setLoading(false);
      } catch (err) {
        console.error('Error searching tickets:', err);
        setError(`Error searching tickets: ${err.message}`);
        setLoading(false);
      }
    } else {
      setSearchQuery(e.target.value);
    }
  };

  const sortData = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setSearchQuery('');
    setCurrentPage(1);
    localStorage.setItem('filter', value);
    localStorage.setItem('searchQuery', '');
  };

  const filteredTickets = tickets;

  const totalPages = Math.ceil(totalTickets / ticketsPerPage);

  const openReplyForm = (ticket) => {
    setReplyTicket(ticket);
    setReplyContent('');
  };

  const closeReplyForm = () => {
    setReplyTicket(null);
  };

  const openNoteForm = (ticket) => {
    setNoteTicket(ticket);
    setNoteContent('');
  };

  const closeNoteForm = () => {
    setNoteTicket(null);
  };

  const sendReply = async () => {
    if (replyTicket && replyContent.trim()) {
      try {
        const agent = agents.find(a => a.email === userId) || { id: 9006333765, name: 'Mitch Starnes' };
        await axios.post('http://localhost:5001/api/tickets/reply', {
          ticketId: replyTicket._id,
          body: replyContent,
          user_id: agent.id,
        });
        closeReplyForm();
        fetchTickets();
      } catch (err) {
        setError('Failed to send reply');
        console.error('Reply error:', err);
      }
    }
  };

  const sendNote = async () => {
    if (noteTicket && noteContent.trim()) {
      try {
        const agent = agents.find(a => a.email === userId) || { id: 9006333765, name: 'Mitch Starnes' };
        await axios.post(`http://localhost:5001/api/tickets/${noteTicket._id}/conversations`, {
          body_text: noteContent,
          private: true,
          user_id: agent.id,
          incoming: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: Math.floor(Math.random() * 1000000),
        });
        closeNoteForm();
        fetchTickets();
      } catch (err) {
        setError('Failed to add note');
        console.error('Note error:', err);
      }
    }
  };

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
          ...(tickets.find(t => t._id === ticketId)?.conversations || []),
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
      setPriorities((prev) => ({
        ...prev,
        [ticketId]: updatedTicket.priority_name || 'Low',
      }));
      setStatuses((prev) => ({
        ...prev,
        [ticketId]: updatedTicket.status_name || 'Open',
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
      await fetchTickets();
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
        return '#28a745'; // green
      case 'Medium':
      case 2:
        return '#007bff'; // blue
      case 'High':
      case 3:
        return '#fd7e14'; // orange
      case 'Urgent':
      case 4:
        return '#dc3545'; // red
      default:
        return '#6c757d'; // gray
    }
  };

  const getLastAction = (ticket) => {
    if (ticket.status === 5 && ticket.ticket_states.closed_at) {
      return `Closed ${new Date(ticket.ticket_states.closed_at).toLocaleDateString()}`;
    }
    const lastConversation = ticket.conversations?.slice(-1)[0];
    if (lastConversation) {
      const isAgent = agents.some(agent => agent.id === lastConversation.user_id);
      return `${isAgent ? 'Agent' : 'User'} Updated ${new Date(lastConversation.updated_at).toLocaleDateString()}`;
    }
    return `Created ${new Date(ticket.created_at).toLocaleDateString()}`;
  };

  const getSLAStatus = (ticket) => {
    if (ticket.status === 5 && ticket.ticket_states.closed_at && !isNaN(new Date(ticket.ticket_states.closed_at))) {
      return `Closed ${new Date(ticket.ticket_states.closed_at).toLocaleDateString()} (${new Date(ticket.ticket_states.closed_at) <= new Date(ticket.due_by) ? 'on time' : 'late'})`;
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

  const getLastActionDetails = (ticket) => {
    const lastConversation = ticket.conversations?.slice(-1)[0];
    if (lastConversation) {
      const name = lastConversation.user_id === ticket.requester.id
        ? ticket.requester.name
        : agents.find((a) => a.id === lastConversation.user_id)?.name || `Agent ${lastConversation.user_id}`;
      return {
        initial: name[0] || 'U',
        name,
        verb: lastConversation.private ? 'noted' : 'replied',
        timestamp: new Date(lastConversation.updated_at).toLocaleString(),
        preview: lastConversation.body_text.slice(0, 240) + (lastConversation.body_text.length > 240 ? '...' : ''),
      };
    }
    return {
      initial: ticket.requester?.name[0] || 'U',
      name: ticket.requester?.name || 'Unknown',
      verb: 'created',
      timestamp: new Date(ticket.created_at).toLocaleString(),
      preview: ticket.description.slice(0, 240) + (ticket.description.length > 240 ? '...' : ''),
    };
  };

  const handleMouseEnter = (ticket) => {
    if (dialogTimeout) clearTimeout(dialogTimeout);
    const timeout = setTimeout(() => {
      setDialog({ visible: true, ticket });
    }, parseInt(process.env.REACT_APP_DIALOG_DELAY) || 1000);
    setDialogTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (dialogTimeout) clearTimeout(dialogTimeout);
  };

  const handleCloseDialog = () => {
    if (dialogTimeout) clearTimeout(dialogTimeout);
    setDialog({ visible: false, ticket: null });
  };

  const handleReply = () => {
    openReplyForm(dialog.ticket);
        handleCloseDialog();
  };

  const handleAddNote = () => {
    openNoteForm(dialog.ticket);
    handleCloseDialog();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ');
    const initials = words.map(word => word.charAt(0).toUpperCase()).join('');
    return initials.substring(0, 3);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="dashboard-container">
      <div className="top-controls">
        <div className="filter-sort-wrapper">
        <div className="filters">
          <label>Filter: </label>
          <select value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
            <option value="newAndMyOpen">New and My Open Tickets</option>
            <option value="openTickets">Open Tickets</option>
            <option value="allTickets">All Tickets</option>
            <option value="">None</option>
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
            onChange={(e) => setSortConfig({ ...sortConfig, direction: e.target.value })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        </div>
      <input
          type="text"
          placeholder="Search tickets... (press Enter)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="search-input"
      />
      </div>
      <h1>Ticket Dashboard</h1>
      {filteredTickets.length === 0 ? (
        <p>No tickets available or matching your filter/search.</p>
      ) : (
        <div className="ticket-list">
            {filteredTickets.map((ticket) => (
            <div key={`${ticket._id}-${statuses[ticket._id]}`} className="ticket-card">
              <input type="checkbox" className="ticket-checkbox" />
                  <div
                className="ticket-icon"
                    style={{
                      backgroundColor: getPriorityColor(priorities[ticket._id]),
                    }}
              >
                {getInitials(ticket.requester?.name || 'Unknown')}
              </div>
              <div className="ticket-info">
                    <div className="ticket-header">
                      <Link
                        to={`/ticket/${ticket.display_id}`}
                        onMouseEnter={() => handleMouseEnter(ticket)}
                        onMouseLeave={handleMouseLeave}
                      >
                        {ticket.subject || 'No Subject'} #{ticket.display_id}
                      </Link>
                  {isTicketNew(ticket) && (
                    <span className="new-indicator"></span>
                  )}
                    </div>
                    <div className="ticket-meta">
                      {ticket.requester && ticket.requester.name ? (
                        `${ticket.requester.name} (${ticket.company_id?.name || 'Unknown Company'})`
                      ) : (
                        `Unknown (${ticket.company_id?.name || 'Unknown Company'})`
                      )} | {getLastAction(ticket)} | {getSLAStatus(ticket)}
                    </div>
                  </div>
              <div className="selects-container">
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
            ))}
        </div>
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
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
              rows="5"
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
      {noteTicket && (
        <div className="modal note-modal">
          <div className="modal-content">
            <h2>Add Note to Ticket: {noteTicket.subject}</h2>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Type your note here..."
              className="note-textarea"
              rows="5"
            />
            <button
              onClick={sendNote}
              className="send-note-button"
              disabled={!noteContent.trim()}
            >
              Add Note
            </button>
            <button onClick={closeNoteForm} className="close-button">
              Cancel
            </button>
          </div>
        </div>
      )}
      {dialog.visible && (
        <div className="ticket-dialog">
          <div className="dialog-content">
            <button className="dialog-close" onClick={handleCloseDialog}>X</button>
            <div className="dialog-header">
              <div className="avatar">{getLastActionDetails(dialog.ticket).initial}</div>
              <div>
                <div>
                  {getLastActionDetails(dialog.ticket).name} {getLastActionDetails(dialog.ticket).verb}
                </div>
                <div className="timestamp">{getLastActionDetails(dialog.ticket).timestamp}</div>
              </div>
            </div>
            <div className="dialog-body">{getLastActionDetails(dialog.ticket).preview}</div>
            <div className="dialog-actions">
              <button onClick={handleReply}>Reply</button>
              <button onClick={handleAddNote}>Add Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;