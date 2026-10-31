const axios = require("axios")
const { MONEROO_SECRET_KEY, MONEROO_BASE_URL } = require("../constants/env");
const monerooClient = axios.create({
  baseURL: MONEROO_BASE_URL,
  headers: {
    Authorization: `Bearer ${MONEROO_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

module.exports = {
    monerooClient,
}
