const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dayScheduleSchema = new Schema({
  start_time: { type: String },
  end_time: { type: String },
});

const businessHourSchema = new Schema({
  name: { type: String, required: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  is_default: { type: Boolean, default: false },
  description: { type: String },
  business_hours: {
    monday: dayScheduleSchema,
    tuesday: dayScheduleSchema,
    wednesday: dayScheduleSchema,
    thursday: dayScheduleSchema,
    friday: dayScheduleSchema,
    saturday: dayScheduleSchema,
    sunday: dayScheduleSchema,
  },
  time_zone: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BusinessHour', businessHourSchema);