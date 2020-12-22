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
const { createStripeSession } = require('./stripe');
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

const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

router.get('/files', async (req, res) => {
  getFiles(__dirname)
  .then(files => console.log(files))
  .catch(e => console.error(e));
});

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
  const resp = await usersDb.checkExistsByEmail(email);
  const exists = resp === null ? false : true;

  console.log(`User by email ${email} ${exists ? 'exists. User:' : 'does not exist.'}`, resp);

  res.json({ exists });
})

// checks if paid user exists with email
router.get('/user/emailuoft/:email', async (req, res) => {
  usersDb = await getUsersDb();
  const email = req.params.email;
  const resp = await usersDb.checkExistsByUofTEmail(email);
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

  try {
    console.log("POST /webhooks route hit. req.body: ", req.body);
    const { object } = data;
    const customer_email = object.customer_email;

    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      console.log(`Update payment succes: ${customer_email}`);

      // update payment status to successul
      await usersDb.updatePaymentStatus(customer_email);

      const user = await usersDb.getUserByEmail(customer_email);
      sendEmail(user);
    }

    if (type === "payment_intent.canceled") {
      console.log(`Cancel payment succes: ${customer_email}`);
      await usersDb.deleteByEmail(customer_email);
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
  sendEmail(user);
  res.sendStatus(200);
})

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
