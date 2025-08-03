const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectIdMapSchema = new Schema({
  id: { type: Number, required: true }
});

ObjectIdMapSchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model('ObjectIdMap', ObjectIdMapSchema);