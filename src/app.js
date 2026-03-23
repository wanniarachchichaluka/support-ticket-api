const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// In-memory ticket store — simulates a database
let tickets = [];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'support-ticket-api',
    uptime: process.uptime()
  });
});

// Get all tickets
app.get('/tickets', (req, res) => {
  res.status(200).json({
    count: tickets.length,
    tickets: tickets
  });
});

// Create a new ticket
app.post('/tickets', (req, res) => {
  const { title, description, priority } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      error: 'title and description are required'
    });
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({
      error: `priority must be one of: ${validPriorities.join(', ')}`
    });
  }

  const ticket = {
    id: uuidv4(),
    title,
    description,
    priority: priority || 'medium',
    status: 'open',
    createdAt: new Date().toISOString()
  };

  tickets.push(ticket);

  res.status(201).json(ticket);
});

// Get a single ticket by ID
app.get('/tickets/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({
      error: 'ticket not found'
    });
  }

  res.status(200).json(ticket);
});

// Update ticket status
app.patch('/tickets/:id', (req, res) => {
  const ticket = tickets.find(t => t.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({
      error: 'ticket not found'
    });
  }

  const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
  const { status } = req.body;

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${validStatuses.join(', ')}`
    });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  res.status(200).json(ticket);
});

// Reset tickets — used in tests
app.delete('/tickets/reset', (req, res) => {
  tickets = [];
  res.status(200).json({ message: 'tickets reset' });
});

module.exports = app;