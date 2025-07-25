import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import TicketDetails from './TicketDetails';
import NewTicket from './NewTicket';
import './styles/index.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/dashboard" element={<App />} />
      <Route path="/tickets/:id" element={<TicketDetails />} />
      <Route path="/new-ticket" element={<NewTicket />} />
    </Routes>
  </BrowserRouter>
);