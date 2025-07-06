// client/src/TicketDetails.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function TicketDetails() {
  const { display_id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/tickets/display/${display_id}`);
        console.log('Fetched ticket data:', response.data);
        setTicket(response.data);
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

    fetchTicket();
    if (ticket?.requester_id) {
      fetchTimeline();
    }
  }, [display_id, ticket?.requester_id]);

  if (error) return <p>Error: {error}</p>;
  if (!ticket) return <p>Loading...</p>;

  return (
    <div>
      <h2>{ticket.subject || 'No Subject'} #{ticket.display_id}</h2>
      <p>Company: {ticket.company_id?.name || 'Unknown Company'}</p>
      <p>Requester: {ticket.requester?.name || 'Unknown'}</p>
      <p>Agent: {ticket.responder_id?.name || 'Unassigned'}</p>
      <div>
        <h3>Timeline</h3>
        {timeline.length ? (
          timeline.map((item) => (
            <p key={item._id}>{item.conversations?.slice(-1)[0]?.body_text || 'No content'}</p>
          ))
        ) : (
          <p>No conversations</p>
        )}
      </div>
    </div>
  );
}

export default TicketDetails;