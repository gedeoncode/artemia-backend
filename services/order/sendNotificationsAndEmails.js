const { notificationQueue } = require("../../queue/notification.queue");

const emailService = require("../email");
const Product = require("../../models/Product.model");
const Address = require("../../models/Address.model");

async function sendNotificationsAndEmails({
  newOrder,
  sellerProducts,
  sellerId,
  seller,
  userId,
  user,
  orderNumber,
  session,
  activeAdmins,
  customAddress,
  deliveryAddressId,
}) {
  try {
    await notificationQueue.add({
      notificationData: {
        recipients: [
          { userType: "Seller", userId: sellerId },
          ...activeAdmins.map((admin) => ({
            userType: "Admin",
            userId: admin._id,
          })),
        ],
        type: "NEW_ORDER",
        title: "New Order Received",
        message: `New order #${newOrder.orderNumber} from ${user.name}`,
        link: `/orders/${newOrder._id}`,
        relatedEntity: newOrder._id,
        relatedEntityType: "Order",
      },
    });

    const dbProducts = await Product.find({
      _id: { $in: sellerProducts.map((p) => p.product) },
    }).session(session);

    // Send email to customer
    await emailService.sendEmail({
      to: user.email,
      type: "ORDER_CONFIRMATION",
      data: {
        orderNumber,
        customerName: user.name,
        items: sellerProducts.map((p) => {
          const dbProduct = dbProducts.find(
            (prod) => prod._id.toString() === p.product.toString(),
          );
          return {
            product: p.product.toString(),
            name: dbProduct ? dbProduct.name : undefined,
            quantity: p.quantity,
            price: (p.pricing.effectivePriceMinor / 100).toFixed(2),
          };
        }),
        totalAmount: (newOrder.pricing.totalPriceMinor / 100).toFixed(2),
      },
      highPriority: true,
    });

    // Get address details for seller email
    const addressDetails = deliveryAddressId
      ? await Address.findOne({
          _id: deliveryAddressId,
          client: userId,
        }).session(session)
      : null;

    let phoneNumber = "N/A";
    if (customAddress?.phone) {
      phoneNumber = customAddress.phone;
    } else if (addressDetails?.phone) {
      phoneNumber = addressDetails.phone;
    }

    // Send email to seller
    await emailService.sendEmail({
      to: seller.user.email,
      type: "ORDER_CONFIRMATION_SELLER",
      data: {
        orderNumber,
        customerName: user.name,
        items: sellerProducts.map((p) => {
          const dbProduct = dbProducts.find(
            (prod) => prod._id.toString() === p.product.toString(),
          );
          return {
            product: p.product.toString(),
            name: dbProduct ? dbProduct.name : undefined,
            quantity: p.quantity,
            price: (p.pricing.effectivePriceMinor / 100).toFixed(2),
          };
        }),
        totalAmount: (newOrder.pricing.totalPriceMinor / 100).toFixed(2),
        sellerName: seller.user.name,
        phoneNumber,
        email: user.email || "N/A",
        address:
          customAddress ||
          (addressDetails
            ? {
                phone: addressDetails.phone,
                addressLine: addressDetails.neighborhood,
                city: addressDetails.city,
                notes: addressDetails.deliveryInstructions || "",
              }
            : {}),
      },
      highPriority: true,
    });
  } catch (error) {
    console.error("Failed to send notifications or emails:", error);
  }
}
module.exports = { sendNotificationsAndEmails };
