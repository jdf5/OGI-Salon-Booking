const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameAr: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  descriptionAr: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['hair', 'nails', 'facial', 'massage', 'makeup', 'other']
  },
  duration: {
    type: Number,  // Duration in minutes
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  staff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  maxGroupSize: {
    type: Number,
    default: 1
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  popularity: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Method to update average rating
serviceSchema.methods.updateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    return;
  }

  const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
  this.averageRating = sum / this.reviews.length;
};

// Method to calculate final price with discount
serviceSchema.methods.getFinalPrice = function() {
  return this.price * (1 - this.discount / 100);
};

// Method to check if service is available for booking
serviceSchema.methods.isAvailable = function(date, staffId) {
  // Add business logic for availability checking
  return true;
};

// Static method to get popular services
serviceSchema.statics.getPopularServices = async function(limit = 5) {
  return this.find({ isActive: true })
    .sort({ popularity: -1, averageRating: -1 })
    .limit(limit);
};

// Static method to get services by category
serviceSchema.statics.getServicesByCategory = async function(category) {
  return this.find({ category, isActive: true })
    .sort({ popularity: -1 });
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 