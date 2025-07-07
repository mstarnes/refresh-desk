// scripts/seedData.js
const mongoose = require('mongoose');
const Agent = require('../models/Agent');

async function seedData() {
  try {
    await mongoose.connect('mongodb://localhost/refresh-desk');
    
    const agents = [
      {
        _id: new mongoose.Types.ObjectId('6868527ff5d2b14198b52653'),
        id: 9006333765,
        name: 'Mitch Starnes',
        email: 'mitch.starnes@exotech.pro'
      }
    ];

    // Remove existing agent to avoid duplicates
    await Agent.deleteMany({ email: 'mitch.starnes@exotech.pro' });
    await Agent.insertMany(agents);
    console.log('Agent seeded');
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seedData();