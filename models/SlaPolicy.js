const mongoose = require('mongoose');

const SlaPolicySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: String,
  active: { type: Boolean, default: true },
  sla_target: {
    priority_1: { respond_within: { type: Number, required: true }, resolve_within: { type: Number, required: true }, business_hours: { type: Boolean, required: true }, escalation_enabled: { type: Boolean, required: true } },
    priority_2: { respond_within: { type: Number, required: true }, resolve_within: { type: Number, required: true }, business_hours: { type: Boolean, required: true }, escalation_enabled: { type: Boolean, required: true } },
    priority_3: { respond_within: { type: Number, required: true }, resolve_within: { type: Number, required: true }, business_hours: { type: Boolean, required: true }, escalation_enabled: { type: Boolean, required: true } },
    priority_4: { respond_within: { type: Number, required: true }, resolve_within: { type: Number, required: true }, business_hours: { type: Boolean, required: true }, escalation_enabled: { type: Boolean, required: true } },
  },
  group_ids: [Number], // Optional, per your note to ignore for now
  is_default: { type: Boolean, default: false },
  position: Number,
  created_at: Date,
  updated_at: Date,
});

SlaPolicySchema.index({ id: 1 }, { unique: true });

module.exports = mongoose.model('SlaPolicy', SlaPolicySchema);