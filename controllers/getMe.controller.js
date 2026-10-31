const { getMe } = require("../services/me.service");
const {AppError} = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
  /**
   * GET /auth/me
   */
  const getMeController = catchAsync(async (req, res) => {
   
    if (!req.user || !req.user.id) {
      throw new AppError("Not logged in", 401, "UNAUTHORIZED");
    }
    const { id, role } = req.user;

    const { user } = await getMe({
      userId: id,
      role,
    });
    return res.status(200).json({
      success: true,
      user,
    });
  });



module.exports = {
  getMeController,
};