const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conditionSchema = new Schema({
  resource_type: { type: String, required: true },
  field_name: { type: String, required: true },
  operator: { type: String, required: true },
  value: { type: Schema.Types.Mixed },
  nested_fields: { type: Schema.Types.Mixed },
});

const skillSchema = new Schema({
  name: { type: String, required: true },
  rank: { type: Number },
  associated_agents: [{ type: String }], // Changed from ObjectId
  match_type: { type: String, enum: ['all', 'any'] },
  conditions: [conditionSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Skill', skillSchema);