
module.exports = {
  saveBasicInfo: require("./basicInfo.service").saveBasicInfo,
  saveAddress: require("./address.service").saveAddress,
  saveIdentity: require("./identity.service").saveIdentity,
  uploadDocuments: require("./documents.service").uploadDocuments,
  selectCommissionMode: require("./commission.service").selectCommissionMode,
  confirm: require("./confirmation.service").confirm,
  getDraft: require("./getDraft.service").getDraft,
  saveDraft: require("./saveDraft.service").saveDraft,
  getProgress: require("./getProgess.service").getProgress,
};
