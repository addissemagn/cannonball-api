const MongoClient = require('mongodb').MongoClient;

const connString = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const connectDatabase = async () => {
  try {
    const client = await MongoClient.connect(connString, { useUnifiedTopology: true });
    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection('users');
    const adminCollection = db.collection('admin');
    console.log('Connected to DB')

    return { usersCollection, adminCollection };
  } catch (err) { console.log(err); }
}

class Users {
  constructor(usersCollection, adminCollection) {
    this.usersCollection = usersCollection;
    this.adminCollection = adminCollection;
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
      const res = await this.adminCollection.findOne({ username: username });
      return res;
    } catch (err) { console.log(err); }
  };
}

module.exports = {
    connectDatabase,
    Users,
}
