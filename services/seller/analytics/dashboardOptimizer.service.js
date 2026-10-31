// services/dashboardOptimizer.js
const mongoose = require('mongoose');

class DashboardOptimizer {
  /**
   * Optimized date range with validation to prevent unbounded queries
   */
  static getOptimizedDateRange(month, year, maxDays = 90) {
    let start, end;
    
    if (month && year) {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59);
      
      // Validate range isn't too large
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        throw new Error(`Date range exceeds maximum of ${maxDays} days`);
      }
    } else {
      // Default to last 30 days, not 30 days from now (which is unbounded)
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - maxDays);
    }
    
    return { start, end };
  }

  /**
   * Safe aggregation with disk use for large datasets
   */
  static async runSafeAggregation(model, pipeline, options = {}) {
    const defaultOptions = {
      allowDiskUse: true,
      maxTimeMS: 30000, // 30 seconds timeout
      ...options
    };
    
    try {
      return await model.aggregate(pipeline, defaultOptions);
    } catch (err) {
      console.error('Aggregation failed:', err);
      throw err;
    }
  }

  /**
   * Optimized time series - prevents generating millions of points
   */
  static generateTimePoints(startDate, endDate, interval, maxPoints = 500) {
    const points = [];
    let current = new Date(startDate);
    const intervalMap = {
      hourly: { increment: () => current.setHours(current.getHours() + 1), format: (d) => d.toISOString().slice(0, 13) },
      daily: { increment: () => current.setDate(current.getDate() + 1), format: (d) => d.toISOString().slice(0, 10) },
      weekly: { increment: () => current.setDate(current.getDate() + 7), format: (d) => `W${this.getWeekNumber(d)}` },
      monthly: { increment: () => current.setMonth(current.getMonth() + 1), format: (d) => d.toISOString().slice(0, 7) }
    };
    
    const config = intervalMap[interval] || intervalMap.daily;
    let pointCount = 0;
    
    while (current <= endDate && pointCount < maxPoints) {
      const key = config.format(current);
      const label = interval === 'hourly' ? current.toLocaleString() : 
                    interval === 'daily' ? current.toLocaleDateString() :
                    interval === 'monthly' ? current.toLocaleString('default', { month: 'short', year: 'numeric' }) :
                    key;
      
      points.push({ key, label });
      config.increment();
      pointCount++;
    }
    
    return points;
  }

  static getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }
}

module.exports = DashboardOptimizer;