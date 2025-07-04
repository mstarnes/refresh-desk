const mongoose = require('mongoose');
require('dotenv').config();

async function resetDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define minimal schemas for dropping collections
    const Company = mongoose.model('Company', new mongoose.Schema({}));
    const User = mongoose.model('User', new mongoose.Schema({}));
    const Ticket = mongoose.model('Ticket', new mongoose.Schema({}));
    const Agent = mongoose.model('Agent', new mongoose.Schema({}));
    const Contacts = mongoose.model('Contacts', new mongoose.Schema({}));

    // Drop collections
    await Promise.all([
      Company.deleteMany({}),
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Agent.deleteMany({}),
      Contacts.deleteMany({})
    ]);
    console.log('Database purged');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
    await mongoose.disconnect();
  }
}

resetDB();