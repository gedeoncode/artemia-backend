// services/orderAnalyticsService.js
const mongoose = require('mongoose');
const DashboardOptimizer = require('./dashboardOptimizer.service');
const Order = require('../../../models/Order.model');

class OrderAnalyticsService {
  /**
   * OPTIMIZED: Single aggregation for all order stats instead of 6 separate queries
   * This reduces MongoDB round trips and memory usage significantly
   */
  static async getOrderStats(sellerId, dateFilter) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          ...dateFilter
        }
      },
      {
        $facet: {
          // All orders count
          totalOrders: [{ $count: 'count' }],
          
          // Status breakdown
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          
          // Revenue for completed orders only
          revenueStats: [
            { $match: { status: 'completed' } },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$totalAmount' },
                avgOrderValue: { $avg: '$totalAmount' }
              }
            }
          ],
          
          // Time series data for both revenue and orders in one pass
          timeSeriesData: [
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  status: '$status'
                },
                revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } },
                orderCount: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: '$_id.date',
                revenue: { $sum: '$revenue' },
                orderCount: { $sum: '$orderCount' }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ];
    
    const results = await DashboardOptimizer.runSafeAggregation(Order, pipeline);
    const data = results[0] || {};
    
    // Extract counts safely
    const totalOrders = data.totalOrders[0]?.count || 0;
    const statusCounts = {
      pending: 0,
      completed: 0,
      cancelled: 0
    };
    
    data.statusBreakdown.forEach(item => {
      if (statusCounts.hasOwnProperty(item._id)) {
        statusCounts[item._id] = item.count;
      }
    });
    
    const revenueStats = data.revenueStats[0] || { totalRevenue: 0, avgOrderValue: 0 };
    
    return {
      totalOrders,
      pendingOrders: statusCounts.pending,
      completedOrders: statusCounts.completed,
      cancelledOrders: statusCounts.cancelled,
      totalRevenue: revenueStats.totalRevenue,
      avgOrderValue: revenueStats.avgOrderValue,
      timeSeriesData: data.timeSeriesData || []
    };
  }

  /**
   * OPTIMIZED: Get top products without $addToSet memory explosion
   * Uses $sum instead of storing arrays of order IDs
   */
  static async getTopProducts(sellerId, dateFilter, limit = 10) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          status: 'completed',
          ...dateFilter
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 } // Much more efficient than $addToSet + $size
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            { $project: { name: 1, price: 1, views: 1 } } // Only select needed fields
          ]
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          id: '$_id',
          name: '$product.name',
          price: '$product.price',
          revenue: 1,
          quantity: 1,
          orderCount: 1,
          conversionRate: {
            $multiply: [
              { $divide: ['$orderCount', { $ifNull: ['$product.views', 1] }] },
              100
            ]
          }
        }
      }
    ];
    
    return await DashboardOptimizer.runSafeAggregation(Order, pipeline);
  }

  /**
   * OPTIMIZED: Category performance without $addToSet
   */
  static async getCategoryPerformance(sellerId, dateFilter) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          status: 'completed',
          ...dateFilter
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            { $project: { category: 1 } }
          ]
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 } // Efficient counting without array storage
        }
      },
      {
        $project: {
          categoryName: '$_id',
          revenue: 1,
          quantity: 1,
          orderCount: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ];
    
    return await DashboardOptimizer.runSafeAggregation(Order, pipeline);
  }

  /**
   * OPTIMIZED: Get customer metrics in single aggregation
   */
  static async getCustomerMetrics(sellerId, dateFilter) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0] } }
        }
      },
      {
        $facet: {
          customerStats: [
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                returningCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
                avgLTV: { $avg: '$totalSpent' }
              }
            }
          ]
        }
      }
    ];
    
    const results = await DashboardOptimizer.runSafeAggregation(Order, pipeline);
    const stats = results[0]?.customerStats[0] || {};
    
    return {
      totalCustomers: stats.totalCustomers || 0,
      returningCustomers: stats.returningCustomers || 0,
      newCustomers: (stats.totalCustomers || 0) - (stats.returningCustomers || 0),
      avgCustomerLTV: stats.avgLTV || 0
    };
  }
}

module.exports = OrderAnalyticsService;