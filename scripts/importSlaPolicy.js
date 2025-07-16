const mongoose = require('mongoose');
const SlaPolicy = require('../models/SlaPolicy');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const slaPolicyData = [
  {
    id: 9000030757,
    name: 'Default SLA Policy',
    description: 'default policy',
    active: true,
    sla_target: {
      priority_1: { respond_within: 86400, resolve_within: 259200, business_hours: false, escalation_enabled: true },
      priority_2: { respond_within: 28800, resolve_within: 86400, business_hours: false, escalation_enabled: true },
      priority_3: { respond_within: 14400, resolve_within: 43200, business_hours: false, escalation_enabled: true },
      priority_4: { respond_within: 3600, resolve_within: 14400, business_hours: false, escalation_enabled: true },
    },
    is_default: true,
    position: 1,
    created_at: new Date('2016-01-13T03:50:50Z'),
    updated_at: new Date('2016-01-13T03:50:50Z'),
  },
];

async function importSlaPolicies() {
  try {
    // Drop the existing collection
    await SlaPolicy.collection.drop().catch(err => console.log('Collection does not exist, skipping drop:', err));
    
    // Insert new data
    await SlaPolicy.insertMany(slaPolicyData);
    console.log('SLA policies imported successfully');
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    mongoose.disconnect();
  }
}

importSlaPolicies();