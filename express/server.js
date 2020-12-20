'use strict';

require("dotenv").config();

const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const {
  connectDatabase,
  getAdmin,
  Users,
} = require("./database");
const { createStripeSession } = require('./stripe');

const app = express();
const router = express.Router();


router.get('/', (req, res) => {
  res.send('API is working!');
})

router.post('/login', async (req, res) => {
  const usersDb = new Users(await connectDatabase);
  const { username, password } = req.body;

  try {
    const user = await usersDb.getAdmin(username);

    if (!user) {
      return res.status(400).json({
        message: `User ${username} does not exist`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        message: "Incorrect password",
      });

    const payload = {
      user: {
        username: user.username,
      },
    };

    console.log(`Logged in user: ${username}`)

    jwt.sign(
      payload,
      "randomString",
      {
        expiresIn: 3600,
      },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error"
    });
  }
})

// save user
router.post('/register', async (req, res) => {
  const usersDb = new Users(await connectDatabase());
  const user = req.body;
  await usersDb.save(user);
  res.redirect('/');
})

// get users
router.get('/users', async (req, res) => {
  const usersDb = new Users(await connectDatabase());
  const results = await usersDb.getAll();
  res.json(results);
});

router.delete('/user/:id', async (req, res) => {
  const usersDb = new Users(await connectDatabase());
  const id = req.params.id;
  await usersDb.deleteById(id);
  res.redirect('/');
})

router.get('/user/email/:email', async (req, res) => {
  const usersDb = new Users(await connectDatabase());
  const email = req.params.email;
  const resp = await usersDb.checkExistsByEmail(email);
  const exists = resp === null ? false : true;

  console.log(`User by email ${email} ${exists ? 'exists. User:' : 'does not exist.'}`, resp);

  res.json({ exists });
})

router.get('/user/emailuoft/:email', async (req, res) => {
  const usersDb = new Users(await connectDatabase());
  const email = req.params.email;
  const resp = await usersDb.checkExistsByUoftEmail(email);
  const exists = resp === null ? false : true;

  console.log(`User by email ${email} ${exists ? 'exists. User:' : 'does not exist.'}`, resp);

  res.json({ exists });
})

// send email
router.post('/email', async (req, res) => {
  const user = req.body;
  const email = user.email;
  console.log(user);
  res.json({ email: email })
})

router.post('/create-checkout-session', async (req, res) => {
  const userInfo = req.body;
  const sessionId = await createStripeSession(userInfo);

  console.log(`Create stripe session for user ${userInfo.email}. Session id: ${sessionId}`)

  res.json({
    id: sessionId,
    ...userInfo,
  });
})

router.post('/webhooks', async (req, res) => {
    const usersDb = new Users(await connectDatabase());
    // get customer_email off of it then update paymentSuccess in mongoDb
    const { data, type } = req.body;

    try {
      console.log("POST /webhooks route hit. req.body: ", req.body);
      const { object } = data;
      const customer_email = object.customer_email;

      if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
        console.log(`Update payment succes: ${customer_email}`);
        await usersDb.updatePaymentStatus(customer_email);
      }

      if (type === "payment_intent.canceled") {
        console.log(`Cancel payment succes: ${customer_email}`);
        await usersDb.deleteByEmail(customer_email);
      }
      res.send(200);
    } catch (err) {
      console.log("/webhooks route error: ", err);
      res.send(500);
    }
});

router.get('/test', (req, res) => res.json({ route: req.originalUrl }));

app.use(cors());
app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', router);

module.exports = app;
module.exports.handler = serverless(app);
