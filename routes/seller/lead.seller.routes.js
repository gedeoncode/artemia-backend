const express = require("express");
const router = express.Router();

// Controllers

const { getSellerLeads,getSellerLeadById,updateLead } = require("../../controllers/seller/lead.seller.controller");

// Middlewares
const protect = require("../../middlewares/protect");
const { requireSeller } = require("../../middlewares/seller.middleware");

const sellerGuard = [protect(), requireSeller];

// GET /leads
router.get("/", sellerGuard, getSellerLeads);
router.get("/:id", sellerGuard, getSellerLeadById);
router.patch("/:id", sellerGuard, updateLead);


module.exports = router;
