# artemia-backend
the backend of artemia project

# Integration of logging system
For a robust enterprise system, the best approach is actually a hybrid:

AuditLog in MongoDB

Use for business-critical state changes (like product actions: delete, activate, archive).

Ensures transactional consistency with your database.

Queryable for compliance, reporting, or rollback investigation.

Winston/file logging

Use for security and operational events (login attempts, admin changes, suspicious activity).

Ship logs to ELK/Graylog/Splunk for real-time monitoring, alerts, and security audits.

Optional: Also log some business-critical events redundantly here for security traceability.

Practical example: combining both
// Product deletion (MongoDB transaction)
await bulkProductActionService(productIds, "delete", seller);

// Create DB audit logs (transactional)
await AuditLog.insertMany(auditRecords, { session });

// Create security log (file/Winston) for monitoring
logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
  action: "delete",
  sellerId: seller.id,
  productCount: productIds.length,
});

# Integration draft architecture for product creation.
Create product first via POST /products with status = draft.
Upload images using POST /products/:productId/images.
Publish only after validation via PATCH /products/:productId/publish.