const mongoose = require('mongoose');
const ObjectIdMap = require('../models/ObjectIdMap');
const TicketDisplayIdMap = require('../models/TicketDisplayIdMap');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

async function initializeIdMaps() {
  try {
    // Initialize ObjectIdMap with starting id
    const initialId = 9500000001; // Start after max id 9335552714
    const existingMax = await ObjectIdMap.findOne().sort({ id: -1 }).select('id');
    const startId = existingMax ? Math.max(existingMax.id + 1, initialId) : initialId;
    if (!await ObjectIdMap.findOne({ id: startId })) {
      await new ObjectIdMap({ id: startId }).save();
      console.log(`Initialized ObjectIdMap with id: ${startId}`);
    }

    // Initialize TicketDisplayIdMap (optional starting display_id)
    const initialDisplayId = 1000;
    const existingMaxDisplay = await TicketDisplayIdMap.findOne().sort({ display_id: -1 }).select('display_id');
    const startDisplayId = existingMaxDisplay ? existingMaxDisplay.display_id + 1 : initialDisplayId;
    if (!await TicketDisplayIdMap.findOne({ display_id: startDisplayId })) {
      await new TicketDisplayIdMap({ ticket_id: 0, display_id: startDisplayId, account_id: 320932 }).save();
      console.log(`Initialized TicketDisplayIdMap with display_id: ${startDisplayId}`);
    }

    console.log('Initialization complete');
  } catch (error) {
    console.error('Initialization error:', error);
  } finally {
    mongoose.disconnect();
  }
}

initializeIdMaps();