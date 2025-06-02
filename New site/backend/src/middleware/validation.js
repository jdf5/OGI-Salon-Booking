const Joi = require('joi');

const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(50)
      .messages({
        'string.empty': 'الاسم مطلوب',
        'string.min': 'الاسم يجب أن يكون على الأقل حرفين',
        'string.max': 'الاسم يجب أن لا يتجاوز 50 حرف'
      }),
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'البريد الإلكتروني مطلوب',
        'string.email': 'البريد الإلكتروني غير صالح'
      }),
    password: Joi.string().required().min(6)
      .messages({
        'string.empty': 'كلمة المرور مطلوبة',
        'string.min': 'كلمة المرور يجب أن تكون على الأقل 6 أحرف'
      }),
    phone: Joi.string().required().pattern(/^[0-9]{10}$/)
      .messages({
        'string.empty': 'رقم الهاتف مطلوب',
        'string.pattern.base': 'رقم الهاتف غير صالح'
      }),
    role: Joi.string().valid('customer', 'staff', 'admin')
      .messages({
        'any.only': 'الدور غير صالح'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'البريد الإلكتروني مطلوب',
        'string.email': 'البريد الإلكتروني غير صالح'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'كلمة المرور مطلوبة'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  next();
};

const validateAppointment = (req, res, next) => {
  const schema = Joi.object({
    customer: Joi.string().required()
      .messages({
        'string.empty': 'العميل مطلوب'
      }),
    staff: Joi.string().required()
      .messages({
        'string.empty': 'الموظف مطلوب'
      }),
    services: Joi.array().items(
      Joi.object({
        service: Joi.string().required(),
        duration: Joi.number().required().min(1),
        price: Joi.number().required().min(0)
      })
    ).min(1).required()
      .messages({
        'array.min': 'يجب اختيار خدمة واحدة على الأقل'
      }),
    startTime: Joi.date().required()
      .messages({
        'date.base': 'وقت البدء غير صالح'
      }),
    notes: Joi.string().allow('')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  next();
};

const validateService = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2)
      .messages({
        'string.empty': 'اسم الخدمة مطلوب',
        'string.min': 'اسم الخدمة يجب أن يكون على الأقل حرفين'
      }),
    nameAr: Joi.string().required().min(2)
      .messages({
        'string.empty': 'اسم الخدمة بالعربية مطلوب',
        'string.min': 'اسم الخدمة بالعربية يجب أن يكون على الأقل حرفين'
      }),
    description: Joi.string().required()
      .messages({
        'string.empty': 'وصف الخدمة مطلوب'
      }),
    descriptionAr: Joi.string().required()
      .messages({
        'string.empty': 'وصف الخدمة بالعربية مطلوب'
      }),
    category: Joi.string().required().valid('hair', 'nails', 'facial', 'massage', 'makeup', 'other')
      .messages({
        'string.empty': 'تصنيف الخدمة مطلوب',
        'any.only': 'تصنيف الخدمة غير صالح'
      }),
    duration: Joi.number().required().min(1)
      .messages({
        'number.base': 'مدة الخدمة يجب أن تكون رقماً',
        'number.min': 'مدة الخدمة يجب أن تكون على الأقل دقيقة واحدة'
      }),
    price: Joi.number().required().min(0)
      .messages({
        'number.base': 'سعر الخدمة يجب أن يكون رقماً',
        'number.min': 'سعر الخدمة يجب أن يكون 0 أو أكثر'
      }),
    image: Joi.string().required()
      .messages({
        'string.empty': 'صورة الخدمة مطلوبة'
      }),
    staff: Joi.array().items(Joi.string()),
    requirements: Joi.array().items(Joi.string()),
    maxGroupSize: Joi.number().min(1).default(1),
    discount: Joi.number().min(0).max(100).default(0)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateAppointment,
  validateService
}; 