// services/inventoryAnalyticsService.js
const mongoose = require('mongoose');
const DashboardOptimizer = require('./dashboardOptimizer.service');
const Product = require("../../../models/Product.model")
class InventoryAnalyticsService {
  /**
   * OPTIMIZED: Get all inventory metrics in parallel but with controlled concurrency
   */
  static async getInventoryMetrics(sellerId, lowStockThreshold = 5) {
    // Run queries in parallel but with Promise.allSettled for resilience
    const [productStats, lowStockProducts, highDemandLowStock] = await Promise.allSettled([
      // Total products count
      Product.countDocuments({ 
        seller: sellerId, 
        isDeleted: false 
      }).lean(),
      
      // Low stock products (only get count and limited sample)
      Product.find({
        seller: sellerId,
        isDeleted: false,
        stock: { $lte: lowStockThreshold }
      })
      .select('name stock price images') // Select only needed fields
      .lean() // Use lean() for plain objects
      .limit(10)
      .exec(),
      
      // High demand low stock products - optimized aggregation
      this.getHighDemandLowStockProducts(sellerId)
    ]);
    
    const totalProducts = productStats.status === 'fulfilled' ? productStats.value : 0;
    const lowStockProductsList = lowStockProducts.status === 'fulfilled' ? lowStockProducts.value : [];
    const highDemandItems = highDemandLowStock.status === 'fulfilled' ? highDemandLowStock.value : [];
    
    // Build alerts
    const alerts = [];
    
    const outOfStock = await Product.countDocuments({
      seller: sellerId,
      stock: 0,
      isDeleted: false
    }).lean();
    
    if (outOfStock > 0) {
      alerts.push({ type: 'out_of_stock', count: outOfStock, severity: 'high' });
    }
    
    const lowStockOnly = await Product.countDocuments({
      seller: sellerId,
      stock: { $gt: 0, $lte: lowStockThreshold },
      isDeleted: false
    }).lean();
    
    if (lowStockOnly > 0) {
      alerts.push({ type: 'low_stock', count: lowStockOnly, severity: 'medium' });
    }
    
    if (highDemandItems.length > 0) {
      alerts.push({
        type: 'high_demand_low_stock',
        products: highDemandItems,
        severity: 'high'
      });
    }
    
    return {
      totalProducts,
      lowStockProducts: lowStockProductsList,
      inventoryAlerts: alerts
    };
  }
  
  /**
   * OPTIMIZED: Get high demand low stock products without $addToSet
   */
  static async getHighDemandLowStockProducts(sellerId) {
    const pipeline = [
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          status: 'completed'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
          pipeline: [
            { 
              $match: { 
                stock: { $lte: 10 } // Filter early in lookup pipeline
              } 
            },
            { $project: { name: 1, stock: 1 } }
          ]
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $match: { product: { $ne: null } } }, // Remove products that don't match stock condition
      {
        $project: {
          name: '$product.name',
          stock: '$product.stock',
          soldLast30Days: '$totalSold'
        }
      }
    ];
    
    return await DashboardOptimizer.runSafeAggregation(Order, pipeline);
  }
}

module.exports = InventoryAnalyticsService;