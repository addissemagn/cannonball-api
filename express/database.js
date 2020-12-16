const MongoClient = require('mongodb').MongoClient;

const connString = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.alfbd.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

let db, usersCollection;

const connectDatabase = async () => {
  try {
    const client = await MongoClient.connect(connString, { useUnifiedTopology: true });
    db = client.db(process.env.DB_NAME);
    usersCollection = db.collection('users');
    console.log('Connected to DB')

    return usersCollection;
  } catch (err) { console.log(err); }
}

const addUser = async (user) => {
  try {
    const response = await usersCollection.insertOne(user);
    return response;
  } catch (err) { console.log(err); }
}

const getAllUsers = async () => {
  try {
    const response = await usersCollection.find().toArray();
    return response;
  } catch (err) { console.log(err); }
}

const deleteUser = async (id) => {
  try {
    const res = await usersCollection.remove({_id: mongodb.ObjectID(id)});
    return res;
  } catch (err) { console.log(err); }
}

module.exports = {
    connectDatabase,
    getAllUsers,
    addUser,
    deleteUser,
}