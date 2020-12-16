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
  res.send('API is working!');
})

// save user
router.post('/register', async (req, res) => {
  const newUser = req.body
  await addUser(newUser);
  res.redirect('/');
})

// get users
router.get('/users', async (req, res) => {
  const results = await getAllUsers();
  res.send(results);
});

router.delete('/user/:id', async (req, res) => {
  const id = req.params.id;
  await deleteUser(id);
  res.redirect('/');
})

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', router);

module.exports = app;
module.exports.handler = serverless(app);
