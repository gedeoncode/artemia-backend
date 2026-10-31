// services/reviewAnalyticsService.js
const mongoose = require('mongoose');
const DashboardOptimizer = require('./dashboardOptimizer.service');
const ProductReview = require('../../../models/ProductReview.model');

class ReviewAnalyticsService {
  /**
   * OPTIMIZED: Get review stats with proper projections
   */
  static async getReviewStats(sellerId, dateFilter) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          averageRating: { $round: ['$averageRating', 2] },
          totalReviews: 1,
          fiveStar: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 5] } } } },
          fourStar: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 4] } } } },
          threeStar: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 3] } } } },
          twoStar: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 2] } } } },
          oneStar: { $size: { $filter: { input: '$ratingDistribution', cond: { $eq: ['$$this', 1] } } } }
        }
      }
    ];
    
    const [stats, recentReviews] = await Promise.all([
      DashboardOptimizer.runSafeAggregation(ProductReview, pipeline),
      ProductReview.find({ seller: sellerId, ...dateFilter })
        .select('rating comment createdAt') // Select only needed fields
        .populate('user', 'name') // Only get name from user
        .populate('product', 'name') // Only get name from product
        .sort({ createdAt: -1 })
        .lean() // Use lean() for performance
        .limit(5)
        .exec()
    ]);
    
    const reviewStats = stats[0] || {};
    
    return {
      averageRating: reviewStats.averageRating || 0,
      totalReviews: reviewStats.totalReviews || 0,
      ratingDistribution: {
        5: reviewStats.fiveStar || 0,
        4: reviewStats.fourStar || 0,
        3: reviewStats.threeStar || 0,
        2: reviewStats.twoStar || 0,
        1: reviewStats.oneStar || 0
      },
      recentReviews
    };
  }
}

module.exports = ReviewAnalyticsService;