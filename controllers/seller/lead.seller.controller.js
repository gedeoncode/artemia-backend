const Lead = require("../../models/Lead.model");

exports.getSellerLeads = async (req, res) => {
  try {
    const sellerId = req.seller._id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const { status, contactMethod } = req.query;

    const filter = {
      seller: sellerId,
    };

    if (status) {
      filter.status = status;
    }

    if (contactMethod) {
      filter.contactMethod = contactMethod;
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate({
          path: "product",
          select: "name images prix stock",
        })
        .populate({
          path: "customer",
          select: "name email phone",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Lead.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching seller leads:", error);

    return res.status(500).json({
      message: "Failed to fetch seller leads",
    });
  }
};

exports.getSellerLeadById = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { id } = req.params;

    const [lead] = await Lead.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          seller: new mongoose.Types.ObjectId(sellerId),
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },

      {
        $unwind: "$product",
      },

      {
        $lookup: {
          from: "users",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },

      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          status: 1,
          contactMethod: 1,
          source: 1,
          notes: 1,
          estimatedSaleAmount: 1,
          createdAt: 1,
          updatedAt: 1,

          product: {
            _id: "$product._id",
            name: "$product.name",
            description: "$product.description",
            images: "$product.images",
            prix: "$product.prix",
            stock: "$product.stock",
          },

          customer: {
            _id: "$customer._id",
            name: "$customer.name",
            email: "$customer.email",
            phone: "$customer.phone",
          },
        },
      },
    ]);

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      data: lead,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);

    return res.status(500).json({
      message: "Failed to fetch lead",
    });
  }
};



exports.updateLead = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { id } = req.params;

    const {
      status,
      notes,
      estimatedSaleAmount,
    } = req.body;

    const updateData = {};

    // Status validation
    if (status !== undefined) {
      if (!LEAD_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      updateData.status = status;

      if (status === "converted") {
        updateData.convertedAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = String(notes).trim();
    }

    // Sale amount validation
    if (estimatedSaleAmount !== undefined) {
      const amount = Number(estimatedSaleAmount);

      if (Number.isNaN(amount) || amount < 0) {
        return res.status(400).json({
          message: "Invalid estimated sale amount",
        });
      }

      updateData.estimatedSaleAmount = amount;
    }

    const lead = await Lead.findOneAndUpdate(
      {
        _id: id,
        seller: sellerId,
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lead) {
      return res.status(404).json({
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Error updating lead:", error);

    return res.status(500).json({
      message: "Failed to update lead",
    });
  }
};