'use strict';
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
var cors = require("cors");

require("dotenv").config();

const {
  connectDatabase,
  getAllUsers,
  addUser,
  deleteUser,
  updatePaymentStatus,
  deleteUserByEmail,
  checkUserExistsByEmail,
  checkUserExistsByUofTEmail,
} = require("./database");
const { createStripeSession } = require('./stripe');

connectDatabase();

const router = express.Router();

router.get('/', (req, res) => {
  res.send('API is working!');
})

// save user
router.post('/register', async (req, res) => {
  const newUser = req.body;
  await addUser(newUser);
  res.redirect('/');
})

// get users
router.get('/users', async (req, res) => {
  const results = await getAllUsers();
  res.json(results);
});

router.delete('/user/:id', async (req, res) => {
  const id = req.params.id;
  await deleteUser(id);
  res.redirect('/');
})

router.get('/user/emailuoft/:email', async (req, res) => {
  const email = req.params.email;
  const resp = await checkUserExistsByUofTEmail(email);
  res.json({ exists: resp === null ? false : true });
})

router.get('/user/email/:email', async (req, res) => {
  const email = req.params.email;
  const resp = await checkUserExistsByEmail(email);
  res.json({ exists: resp === null ? false : true });
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
  res.json({
    id: sessionId,
    ...userInfo,
  });
})

router.post('/webhooks', async (req, res) => {
    await connectDatabase();

    // get customer_email off of it then update paymentSuccess in mongoDb
    const { data, type } = req.body;

    try {
      console.log("/webhooks POST route hit! req.body: ", req.body);
      const { object } = data;
      const customer_email = object.customer_email;

      if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
        console.log(`update payment succes: ${customer_email}`);
        await updatePaymentStatus(customer_email);
      }

      if (type === "payment_intent.canceled") {
        console.log(`cancel payment succes: ${customer_email}`);
        await deleteUserByEmail(customer_email);
      }
      res.send(200);
    } catch (err) {
      console.log("/webhooks route error: ", err);
      res.send(500);
    }
});

router.get('/another', (req, res) => res.json({ route: req.originalUrl }));

app.use(cors());
app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', router);

module.exports = app;
module.exports.handler = serverless(app);
