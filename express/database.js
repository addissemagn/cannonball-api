const MongoClient = require('mongodb').MongoClient;

let DB_USERNAME = "", DB_PASS = "", DB_NAME = "";

if (process.env.PROD === 'true') {
  DB_USERNAME = process.env.PROD_DB_USERNAME;
  DB_PASS = process.env.PROD_DB_PASS;
  DB_NAME = process.env.PROD_DB_NAME;
  DB_CLUSTER = process.env.PROD_DB_CLUSTER;
} else {
  DB_USERNAME = process.env.DEV_DB_USERNAME;
  DB_PASS = process.env.DEV_DB_PASS;
  DB_NAME = process.env.DEV_DB_NAME;
  DB_CLUSTER = process.env.DEV_DB_CLUSTER;
}

const connString = `mongodb+srv://${DB_USERNAME}:${DB_PASS}@cluster0.${DB_CLUSTER}.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;

const connectDatabase = async () => {
  try {
    const client = await MongoClient.connect(connString, { useUnifiedTopology: true });
    const db = client.db(process.env.DB_NAME);
    const usersCollection = db.collection('users');
    const adminCollection = db.collection('admin');
    // TODO: change unintuitive name. this collection tracks users that have gained an extra raffle entry.
    const raffleCollection = db.collection('raffle');
    console.log('Connected to DB')

    return { usersCollection, adminCollection, raffleCollection };
  } catch (err) { console.log(err); }
}

class Users {
  constructor(usersCollection, adminCollection, raffleCollection) {
    this.usersCollection = usersCollection;
    this.adminCollection = adminCollection;
    this.raffleCollection = raffleCollection;
  };

  async save(user) {
    try {
      const res = await this.usersCollection.insertOne(user);
      return res;
    } catch (err) { console.log(err); }
  };

  async addExtraEntry(user) {
    try {
      const res = await this.raffleCollection.insertOne(user);
      return res;
    } catch (err) { console.log(err); }
  };

  async checkExtraEntryExistsByUofTEmail(emailuoft) {
    const query = {
      emailuoft: emailuoft,
    };
    const settingsCaseInsensitive = {
      collation: {
        locale: "en",
        strength: 2,
      },
    };
    try {
      const res = await this.raffleCollection.findOne(query, settingsCaseInsensitive);
      return res;
    } catch (err) { console.log(err); }
  };

  async getUserByEmail(email) {
    try {
      const res = await this.usersCollection.findOne({ email: email });
      return res;
    } catch (err) { console.log(err); }
  };

  async getAll() {
    try {
      const res = await this.usersCollection.find().toArray();
      return res;
    } catch (err) { console.log(err); }
  };

  async getAllWithExtraRaffleEntry() {
    try {
      const res = await this.raffleCollection.find().toArray();
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

  async updateEmailStatus(email) {
    try {
      const res = await this.usersCollection.updateOne(
        { email: email },
        {
          $set: { emailSuccess: true },
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

  async deleteByEmailUofT(emailuoft) {
    try {
      const res = await this.usersCollection.remove(
        { emailuoft: emailuoft },
      );
      return res;
    } catch (err) { console.log(err); }
  };

  async checkExistsByEmail(email, paymentStatus) {
    const query = {
      email: email,
      ...paymentStatus === 'paid' &&  { paymentSuccess: true },
    };
    const settingsCaseInsensitive = {
      collation: {
        locale: "en",
        strength: 2,
      },
    };
    try {
      const res = await this.usersCollection.findOne(query, settingsCaseInsensitive);
      return res;
    } catch (err) { console.log(err); }
  };

  async checkExistsByUofTEmail(email, paymentStatus) {
    const query = {
      emailuoft: email,
      ...paymentStatus === 'paid' &&  { paymentSuccess: true },
    };
    const settingsCaseInsensitive = {
      collation: {
        locale: "en",
        strength: 2,
      },
    };
    try {
      const res = await this.usersCollection.findOne(query, settingsCaseInsensitive);
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
