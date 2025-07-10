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
