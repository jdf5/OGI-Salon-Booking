const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  services: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    duration: {
      type: Number,  // Duration in minutes
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'online'],
      default: 'cash'
    },
    transactionId: String
  },
  notes: {
    type: String,
    trim: true
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push'],
      required: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    scheduledFor: {
      type: Date,
      required: true
    }
  }],
  groupBooking: {
    isGroup: {
      type: Boolean,
      default: false
    },
    groupId: String,
    groupSize: Number
  }
}, {
  timestamps: true
});

// Calculate total duration of all services
appointmentSchema.virtual('totalDuration').get(function() {
  return this.services.reduce((total, service) => total + service.duration, 0);
});

// Calculate total price of all services
appointmentSchema.virtual('totalPrice').get(function() {
  return this.services.reduce((total, service) => total + service.price, 0);
});

// Method to check if appointment time slot is available
appointmentSchema.statics.isTimeSlotAvailable = async function(staffId, startTime, endTime, excludeAppointmentId = null) {
  const query = {
    staff: staffId,
    status: { $nin: ['cancelled', 'no-show'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointment = await this.findOne(query);
  return !conflictingAppointment;
};

// Method to generate reminders
appointmentSchema.methods.generateReminders = function() {
  const reminders = [];
  const reminderTimes = [24, 2, 1]; // Hours before appointment

  reminderTimes.forEach(hours => {
    const reminderTime = new Date(this.startTime);
    reminderTime.setHours(reminderTime.getHours() - hours);

    if (reminderTime > new Date()) {
      reminders.push({
        type: 'email',
        scheduledFor: reminderTime
      });
      reminders.push({
        type: 'sms',
        scheduledFor: reminderTime
      });
    }
  });

  this.reminders = reminders;
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment; 