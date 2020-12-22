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
const auth = require("../middleware/auth");
const { createStripeSession, constructEvent } = require('./stripe');
const { sendEmail } = require('./email');

const app = express();
const router = express.Router();

let usersDb;

const getUsersDb = async () => {
  if (!usersDb) {
    const { usersCollection, adminCollection } = await connectDatabase();
    usersDb = new Users(usersCollection, adminCollection);
  }

  return usersDb;
}

router.get('/', (req, res) => {
  res.send('API is working!');
})

router.post('/login', async (req, res) => {
  usersDb = await getUsersDb();
  const { username, password } = req.body;

  try {
    const user = await usersDb.getAdmin(username);

    if (!user) {
      return res.status(400).json({
        message: `User ${username} does not exist`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect password",
      });
    }

    const payload = {
      user: {
        username: user.username,
      },
    };

    console.log(`Logged in user: ${username}`)

    jwt.sign(
      payload,
      process.env.PRIVATE_KEY,
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

router.get('/admin', auth, async (req, res) => {
  usersDb = await getUsersDb();
  try {
    const admin = await usersDb.getAdmin(req.user.username);
    res.json({ username: admin.username });
  } catch (e) {
    res.send({ message: "Error fetching admin" });
  }
})

router.get('/users', auth, async (req, res) => {
  usersDb = await getUsersDb();
  const results = await usersDb.getAll();
  res.json(results);
});


// save user
router.post('/register', async (req, res) => {
  usersDb = await getUsersDb();
  const user = req.body;

  // if non-paying user exists with this email then delete it
  let resp = await usersDb.checkExistsByEmail(user.email);
  if (resp !== null) {
    await usersDb.deleteByEmail(user.email);
    console.log(`Duplicate email. Deleted ${user.email}`)
  }

  resp = await usersDb.checkExistsByUofTEmail(user.emailuoft);
  if (resp !== null) {
    await usersDb.deleteByEmailUofT(user.emailuoft);
    console.log(`Duplicate UofT Email. Deleted ${user.emailuoft}`)
  }

  // save user
  await usersDb.save(user);
  res.redirect('/');
})

router.delete('/user/:id', auth, async (req, res) => {
  usersDb = await getUsersDb();
  const id = req.params.id;
  await usersDb.deleteById(id);
  res.redirect('/');
})

// checks if paid user exists with email
router.get('/user/email/:email', async (req, res) => {
  usersDb = await getUsersDb();
  const email = req.params.email;
  const resp = await usersDb.checkExistsByEmail(email, 'paid');
  const exists = resp === null ? false : true;

  console.log(`User by email ${email} ${exists ? 'exists. User:' : 'does not exist.'}`, resp);

  res.json({ exists });
})

// checks if paid user exists with email
router.get('/user/emailuoft/:email', async (req, res) => {
  usersDb = await getUsersDb();
  const email = req.params.email;
  const resp = await usersDb.checkExistsByUofTEmail(email, 'paid');
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
  usersDb = await getUsersDb();
  // get customer_email off of it then update paymentSuccess in mongoDb
  const { data, type } = req.body;

  // check webhook signature
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = constructEvent(req.body, sig)
  }
  catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log("POST /webhooks route hit. req.body: ", req.body);
    const { object } = data;
    const customer_email = object.customer_email;

    // Handle the event
    switch (type) {
      case "checkout.session.completed" || "checkout.session.async_payment_succeeded":
        console.log(`Payment was successful! Email: ${customer_email}`);
        // update payment status to successul
        await usersDb.updatePaymentStatus(customer_email);
        // send email
        const user = await usersDb.getUserByEmail(customer_email);
        await sendEmail(user);
        break;
      default:
        console.log(`Unhandled event type ${type}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("/webhooks route error: ", err);
    res.sendStatus(500);
  }
});

router.post('/send/:email', auth, async (req, res) => {
  const email = req.params.email;
  usersDb = await getUsersDb();
  const user = await usersDb.getUserByEmail(email);

  const statusCode = await sendEmail(user);
  res.sendStatus(statusCode == 500 ? 500 : 200);
})

// router.get('/beep', auth, async (req, res) => {
//   usersDb = await getUsersDb();
//   usersDb.usersCollection.remove({})
// })

router.get('/test', (req, res) => res.json({ route: req.originalUrl }));

var corsOptions = {
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static('public'))
app.use('/public', express.static('public'))
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', router);

module.exports = app;
module.exports.handler = serverless(app);
