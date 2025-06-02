const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { validateService } = require('../middleware/validation');

// Get all services
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { descriptionAr: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    if (sort === 'popular') {
      sortOption = { popularity: -1 };
    } else if (sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 };
    } else {
      sortOption = { name: 1 };
    }

    const services = await Service.find(query)
      .sort(sortOption)
      .populate('staff', 'name');

    res.json({
      status: 'success',
      data: {
        services
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب الخدمات'
    });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('staff', 'name')
      .populate('reviews.customer', 'name');

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'الخدمة غير موجودة'
      });
    }

    res.json({
      status: 'success',
      data: {
        service
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب الخدمة'
    });
  }
});

// Create new service
router.post('/', validateService, async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();

    res.status(201).json({
      status: 'success',
      data: {
        service
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إنشاء الخدمة'
    });
  }
});

// Update service
router.patch('/:id', validateService, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'الخدمة غير موجودة'
      });
    }

    res.json({
      status: 'success',
      data: {
        service
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء تحديث الخدمة'
    });
  }
});

// Delete service (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'الخدمة غير موجودة'
      });
    }

    res.json({
      status: 'success',
      message: 'تم حذف الخدمة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء حذف الخدمة'
    });
  }
});

// Add review to service
router.post('/:id/reviews', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'الخدمة غير موجودة'
      });
    }

    service.reviews.push({
      customer: req.user._id,
      rating,
      comment
    });

    service.updateAverageRating();
    await service.save();

    res.status(201).json({
      status: 'success',
      data: {
        service
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء إضافة التقييم'
    });
  }
});

// Get popular services
router.get('/popular', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const services = await Service.getPopularServices(parseInt(limit));

    res.json({
      status: 'success',
      data: {
        services
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب الخدمات الشائعة'
    });
  }
});

// Get services by category
router.get('/category/:category', async (req, res) => {
  try {
    const services = await Service.getServicesByCategory(req.params.category);

    res.json({
      status: 'success',
      data: {
        services
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء جلب الخدمات حسب التصنيف'
    });
  }
});

module.exports = router; 