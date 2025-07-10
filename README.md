# Refresh Desk

Refresh Desk is a ticket management system built with the **MERN stack** (MongoDB, Express.js, React, Node.js). It allows agents to manage support tickets, assign priorities, update statuses, reply to tickets, add private notes, and search tickets efficiently. The application features a dashboard for viewing tickets, a detailed ticket view with conversation history, and robust filtering and sorting capabilities.

## Features

- **Ticket Dashboard**: View, filter, and sort tickets by status, priority, or date.
- **Ticket Details**: Display ticket conversations with HTML rendering for rich text and plain text fallback.
- **Private Notes**: Mark conversations as private with distinct styling (orange-red border for private, blue for public).
- **Search**: Search tickets by keyword, triggered only on Enter key press to optimize performance.
- **Real-time Updates**: Update ticket priorities, statuses, and assignees with automatic conversation logging.
- **Responsive Design**: Works on desktop and mobile devices.
- **Local Storage**: Persists filter and search query preferences.

## Tech Stack

- **Frontend**: React, Axios, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Styling**: CSS (custom styles in `src/styles/`)
- **Environment**: Node.js, npm

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local or cloud instance, e.g., MongoDB Atlas)
- **npm** (v8 or higher)

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mstarnes/refresh-desk.git
   cd refresh-desk

Install Dependencies:For the client:bash

cd client
npm install

For the server:bash

cd ../server
npm install

Set Up Environment Variables:Create a .env file in the server directory:env

MONGO_URI=mongodb://localhost:27017/refresh_desk
PORT=5001

Create a .env file in the client directory:env

REACT_APP_DEFAULT_LIMIT=10
REACT_APP_CURRENT_AGENT_EMAIL=mitch.starnes@exotech.pro
REACT_APP_DIALOG_DELAY=1000

Replace MONGO_URI with your MongoDB connection string if using a cloud instance (e.g., MongoDB Atlas).

Start MongoDB:Run MongoDB locally:bash

mongod

Or ensure your cloud MongoDB instance is accessible.

Run the Application:Start the server:bash

cd server
npm run dev

In a new terminal, start the client:bash

cd client
npm run dev

Access the client at http://localhost:3000 and the server at http://localhost:5001.

UsageAccess the Dashboard:Open http://localhost:3000 in your browser.
View tickets filtered by "New and My Open Tickets" by default.

Search Tickets:Enter a query in the search bar and press Enter to search tickets.
Clear the query and press Enter to reset to the filtered ticket list.

Manage Tickets:Click a ticket subject to view details, including conversations.
Update priority, status, or assignee via dropdowns in the dashboard or ticket details.
Add replies or private notes, with private notes styled with an orange-red border (#FF4500) and public replies with a blue border (#007bff).

Conversations:Conversations render HTML from body fields, falling back to body_text if body is empty.
Private notes are labeled "Note" and public replies as "Reply" in metadata.

Project Structureplaintext

refresh-desk/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # React components (e.g., TicketDetails.js)
│   │   ├── styles/           # CSS files (e.g., App.css, TicketDetails.css)
│   │   ├── App.js            # Main dashboard component
│   │   └── index.js          # React entry point
│   ├── .env                  # Client environment variables
│   └── package.json          # Client dependencies
├── server/                   # Node.js/Express backend
│   ├── models/               # Mongoose schemas (e.g., Ticket.js)
│   ├── routes/               # API routes (e.g., tickets.js)
│   ├── server.js             # Express server
│   ├── .env                  # Server environment variables
│   └── package.json          # Server dependencies
└── README.md                 # This file

API EndpointsGET /api/tickets: Fetch tickets with pagination, filters, and sorting.
GET /api/tickets/search: Search tickets by keyword.
PATCH /api/tickets/:id: Update ticket fields (e.g., priority, status, assignee).
POST /api/tickets/reply: Add a public reply to a ticket.
POST /api/tickets/:id/conversations: Add a private note to a ticket.
GET /api/agents: Fetch list of agents.

Known IssuesSearch Focus: Fixed to prevent input focus loss by triggering searches only on Enter.
Timeline: New ticket requests may not appear immediately in the timeline; requires investigation.

ContributingFork the repository.
Create a feature branch:bash

git checkout -b feature/your-feature

Commit changes:bash

git commit -m "Add your feature"

Push to the branch:bash

git push origin feature/your-feature

Open a pull request.

Future EnhancementsImplement real-time ticket updates using WebSockets.
Add debounced search for real-time filtering (optional).
Integrate DOMPurify for HTML sanitization to prevent XSS.
Improve mobile responsiveness for ticket details.
Resolve timeline issues with new ticket requests.

LicenseThis project is licensed under the MIT License.ContactFor questions or feedback, contact Mitch Starnes (mailto:mitch.starnes@exotech.pro).

