'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');

require("dotenv").config();

const { connectDatabase, getAllUsers, addUser, deleteUser } = require('./database');

connectDatabase();

const router = express.Router();

router.get('/', (req, res) => {
  res.send('We\'re in boys!');
});

// get users
router.get('/users', async (req, res) => {
  const results = await getAllUsers();
  res.send(results);
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
