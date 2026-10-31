const { FREE_LISTING_END_DATE } = require("../../../../constants/env");

function isLaunchPromotionActive() {

 const endDate =
   new Date(
     FREE_LISTING_END_DATE
   );

 return new Date() < endDate;

}
module.exports = {
    isLaunchPromotionActive
}