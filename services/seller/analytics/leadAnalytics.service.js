// services/leadAnalyticsService.js
const mongoose = require('mongoose');
const Lead = require('../../../models/Lead.model');

const DashboardOptimizer = require('./dashboardOptimizer.service');

class LeadAnalyticsService {
  /**
   * OPTIMIZED: Get all lead stats in single aggregation pipeline
   */
  static async getLeadStats(sellerId, dateFilter) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          ...dateFilter
        }
      },
      {
        $facet: {
          // Basic counts
          counts: [
            {
              $group: {
                _id: null,
                totalLeads: { $sum: 1 },
                phoneLeads: { $sum: { $cond: [{ $eq: ['$contactMethod', 'phone'] }, 1, 0] } },
                whatsappLeads: { $sum: { $cond: [{ $eq: ['$contactMethod', 'whatsapp'] }, 1, 0] } },
                convertedLeads: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }
              }
            }
          ],
          // Lead sources
          leadSources: [
            {
              $group: {
                _id: '$source',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Top converting products - optimized without $unwind on large arrays
          topConvertingProducts: [
            { $match: { status: 'converted' } },
            {
              $group: {
                _id: '$product',
                conversions: { $sum: 1 }
              }
            },
            { $sort: { conversions: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product',
                pipeline: [{ $project: { name: 1 } }]
              }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                productName: '$product.name',
                conversions: 1
              }
            }
          ]
        }
      }
    ];
    
    const results = await DashboardOptimizer.runSafeAggregation(Lead, pipeline);
    const data = results[0] || {};
    const counts = data.counts[0] || {};
    
    const totalLeads = counts.totalLeads || 0;
    const convertedLeads = counts.convertedLeads || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    return {
      totalLeads,
      phoneLeads: counts.phoneLeads || 0,
      whatsappLeads: counts.whatsappLeads || 0,
      convertedLeads,
      conversionRate,
      leadSources: data.leadSources || [],
      topConvertingProducts: data.topConvertingProducts || []
    };
  }
}

module.exports = LeadAnalyticsService;