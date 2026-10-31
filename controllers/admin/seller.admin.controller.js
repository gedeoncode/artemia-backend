const Seller = require("../../models/Seller.model");
const Document = require("../../models/Document");
const {AppError} = require("../../utils/AppError");
const Product = require("../../models/Product.model");

const User = require("../../models/User.model");

exports.getAllSellers = async (req, res, next) => {
  try {
    console.log("Query:", req.query)
    // =========================
    // Query Params
    // =========================
    const {
      page = 1,
      limit = 10,
      status,
      commissionModel,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // =========================
    // Filters
    // =========================
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (commissionModel) {
      filter.commissionModel = commissionModel;
    }

    // =========================
    // Search
    // =========================
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { businessAddress: { $regex: search, $options: "i" } },
      ];
    }

    // =========================
    // Pagination
    // =========================
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * pageSize;

    // =========================
    // Sorting
    // =========================
    const sortOptions = {
      [sortBy]: order === "asc" ? 1 : -1,
    };

    // =========================
    // Execute Queries in Parallel
    // =========================
    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .select(
          "_id user businessName businessAddress commissionModel status createdAt"
        )
        .populate({
          path: "user",
          select:
            "_id firstName lastName email phone avatar role isBlocked isDeleted isEmailVerified fullName name",
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Seller.countDocuments(filter),
    ]);

    // =========================
    // Response
    // =========================
    return res.status(200).json({
      success: true,
      message: "Sellers fetched successfully",
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: pageNumber * pageSize < total,
        hasPrevPage: pageNumber > 1,
      },
      data: sellers,
    });
  } catch (err) {
    console.error("❌ Failed to fetch sellers:", err);

    return next(
      new AppError(
        err.message || "Failed to fetch sellers",
        err.statusCode || 500
      )
    );
  }
};

//======== get one seller =========//

exports.getSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id)
      .select(
        "_id user businessName businessAddress commissionModel status createdAt"
      )
      .populate({
        path: "user",
        select:
          "_id firstName lastName email phone avatar role isBlocked isDeleted isEmailVerified isPhoneVerified lastLoginAt",
      })
      .populate({
        path: "categories",
        select: "_id name",
      })
      .populate({
        path: "documents",
        select: "_id type status uploadedAt",
      })
      // ❌ products intentionally NOT populated by default
      .lean();

    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.status(200).json({
      success: true,
      data: seller,
    });
  } catch (error) {
    console.error("❌ Failed to fetch seller:", error);
    next(error);
  }
};

exports.approveSeller = async (req, res) => {
  const seller = await Seller.findByIdAndUpdate(
    req.params.id,
    { verificationStatus: "approved", reasonForRejection: "" },
    { new: true }
  );
  res.json({ message: "Seller approved", seller });
};

exports.rejectSeller = async (req, res) => {
  const { reason } = req.body;
  const seller = await Seller.findByIdAndUpdate(
    req.params.id,
    {
      verificationStatus: "rejected",
      reasonForRejection: reason || "No reason provided",
    },
    { new: true }
  );
  res.json({ message: "Seller rejected", seller });
};


exports.deleteSeller = async (req, res, next) => {
  try {
    // 1️⃣ Find seller
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    // 2️⃣ Soft-delete seller and cascade
    await seller.softDelete();

    // 3️⃣ Soft-disable linked user
    await User.findByIdAndUpdate(
      seller.user,
      { isBlocked: true, isDeleted: true },
      { validateBeforeSave: false }
    );

    // 4️⃣ Respond success
    res.status(200).json({
      success: true,
      message: "Seller account and related data soft-deleted successfully",
    });
  } catch (error) {
    console.error("❌ Failed to soft-delete seller:", error);
    next(error);
  }
};

// Update seller status


exports.updateSellerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return next(
        new APIError(
          `Invalid status value. Must be ${allowedStatuses.join(" or ")}`,
          400
        )
      );
    }

    // Update seller status and verification info
    const updatedSeller = await Seller.findByIdAndUpdate(
      id,
      {
        verificationStatus: status,
        // verificationDate: status === "approved" ? new Date() : null,
        isVerified: status === "approved",
        reasonForRejection: status === "rejected" ? req.body.reason || "" : "",
      },
      { new: true }
    )
      .populate({
        path: "user",
        select:
          "_id firstName lastName email phone avatar role isBlocked isDeleted isEmailVerified",
      })
      .lean();

    if (!updatedSeller) {
      return next(new APIError("Seller not found", 404));
    }

    return res.status(200).json({
      success: true,
      message: `Seller ${status} successfully`,
      data: updatedSeller,
    });
  } catch (error) {
    console.warn("❌ Failed to update seller status:", error);
    next(new APIError("Failed to update seller status", 500));
  }
};

// Get seller documents
exports.getSellerDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerDocuments = await Document.findOne({ sellerId: id })
    if (!sellerDocuments) {
      return next(new APIError("This seller doesn't have documents"));
    }

    return res.status(200).json({
      success: true,
      message: "Documents Fetched successful",
      sellerDocuments,
    });
  } catch (error) {
    next(new APIError(error));
  }
};

exports.blockSeller = async (req, res, next) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
        blockReason: req.body.reason || "Violation of terms",
        blockedAt: new Date(),
        status: "suspended", // optional: align business status
      },
      { new: true }
    )
      .populate({
        path: "user",
        select:
          "_id firstName lastName email phone avatar role isBlocked isDeleted isEmailVerified",
      })
      .lean();

    if (!seller) {
      return next(new APIError("Seller not found", 404));
    }

    // Optional: also block the User account
    await User.findByIdAndUpdate(
      seller.user._id,
      { isBlocked: true },
      { validateBeforeSave: false }
    );

    return res.status(200).json({
      success: true,
      message: "Seller blocked successfully",
      data: seller,
    });
  } catch (error) {
    console.error("❌ Failed to block seller:", error);
    next(new APIError("Failed to block seller", 500));
  }
};


exports.unblockSeller = async (req, res, next) => {
  try {
    const { id } = req.params;

    const seller = await Seller.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
        blockReason: "",
        blockedAt: null,
        status: "active", // optional: align business status
      },
      { new: true }
    )
      .populate({
        path: "user",
        select:
          "_id firstName lastName email phone avatar role isBlocked isDeleted isEmailVerified",
      })
      .lean();

    if (!seller) {
      return next(new APIError("Seller not found", 404));
    }

    // Optional: also unblock the User account
    await User.findByIdAndUpdate(
      seller.user._id,
      { isBlocked: false },
      { validateBeforeSave: false }
    );

    return res.status(200).json({
      success: true,
      message: "Seller unblocked successfully",
      data: seller,
    });
  } catch (error) {
    console.error("❌ Failed to unblock seller:", error);
    next(new APIError("Failed to unblock seller", 500));
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Validate seller exists and is not deleted
    const seller = await Seller.findById(id).lean();
    if (!seller || seller.isDeleted) {
      return res.status(404).json({ error: "Seller not found" });
    }

    // 2️⃣ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 3️⃣ Fetch products (only non-deleted)
    const products = await Product.find({ seller: id, isDeleted: false })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Product.countDocuments({
      seller: id,
      isDeleted: false,
    });

    // 4️⃣ Respond
    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: products,
    });
  } catch (error) {
    console.error("❌ Error fetching seller products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
