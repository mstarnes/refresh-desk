const mongoose = require('mongoose');
const ObjectIdMap = require('../models/ObjectIdMap');
const TicketDisplayIdMap = require('../models/TicketDisplayIdMap');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

async function initializeIdMaps() {
  try {
    
    // Initialize ObjectIdMap
    const initialId = 9500000001;
    const existingMax = await ObjectIdMap.findOne().sort({ id: -1 }).select('id');
    const startId = existingMax ? Math.max(existingMax.id + 1, initialId) : initialId;
    if (!await ObjectIdMap.findOne({ id: startId })) {
      await new ObjectIdMap({ id: startId }).save();
      console.log(`Initialized ObjectIdMap with id: ${startId}`);
    }
    
    // Initialize TicketDisplayIdMap
    const account_id = parseInt(process.env.ACCOUNT_ID) || 320932;
    const initialDisplayId = 7001;
    const existingMap = await TicketDisplayIdMap.findOne({ account_id }).select('next_display_id');
    const startDisplayId = existingMap ? Math.max(existingMap.next_display_id + 1, initialDisplayId) : initialDisplayId;
    if (!await TicketDisplayIdMap.findOne({ account_id })) {
      await new TicketDisplayIdMap({ account_id, next_display_id: startDisplayId }).save();
      console.log(`Initialized TicketDisplayIdMap with account_id: ${account_id}, next_display_id: ${startDisplayId}`);
    }

    console.log('Initialization complete');
  } catch (error) {
    console.error('Initialization error:', error);
  } finally {
    mongoose.disconnect();
  }
}

initializeIdMaps();