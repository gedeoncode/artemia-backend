const mongoose = require("mongoose");
const DashboardOptimizer = require("../../../services/seller/analytics/dashboardOptimizer.service");
const Notification = require("../../../models/Notification.model")
const Order = require("../../../models/Order.model")
// =========================
// OPTIMIZED HELPER FUNCTIONS
// =========================

async function getPreviousPeriodStatsOptimized(sellerId, start, end) {
  const duration = end - start;
  const prevEnd = new Date(start);
  const prevStart = new Date(prevEnd);
  prevStart.setTime(prevStart.getTime() - duration);

  const dateFilter = {
    createdAt: { $gte: prevStart, $lte: prevEnd },
  };

  // Single aggregation for previous period stats
  const pipeline = [
    {
      $match: {
        seller: new mongoose.Types.ObjectId(sellerId),
        status: "completed",
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
      },
    },
  ];

  const results = await DashboardOptimizer.runSafeAggregation(Order, pipeline);
  const data = results[0] || {};

  return {
    totalRevenue: data.totalRevenue || 0,
    totalOrders: data.totalOrders || 0,
    avgOrderValue: data.avgOrderValue || 0,
  };
}

async function getRecentNotificationsOptimized(sellerId) {
  const pipeline = [
    {
      $match: {
        recipients: {
          $elemMatch: {
            userId: sellerId,
            userType: "Seller",
          },
        },
      },
    },
    {
      $addFields: {
        matchedRecipient: {
          $first: {
            $filter: {
              input: "$recipients",
              cond: {
                $and: [
                  { $eq: ["$$this.userId", sellerId] },
                  { $eq: ["$$this.userType", "Seller"] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $sort: {
        "matchedRecipient.read": 1,
        createdAt: -1,
      },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        title: 1,
        message: 1,
        type: 1,
        createdAt: 1,
        read: "$matchedRecipient.read",
        metadata: 1,
      },
    },
  ];

  return await DashboardOptimizer.runSafeAggregation(Notification, pipeline);
}

function buildTimeSeriesData(aggregatedData, startDate, endDate, interval) {
  // Convert aggregated data to map for O(1) lookup
  const dataMap = new Map();
  aggregatedData.forEach((item) => {
    dataMap.set(item._id, {
      revenue: item.revenue,
      orderCount: item.orderCount,
    });
  });

  // Generate time points with bounds checking
  const timePoints = DashboardOptimizer.generateTimePoints(
    startDate,
    endDate,
    interval,
    500,
  );

  // Build result without creating intermediate large arrays
  return timePoints.map((point) => ({
    label: point.label,
    revenue: dataMap.get(point.key)?.revenue || 0,
    orderCount: dataMap.get(point.key)?.orderCount || 0,
  }));
}

function buildChartDataOptimized(
  timeSeriesData,
  previousPeriodStats,
  categoryPerformance,
  topProducts,
  leadStats,
  performanceMetrics,
) {
  // Build charts efficiently without unnecessary object spreading
  const labels = timeSeriesData.map((d) => d.label);
  const revenueData = timeSeriesData.map((d) => d.revenue);
  const orderData = timeSeriesData.map((d) => d.orderCount);

  const chartData = {
    revenue: {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenueData,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    orders: {
      labels,
      datasets: [
        {
          label: "Orders",
          data: orderData,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    categoryDistribution: {
      labels: categoryPerformance.map((c) => c.categoryName || "Uncategorized"),
      datasets: [
        {
          data: categoryPerformance.map((c) => c.revenue),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
          ],
        },
      ],
    },
    topProducts: topProducts.map((p) => ({
      name: p.name,
      revenue: p.revenue,
      quantity: p.quantity,
      conversionRate: p.conversionRate,
    })),
    leadConversion: {
      labels: ["Total Leads", "Converted", "Phone", "WhatsApp"],
      datasets: [
        {
          label: "Lead Statistics",
          data: [
            leadStats.totalLeads,
            leadStats.convertedLeads,
            leadStats.phoneLeads,
            leadStats.whatsappLeads,
          ],
          backgroundColor: "rgba(153, 102, 255, 0.6)",
        },
      ],
    },
    performanceTrends: {
      revenue: performanceMetrics.revenueGrowth,
      orders: performanceMetrics.orderGrowth,
      conversion: performanceMetrics.conversionRateChange,
      customerRetention: performanceMetrics.customerRetention,
    },
  };

  // Add previous period data if available
  if (previousPeriodStats && timeSeriesData.length) {
    // This would require previous period time series data
    // For brevity, we'll skip or you can implement similarly
  }

  return chartData;
}

function calculatePerformanceMetricsOptimized(data) {
  const conversionRate =
    data.totalOrders > 0 && data.leadStats?.totalLeads > 0
      ? (data.completedOrders / data.leadStats.totalLeads) * 100
      : 0;

  const cancellationRate =
    data.totalOrders > 0 ? (data.cancelledOrders / data.totalOrders) * 100 : 0;

  let revenueGrowth = 0;
  let orderGrowth = 0;
  let conversionRateChange = 0;

  if (data.previousPeriodStats) {
    revenueGrowth =
      data.previousPeriodStats.totalRevenue > 0
        ? ((data.totalRevenue - data.previousPeriodStats.totalRevenue) /
            data.previousPeriodStats.totalRevenue) *
          100
        : 0;

    orderGrowth =
      data.previousPeriodStats.totalOrders > 0
        ? ((data.completedOrders - data.previousPeriodStats.totalOrders) /
            data.previousPeriodStats.totalOrders) *
          100
        : 0;

    const previousConversionRate =
      data.previousPeriodStats.totalOrders > 0 &&
      data.leadStats?.previousTotalLeads
        ? (data.previousPeriodStats.totalOrders /
            data.leadStats.previousTotalLeads) *
          100
        : 0;

    conversionRateChange = conversionRate - previousConversionRate;
  }

  const customerRetention =
    data.customerMetrics?.totalCustomers > 0
      ? (data.customerMetrics.returningCustomers /
          data.customerMetrics.totalCustomers) *
        100
      : 0;

  return {
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    cancellationRate: parseFloat(cancellationRate.toFixed(2)),
    revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
    orderGrowth: parseFloat(orderGrowth.toFixed(2)),
    conversionRateChange: parseFloat(conversionRateChange.toFixed(2)),
    customerRetention: parseFloat(customerRetention.toFixed(2)),
    avgOrderValue: data.avgOrderValue,
  };
}

function generateInsightsOptimized(metrics) {
  const insights = [];

  // Revenue insights
  if (metrics.performanceMetrics.revenueGrowth > 20) {
    insights.push({
      type: "positive",
      title: "Strong Revenue Growth",
      description: `Revenue has grown by ${metrics.performanceMetrics.revenueGrowth.toFixed(1)}% compared to previous period`,
      priority: "high",
    });
  } else if (metrics.performanceMetrics.revenueGrowth < -10) {
    insights.push({
      type: "warning",
      title: "Revenue Decline",
      description:
        "Revenue is decreasing. Consider reviewing your pricing strategy or marketing efforts.",
      priority: "high",
    });
  }

  // Inventory insights
  if (metrics.lowStockProducts && metrics.lowStockProducts.length > 5) {
    insights.push({
      type: "warning",
      title: "Inventory Alert",
      description: `${metrics.lowStockProducts.length} products are running low on stock. Reorder soon to avoid stockouts.`,
      priority: "high",
    });
  }

  // Lead conversion insights
  if (metrics.leadStats && metrics.leadStats.conversionRate < 10) {
    insights.push({
      type: "improvement",
      title: "Low Lead Conversion",
      description:
        "Lead to order conversion is below 10%. Consider optimizing your follow-up process.",
      priority: "medium",
    });
  } else if (metrics.leadStats && metrics.leadStats.conversionRate > 25) {
    insights.push({
      type: "positive",
      title: "Excellent Conversion Rate",
      description: `Your conversion rate of ${metrics.leadStats.conversionRate.toFixed(1)}% is outstanding!`,
      priority: "low",
    });
  }

  // Top product insights
  if (metrics.topProducts && metrics.topProducts[0]) {
    insights.push({
      type: "opportunity",
      title: "Top Performer",
      description: `${metrics.topProducts[0].name} is your best-selling product. Consider running promotions on similar items.`,
      priority: "medium",
    });
  }

  // Customer insights
  if (
    metrics.customerMetrics &&
    metrics.customerMetrics.returningCustomers >
      metrics.customerMetrics.newCustomers
  ) {
    insights.push({
      type: "positive",
      title: "Strong Customer Loyalty",
      description:
        "Returning customers outnumber new customers, indicating strong brand loyalty.",
      priority: "low",
    });
  }

  return insights;
}

module.exports = {
  getPreviousPeriodStatsOptimized,
  getRecentNotificationsOptimized,
  buildTimeSeriesData,
  buildChartDataOptimized,
  calculatePerformanceMetricsOptimized,
  generateInsightsOptimized,
};
