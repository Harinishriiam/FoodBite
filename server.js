// server.js - Express Server for FoodBite
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'FoodBite Prototype',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Fallback route to serve index.html for SPA-style handling
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🍔 FoodBite Local Full-Stack Platform is RUNNING!`);
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/menu`);
  console.log(`🤖 AI Chatbot: http://localhost:${PORT}/api/ai/recommend`);
  console.log(`======================================================\n`);
});

module.exports = { app, server };
