const homepageService = require("../services/homePage/homepage.service");

class HomepageController {
  async getHomepage(req, res, next) {
    try {
      const homepage = await homepageService.getHomepage();

      return res.status(200).json({
        success: true,
        message: "Homepage data retrieved successfully.",
        data: homepage,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HomepageController();
