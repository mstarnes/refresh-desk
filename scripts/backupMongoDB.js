// scripts/backupMongoDB.js
const mongoose = require('mongoose');
const fs = require('fs').promises;
const models = require('../models'); // Adjust path to import all models

async function backup() {
  await mongoose.connect('mongodb://localhost/refresh-desk', { useNewUrlParser: true, useUnifiedTopology: true });

  for (const modelName in models) {
    const Model = models[modelName];
    const data = await Model.find().lean();
    await fs.writeFile(`./backups/backup_${modelName}_${Date.now()}.json`, JSON.stringify(data, null, 2));
  }

  console.log('Backup complete');
  mongoose.disconnect();
}

backup().catch(err => console.error(err));