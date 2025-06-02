const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Get customer rewards
router.get('/customer/:customerId', async (req, res) => {
  try {
    const customer = await User.findById(req.params.customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'العميل غير موجود'
      });
    }

    // Get customer's appointment history
    const appointments = await Appointment.find({
      customer: req.params.customerId,
      status: 'completed'
    }).sort({ startTime: -1 });

    // Calculate total spent
    const totalSpent = appointments.reduce((total, apt) => total + apt.payment.amount, 0);

    res.json({
      status: 'success',
      data: {
        rewards: customer.rewards,
        totalSpent,
        appointmentCount: appointments.length,
        recentAppointments: appointments.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب مكافآت العميل'
    });
  }
});

// Add points to customer
router.post('/points', async (req, res) => {
  try {
    const { customerId, points, reason } = req.body;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'العميل غير موجود'
      });
    }

    // Add points
    customer.rewards.points += points;
    customer.updateRewardsTier();

    // Add points history
    if (!customer.rewards.history) {
      customer.rewards.history = [];
    }

    customer.rewards.history.push({
      points,
      reason,
      date: new Date()
    });

    await customer.save();

    res.json({
      status: 'success',
      data: {
        rewards: customer.rewards
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إضافة النقاط'
    });
  }
});

// Redeem points for discount
router.post('/redeem', async (req, res) => {
  try {
    const { customerId, points, serviceId } = req.body;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'العميل غير موجود'
      });
    }

    // Check if customer has enough points
    if (customer.rewards.points < points) {
      return res.status(400).json({
        status: 'error',
        message: 'النقاط غير كافية'
      });
    }

    // Calculate discount based on points
    const discountPercentage = calculateDiscountPercentage(points, customer.rewards.tier);
    
    // Deduct points
    customer.rewards.points -= points;
    customer.updateRewardsTier();

    // Add redemption history
    if (!customer.rewards.redemptions) {
      customer.rewards.redemptions = [];
    }

    customer.rewards.redemptions.push({
      points,
      serviceId,
      discountPercentage,
      date: new Date()
    });

    await customer.save();

    res.json({
      status: 'success',
      data: {
        rewards: customer.rewards,
        discountPercentage
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء استبدال النقاط'
    });
  }
});

// Get rewards history
router.get('/history/:customerId', async (req, res) => {
  try {
    const customer = await User.findById(req.params.customerId);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'العميل غير موجود'
      });
    }

    res.json({
      status: 'success',
      data: {
        pointsHistory: customer.rewards.history || [],
        redemptions: customer.rewards.redemptions || []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب سجل المكافآت'
    });
  }
});

// Get rewards tiers and benefits
router.get('/tiers', async (req, res) => {
  try {
    const tiers = {
      bronze: {
        name: 'برونز',
        pointsRequired: 0,
        benefits: [
          'خصم 5% على جميع الخدمات',
          'تذكير مجاني بالمواعيد'
        ]
      },
      silver: {
        name: 'فضي',
        pointsRequired: 200,
        benefits: [
          'خصم 10% على جميع الخدمات',
          'تذكير مجاني بالمواعيد',
          'هدية في عيد الميلاد'
        ]
      },
      gold: {
        name: 'ذهبي',
        pointsRequired: 500,
        benefits: [
          'خصم 15% على جميع الخدمات',
          'تذكير مجاني بالمواعيد',
          'هدية في عيد الميلاد',
          'خدمة مجانية كل 5 زيارات'
        ]
      },
      platinum: {
        name: 'بلاتينيوم',
        pointsRequired: 1000,
        benefits: [
          'خصم 20% على جميع الخدمات',
          'تذكير مجاني بالمواعيد',
          'هدية في عيد الميلاد',
          'خدمة مجانية كل 3 زيارات',
          'دعوة لحدث خاص'
        ]
      }
    };

    res.json({
      status: 'success',
      data: {
        tiers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب مستويات المكافآت'
    });
  }
});

// Helper function to calculate discount percentage
function calculateDiscountPercentage(points, tier) {
  const baseDiscount = {
    bronze: 5,
    silver: 10,
    gold: 15,
    platinum: 20
  };

  const tierDiscount = baseDiscount[tier] || 5;
  const pointsMultiplier = Math.floor(points / 100);
  
  return Math.min(tierDiscount + pointsMultiplier, 50); // Maximum 50% discount
}

module.exports = router; 