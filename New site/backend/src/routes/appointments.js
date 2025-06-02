const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const { validateAppointment } = require('../middleware/validation');
const { sendNotification } = require('../utils/notifications');

// Create new appointment
router.post('/', validateAppointment, async (req, res) => {
  try {
    const { customer, staff, services, startTime, notes, groupBooking } = req.body;

    // Calculate end time based on services duration
    const serviceDetails = await Service.find({
      _id: { $in: services.map(s => s.service) }
    });

    const totalDuration = serviceDetails.reduce((total, service) => {
      const serviceBooking = services.find(s => s.service.toString() === service._id.toString());
      return total + (serviceBooking.duration || service.duration);
    }, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

    // Check if time slot is available
    const isAvailable = await Appointment.isTimeSlotAvailable(staff, startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({
        status: 'error',
        message: 'هذا الموعد غير متاح'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      customer,
      staff,
      services,
      startTime,
      endTime,
      notes,
      groupBooking
    });

    // Generate reminders
    appointment.generateReminders();

    await appointment.save();

    // Send confirmation notification
    await sendNotification({
      type: 'appointment_confirmation',
      appointment,
      channels: ['email', 'sms']
    });

    res.status(201).json({
      status: 'success',
      data: {
        appointment
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إنشاء الموعد'
    });
  }
});

// Get appointments for a user (customer or staff)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, startDate, endDate } = req.query;

    const query = {
      $or: [
        { customer: userId },
        { staff: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const appointments = await Appointment.find(query)
      .populate('customer', 'name email phone')
      .populate('staff', 'name')
      .populate('services.service')
      .sort({ startTime: 1 });

    res.json({
      status: 'success',
      data: {
        appointments
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب المواعيد'
    });
  }
});

// Update appointment status
router.patch('/:appointmentId/status', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'الموعد غير موجود'
      });
    }

    appointment.status = status;
    await appointment.save();

    // Send status update notification
    await sendNotification({
      type: 'appointment_status_update',
      appointment,
      channels: ['email', 'sms']
    });

    res.json({
      status: 'success',
      data: {
        appointment
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء تحديث حالة الموعد'
    });
  }
});

// Cancel appointment
router.post('/:appointmentId/cancel', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: 'الموعد غير موجود'
      });
    }

    appointment.status = 'cancelled';
    appointment.notes = reason ? `${appointment.notes}\nسبب الإلغاء: ${reason}` : appointment.notes;
    await appointment.save();

    // Send cancellation notification
    await sendNotification({
      type: 'appointment_cancellation',
      appointment,
      channels: ['email', 'sms']
    });

    res.json({
      status: 'success',
      data: {
        appointment
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إلغاء الموعد'
    });
  }
});

// Get available time slots
router.get('/available-slots', async (req, res) => {
  try {
    const { staffId, date, serviceIds } = req.query;

    // Get services duration
    const services = await Service.find({
      _id: { $in: serviceIds }
    });

    const totalDuration = services.reduce((total, service) => total + service.duration, 0);

    // Get staff working hours
    const staff = await User.findById(staffId);
    const workingHours = staff.workingHours || {
      start: '09:00',
      end: '17:00'
    };

    // Get existing appointments
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      staff: staffId,
      startTime: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled', 'no-show'] }
    });

    // Calculate available slots
    const availableSlots = [];
    const slotDuration = 30; // 30 minutes slots
    const startTime = new Date(date);
    startTime.setHours(parseInt(workingHours.start.split(':')[0]), parseInt(workingHours.start.split(':')[1]));
    const endTime = new Date(date);
    endTime.setHours(parseInt(workingHours.end.split(':')[0]), parseInt(workingHours.end.split(':')[1]));

    while (startTime < endTime) {
      const slotEnd = new Date(startTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);

      if (slotEnd <= endTime) {
        const isAvailable = !appointments.some(apt => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return (startTime >= aptStart && startTime < aptEnd) ||
                 (slotEnd > aptStart && slotEnd <= aptEnd) ||
                 (startTime <= aptStart && slotEnd >= aptEnd);
        });

        if (isAvailable) {
          availableSlots.push(new Date(startTime));
        }
      }

      startTime.setMinutes(startTime.getMinutes() + slotDuration);
    }

    res.json({
      status: 'success',
      data: {
        availableSlots
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب المواعيد المتاحة'
    });
  }
});

module.exports = router; 