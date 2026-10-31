const { AppError } = require("../../utils/AppError");

module.exports = (req, res, next) => {
if (req.user.signupIntent !== "BECOME_SELLER") {
  return next(new AppError("Seller access required", 403, "FORBIDDEN"));
}
  next();
};
