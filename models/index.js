const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const models = {};

// Read all files in the current directory (models/)
fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js')  // Include only .js files, skip index.js
  .forEach(file => {
    const modelPath = path.join(__dirname, file);
    const model = require(modelPath);
    
    // Derive model name from filename (e.g., User.js -> 'User')
    const modelName = file.replace('.js', '');
    
    // Add to models object
    models[modelName] = model;
  });

module.exports = models;