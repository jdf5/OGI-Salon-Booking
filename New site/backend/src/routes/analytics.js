const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const moment = require('moment');

// Get appointment statistics
router.get('/appointments', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Total appointments
    const totalAppointments = await Appointment.countDocuments(query);

    // Appointments by status
    const appointmentsByStatus = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Appointments by service
    const appointmentsByService = await Appointment.aggregate([
      { $match: query },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.service',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$services.price' }
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' }
    ]);

    // Daily appointments
    const dailyAppointments = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Revenue statistics
    const revenueStats = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$payment.amount' },
          averageRevenue: { $avg: '$payment.amount' }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        totalAppointments,
        appointmentsByStatus,
        appointmentsByService,
        dailyAppointments,
        revenueStats: revenueStats[0] || { totalRevenue: 0, averageRevenue: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب إحصائيات المواعيد'
    });
  }
});

// Get customer statistics
router.get('/customers', async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    // New customers by month
    const newCustomersByMonth = await User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Customer loyalty tiers
    const customerTiers = await User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: '$rewards.tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top customers by appointments
    const topCustomers = await Appointment.aggregate([
      {
        $group: {
          _id: '$customer',
          appointmentCount: { $sum: 1 },
          totalSpent: { $sum: '$payment.amount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customerDetails'
        }
      },
      { $unwind: '$customerDetails' }
    ]);

    res.json({
      status: 'success',
      data: {
        totalCustomers,
        newCustomersByMonth,
        customerTiers,
        topCustomers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب إحصائيات العملاء'
    });
  }
});

// Get service performance
router.get('/services', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Service popularity and revenue
    const servicePerformance = await Appointment.aggregate([
      { $match: query },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.service',
          bookings: { $sum: 1 },
          revenue: { $sum: '$services.price' },
          averageRating: { $avg: '$services.rating' }
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },
      { $sort: { bookings: -1 } }
    ]);

    // Service category performance
    const categoryPerformance = await Service.aggregate([
      {
        $group: {
          _id: '$category',
          totalServices: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$averageRating' }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        servicePerformance,
        categoryPerformance
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب أداء الخدمات'
    });
  }
});

// Get staff performance
router.get('/staff', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Staff performance metrics
    const staffPerformance = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$staff',
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$payment.amount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staffDetails'
        }
      },
      { $unwind: '$staffDetails' }
    ]);

    // Staff availability
    const staffAvailability = await Appointment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            staff: '$staff',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } }
          },
          appointments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.staff',
          foreignField: '_id',
          as: 'staffDetails'
        }
      },
      { $unwind: '$staffDetails' }
    ]);

    res.json({
      status: 'success',
      data: {
        staffPerformance,
        staffAvailability
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب أداء الموظفين'
    });
  }
});

module.exports = router; 