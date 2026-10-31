module.exports = {
  saveBasicInfo: require("./basic.info.controller").saveBasicInfo,
  saveAddress: require("./address.controller").saveAddress,
  saveIdentity: require("./identity.controller").saveIdentity,
  uploadDocuments: require("./documents.controller").uploadDocuments,
  selectCommissionMode: require("./select.mode.controller")
    .selectCommissionMode,
  confirmOnboarding: require("./confirmation.controller").confirmOnboarding,
  getDraft: require("./getDraft.controller").getDraft,
  saveDraft: require("./saveDraft.controller").saveDraft,
  getProgress: require("./getProgress.controller").getProgress,
};
