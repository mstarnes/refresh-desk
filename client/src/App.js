import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import TicketDetails from './TicketDetails';

function App() {
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const limit = parseInt(process.env.REACT_APP_DEFAULT_LIMIT) || 10;

  useEffect(() => {
    fetchTickets();
    //fetchTicketsWithUsers();
  }, [page]);

  const fetchTickets = async () => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:5001/api/tickets?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (!data.tickets) throw new Error('No tickets found in response');
      setTickets(data.tickets);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(`Failed to fetch tickets: ${err.message}`);
      console.error('Error fetching tickets:', err);
    }
  };

  const fetchTicketsWithUsers = async () => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:5001/api/tickets?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (!data.ticketsWithUsers) throw new Error('No ticketsWithUsers found in response');
      setTickets(data.ticketsWithUsers);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(`Failed to fetch tickets: ${err.message}`);
      console.error('Error fetching tickets:', err);
    }
  };

  const handleNextPage = () => setPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setPage(prev => Math.max(1, prev - 1));

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="dashboard">
              <h1>Refresh Desk Dashboard</h1>
              {error && <p className="error">{error}</p>}
              <div className="ticket-list">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length > 0 ? (
                      tickets.map(ticket => (
                        <tr key={ticket.id} className="ticket-row">
                          <td>{ticket.id}</td>
                          <td>
                            <Link to={`/tickets/${ticket.id}`} className="ticket-link">
                              {ticket.subject}
                            </Link>
                          </td>
                          <td style={{ color: ticket.priority === 3 ? '#FFA500' : 'black' }}>
                            {ticket.priority === 3 ? 'High' : ticket.priority === 1 ? 'Low' : 'Medium'}
                          </td>
                          <td>{ticket.status === 2 ? 'Open' : ticket.status === 5 ? 'Closed' : 'Other'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No tickets found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button onClick={handlePrevPage} disabled={page === 1}>Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={handleNextPage} disabled={page === totalPages}>Next</button>
              </div>
            </div>
          }
        />
        <Route path="/tickets/:id" element={<TicketDetails />} />
      </Routes>
    </Router>
  );
}

export default App;