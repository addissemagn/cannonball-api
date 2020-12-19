const MongoClient = require('mongodb').MongoClient;

const connString = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.alfbd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

let db, usersCollection, adminCollection;

const connectDatabase = async () => {
  try {
    const client = await MongoClient.connect(connString, { useUnifiedTopology: true });
    db = client.db(process.env.DB_NAME);
    usersCollection = db.collection('users');
    adminCollection = db.collection('admin');
    // TODO: add users to this collection on sign up and then the top one on payed
    // this method also seems a lil dumb tho
    // signedUpCollection = db.collection('registered-users');
    console.log('Connected to DB')

    return usersCollection;
  } catch (err) { console.log(err); }
}

const addUser = async (user) => {
  try {
    const res = await usersCollection.insertOne(user);
    return res;
  } catch (err) { console.log(err); }
}

const getAllUsers = async () => {
  try {
    const res = await adminCollection.find().toArray();
    return res;
  } catch (err) { console.log(err); }
}

const updatePaymentStatus = async (email) => {
  try {
    const res = await usersCollection.updateOne(
      { email: email },
      {
        $set: { paymentSuccess: true },
        $currentDate: { lastModified: true }
      }
    );
    return res;
  } catch (err) { console.log(err); }
};

const deleteUser = async (id) => {
  try {
    const res = await usersCollection.remove({_id: mongodb.ObjectID(id)});
    return res;
  } catch (err) { console.log(err); }
}

const deleteUserByEmail = async (email) => {
  try {
    const res = await usersCollection.remove(
      { email: email },
    );
    return res;
  } catch (err) { console.log(err); }
}

// checks if user with email & payment successful exists
const checkUserExistsByEmail = async (email) => {
  try {
    const res = await usersCollection.findOne({ email: email });
    return res;
  } catch (err) { console.log(err); }
}

// checks if user with email & payment successful exists
const checkUserExistsByUofTEmail = async (email) => {
  try {
    const res = await usersCollection.findOne({ emailuoft: email });
    return res;
  } catch (err) { console.log(err); }
}

const createAdmin = async (admin) => {
  try {
    const res = await adminCollection.insertOne(admin);
    return res;
  } catch (err) { console.log(err); }
}

const getAdmin = async (username) => {
  try {
    const res = await adminCollection.findOne({ username: username });
    return res;
  } catch (err) { console.log(err); }
}

module.exports = {
    connectDatabase,
    getAllUsers,
    addUser,
    deleteUser,
    deleteUserByEmail,
    checkUserExistsByEmail,
    checkUserExistsByUofTEmail,
    updatePaymentStatus,
    createAdmin,
    getAdmin,
}