const mongoose = require('mongoose');

const ObjectIdMapSchema = new mongoose.Schema({
  id: { type: Number, required: true },
});

ObjectIdMapSchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model('ObjectIdMap', ObjectIdMapSchema);