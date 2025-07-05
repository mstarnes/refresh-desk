import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./TicketDetails.css";

function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [isAgentOrAdmin] = useState(true); // Placeholder; update with JWT
  const [timeline, setTimeline] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ticketResponse, agentsResponse] = await Promise.all([
          axios.get(`http://localhost:5001/api/tickets/${id}`),
          axios.get("http://localhost:5001/api/agents"),
        ]);
        const fetchedTicket = ticketResponse.data;
        console.log("Fetched ticket data:", fetchedTicket);
        if (!isMounted) return;
        if (!fetchedTicket) {
          throw new Error("Ticket data is invalid");
        }
        if (isMounted) {
          setTicket(fetchedTicket);
          setAgents(agentsResponse.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to fetch ticket or agents: ${err.message}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchTimeline = async () => {
      if (ticket?.requester) {
        try {
          const response = await axios.get(
            `http://localhost:5001/api/tickets/user/${ticket.requester}`
          );
          if (isMounted) setTimeline(response.data);
        } catch (err) {
          console.error("Failed to fetch timeline:", err);
        }
      }
    };

    fetchData();
    fetchTimeline();

    return () => {
      isMounted = false;
    };
  }, [id, ticket?.requester]); // Add ticket.requester

  const handleCommentSubmit = async (e, isPrivate) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      await axios.post(
        `http://localhost:5001/api/tickets/${id}/conversations`,
        {
          body_text: commentContent,
          incoming: isPrivate,
          user_id: "mitch.starnes@gmail.com",
        }
      );
      setCommentContent("");
      const response = await axios.get(
        `http://localhost:5001/api/tickets/${id}`
      );
      setTicket(response.data);
    } catch (err) {
      setError("Failed to add conversation");
    }
  };

  const handleEditComment = async (conversationId) => {
    if (!editingContent.trim()) return;

    try {
      await axios.put(
        `http://localhost:5001/api/tickets/${id}/conversations/${conversationId}`,
        {
          body_text: editingContent,
          user_id: "mitch.starnes@gmail.com",
        }
      );
      setEditingCommentId(null);
      setEditingContent("");
      const response = await axios.get(
        `http://localhost:5001/api/tickets/${id}`
      );
      setTicket(response.data);
    } catch (err) {
      setError("Failed to update conversation");
    }
  };

  const getLastAction = (ticket) => {
    const lastConversation = ticket.conversations?.find(
      (conv) => !conv.incoming
    );
    if (lastConversation) {
      const author =
        lastConversation.user_id === "mitch.starnes@gmail.com"
          ? "Agent"
          : "User";
      return `${author} responded on ${new Date(
        lastConversation.created_at || lastConversation.updated_at
      ).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;
    }
    return "";
  };

  const handleClose = async () => {
    try {
      await axios.patch(`http://localhost:5001/api/tickets/${id}/close`);
      setTimeout(() => navigate("/"), 0);
    } catch (err) {
      setError("Failed to close ticket: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      try {
        await axios.delete(`http://localhost:5001/api/tickets/${id}`);
        navigate("/");
      } catch (err) {
        setError("Failed to delete ticket");
      }
    }
  };

  const updateField = async (field, value) => {
    try {
      const response = await axios.patch(
        `http://localhost:5001/api/tickets/${id}`,
        { [field]: value }
      );
      setTicket(response.data);
      if (field === "status" && value === "Closed") {
        setTimeout(() => navigate("/"), 0);
      }
    } catch (err) {
      setError("Failed to update ticket: " + err.message);
    }
  };

  const getPriorityColor = (priority) => {
    const safePriority = priority || "Low";
    switch (safePriority) {
      case "Low":
        return "green";
      case "Medium":
        return "blue";
      case "High":
        return "#FFA500";
      case "Urgent":
        return "red";
      default:
        return "gray";
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!ticket) return <p>Ticket not found</p>;

  return (
    <div className="ticket-details">
      <div>{getLastAction(ticket)}</div>
      <button onClick={() => navigate("/")} className="back-button">
        Back to Dashboard
      </button>
      <div className="ticket-header">
        <h1>
          {ticket.subject} #{ticket.display_id}
        </h1>
        <div className="ticket-actions">
          <button className="action-button">Forward</button>
          <button onClick={handleClose} className="action-button">
            Close
          </button>
          <button className="action-button">Merge</button>
          <button onClick={handleDelete} className="action-button">
            Delete
          </button>
        </div>
      </div>
      <div className="ticket-content">
        <div className="ticket-main">
          <table className="ticket-table">
            <thead>
              <tr>
                <th></th>
                <th>Ticket</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Avatar">
                  <div
                    className="priority-indicator"
                    style={{
                      backgroundColor: getPriorityColor(ticket.priority),
                    }}
                  ></div>
                </td>
                <td data-label="Ticket">
                  <div>
                    <strong>
                      {ticket.subject} #{ticket.display_id}
                    </strong>
                    <br />
                    <a href={`mailto:${ticket.requester?.email}`}>
                      {ticket.requester?.name ||
                        ticket.requester?.email?.split("@")[0]}
                    </a>
                    <br />
                    <span>
                      Ticket opened on{" "}
                      {new Date(ticket.created_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </td>
                <td data-label="Details">
                  <select
                    value={ticket.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className="priority-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <select
                    value={ticket.agent || "Unassigned"}
                    onChange={(e) =>
                      updateField(
                        "agent",
                        e.target.value === "Unassigned" ? null : e.target.value
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
                    value={ticket.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className="status-select"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>{" "}
              </tr>
            </tbody>
          </table>
          <div className="ticket-description">
            <h3>Description</h3>
            <p>{ticket.description || "No description provided"}</p>
          </div>
          <div className="ticket-conversations">
            <h3>Conversation</h3>
            {ticket.conversations && ticket.conversations.length > 0 ? (
              ticket.conversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`conversation ${conv.incoming ? "incoming" : ""}`}
                >
                  {editingCommentId === conv._id ? (
                    <div>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="reply-textarea"
                      />
                      <button
                        onClick={() => handleEditComment(conv._id)}
                        className="send-reply-button"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="close-button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p>{conv.body_text}</p>
                      <small>
                        By{" "}
                        {conv.user_id
                          ? agents.find(
                              (a) =>
                                a._id.toString() === conv.user_id.toString()
                            )?.name || conv.user_id
                          : "Unknown"}{" "}
                        on {new Date(conv.created_at).toLocaleString()}
                        {conv.incoming && " (Incoming)"}
                        {conv.updated_at &&
                          ` (Edited: ${new Date(
                            conv.updated_at
                          ).toLocaleString()})`}
                      </small>
                      <button
                        onClick={() => {
                          setEditingCommentId(conv._id);
                          setEditingContent(conv.body_text);
                        }}
                        className="edit-button"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p>No conversations yet.</p>
            )}
          </div>
          <div className="comment-form">
            <h3>Add Conversation</h3>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Type your comment here..."
              className="reply-textarea"
              required
            />
            <div className="form-actions">
              <button
                type="button"
                onClick={(e) => handleCommentSubmit(e, false)}
                className="action-button active"
              >
                Add as Reply
              </button>
              {isAgentOrAdmin && (
                <button
                  type="button"
                  onClick={(e) => handleCommentSubmit(e, true)}
                  className="action-button"
                >
                  Add as Private Note
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="ticket-sidebar">
          <h3>Contact Details</h3>
          <p>
            <strong>Name:</strong>{" "}
            {ticket.requester?.name ||
              ticket.requester?.email?.split("@")[0] ||
              "Unknown"}
          </p>
          <p>
            <strong>Email:</strong> {ticket.requester?.email || "N/A"}
          </p>
          <p>
            <strong>Company:</strong> {ticket.company?.name || "N/A"}
          </p>
          <h3>Timeline</h3>
          <ul>
            {timeline.map((item) => (
              <li key={item._id}>
                {item.subject} #{item.display_id} -{" "}
                {new Date(item.created_at).toLocaleDateString()} (Status:{" "}
                {item.status})
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowAllActivity(true)}
            className="action-button"
          >
            All Activity
          </button>
        </div>
      </div>
      {showAllActivity && (
        <div className="modal activity-modal">
          <div className="modal-content">
            <h2>All Activity</h2>
            <ul>
              {timeline.map((item) => (
                <li key={item._id}>
                  {item.subject} #{item.display_id} -{" "}
                  {new Date(item.created_at).toLocaleDateString()} (Status:{" "}
                  {item.status})
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowAllActivity(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketDetails;
