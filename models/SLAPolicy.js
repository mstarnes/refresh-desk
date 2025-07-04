const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const slaTargetSchema = new Schema({
  respond_within: { type: Number },
  resolve_within: { type: Number },
  business_hours: { type: Boolean },
  escalation_enabled: { type: Boolean },
});

const slaPolicySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  active: { type: Boolean, default: true },
  sla_target: {
    priority_1: slaTargetSchema,
    priority_2: slaTargetSchema,
    priority_3: slaTargetSchema,
    priority_4: slaTargetSchema,
  },
  applicable_to: { type: Schema.Types.Mixed },
  is_default: { type: Boolean, default: false },
  position: { type: Number },
  escalation: { type: Schema.Types.Mixed },
  group_ids: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SLAPolicy', slaPolicySchema);