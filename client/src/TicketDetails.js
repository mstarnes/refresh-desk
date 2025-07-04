import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./TicketDetails.css";
import DOMPurify from "dompurify";

function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [newConversation, setNewConversation] = useState("");

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:5001/api/tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok)
        throw new Error(
          `Failed to fetch ticket: ${response.status} ${response.statusText}`
        );
      const data = await response.json();
      setTicket(data);
      setStatus(data.status);
      setPriority(data.priority);
    } catch (err) {
      setError(err.message);
    }
  };

  const getLastAction = () => {
    if (ticket?.conversations?.length > 0) {
      const lastConv = ticket.conversations[ticket.conversations.length - 1];
      return `Last action by user ${
        lastConv.user_id || "Unknown"
      } on ${new Date(lastConv.created_at).toLocaleString()}`;
    }
    return "No actions";
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/tickets/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: parseInt(status),
          priority: parseInt(priority),
        }),
      });
      if (!response.ok) throw new Error("Failed to update ticket");
      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddConversation = async (e) => {
    e.preventDefault();
    if (!newConversation.trim()) return;
    try {
      const response = await fetch(
        `http://localhost:5001/api/tickets/${id}/conversations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_API_TOKEN || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: 9006333765,
            body: newConversation,
            incoming: false,
          }), // Example user_id
        }
      );
      if (!response.ok) throw new Error("Failed to add conversation");
      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      setNewConversation("");
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error)
    return (
      <div className="ticket-details">
        <p className="error">{error}</p>
      </div>
    );
  if (!ticket)
    return (
      <div className="ticket-details">
        <p>Loading...</p>
      </div>
    );

  return (
    <div className="ticket-details">
      <h2>
        Ticket #{ticket.id}: {ticket.subject}
      </h2>
      <button onClick={() => navigate("/")}>Back to List</button>
      <div className="ticket-info">
        <label>
          Status:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={2}>Open</option>
            <option value={4}>Pending</option>
            <option value={5}>Closed</option>
          </select>
        </label>
        <label>
          Priority:
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value={1}>Low</option>
            <option value={2}>Medium</option>
            <option value={3}>High</option>
            <option value={4}>Urgent</option>
          </select>
        </label>
        <button onClick={handleUpdate}>Update</button>
      </div>
      <p>{getLastAction()}</p>
      <div className="description">
        <h3>Description</h3>
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(ticket.description_html),
          }}
        />
      </div>
      <h3>Conversations</h3>
      {ticket.conversations && ticket.conversations.length > 0 ? (
        ticket.conversations.map((conv) => (
          <div key={conv.id} className="conversation">
            <p>
              <strong>User ID:</strong> {conv.user_id || "Unknown"}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(conv.created_at).toLocaleString()}
            </p>
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(conv.body_html),
              }}
            />
            {conv.attachments?.map((att, idx) => (
              <img
                key={idx}
                src={att.url}
                alt={att.name}
                style={{ maxWidth: "200px" }}
              />
            ))}
          </div>
        ))
      ) : (
        <p>No conversations</p>
      )}
      <form onSubmit={handleAddConversation}>
        <textarea
          value={newConversation}
          onChange={(e) => setNewConversation(e.target.value)}
          placeholder="Add a conversation..."
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default TicketDetails;
