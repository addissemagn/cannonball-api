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

class Users {
  constructor(usersCollection) {
    this.usersCollection = usersCollection;
  };

  async save(user) {
    try {
      const res = await this.usersCollection.insertOne(user);
      return res;
    } catch (err) { console.log(err); }
  };

  async getAll() {
    try {
      const res = await this.usersCollection.find().toArray();
      return res;
    } catch (err) { console.log(err); }
  };

  async updatePaymentStatus(email) {
    try {
      const res = await this.usersCollection.updateOne(
        { email: email },
        {
          $set: { paymentSuccess: true },
          $currentDate: { lastModified: true }
        }
      );
      return res;
    } catch (err) { console.log(err); }
  };

  async deleteById(id) {
    try {
      const res = await this.usersCollection.remove({_id: mongodb.ObjectID(id)});
      return res;
    } catch (err) { console.log(err); }
  };

  async deleteByEmail(email) {
    try {
      const res = await this.usersCollection.remove(
        { email: email },
      );
      return res;
    } catch (err) { console.log(err); }
  };

  async checkExistsByEmail(email) {
    try {
      const res = await this.usersCollection.findOne({ email: email });
      return res;
    } catch (err) { console.log(err); }
  };

  async checkExistsByUofTEmail(email) {
    try {
      const res = await this.usersCollection.findOne({ emailuoft: email });
      return res;
    } catch (err) { console.log(err); }
  };

  async getAdmin(username) {
    try {
      const res = await adminCollection.findOne({ username: username });
      return res;
    } catch (err) { console.log(err); }
  };
}

module.exports = {
    connectDatabase,
    Users,
}
