// validators/inputValidator.js
const validator = require("validator");
const disposableDomains = require("disposable-email-domains");
const { parsePhoneNumber } = require("libphonenumber-js");

// Configurable rules (load from env/config in enterprise setups)
const RULES = {
  name: { min: 2, max: 50 },
  email: { max: 254 },
  phone: { defaultRegion: "CD" },
  password: {
    minLength: 8,
    regex:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  },
};

// --- Field-specific validators ---
function validateName(name = "") {
  const errors = [];
  if (
    !validator.isLength(name, { min: RULES.name.min, max: RULES.name.max }) ||
    !validator.matches(name, /^[\p{L}\p{M}\s.'’-]+$/u)
  ) {
    errors.push(
      `Le nom doit contenir entre ${RULES.name.min} et ${RULES.name.max} caractères et ne doit pas contenir de caractères spéciaux.`
    );
  }
  return { isValid: errors.length === 0, errors };
}

function validateEmail(email = "") {
  const errors = [];
  if (!validator.isEmail(email) || email.length > RULES.email.max) {
    errors.push("Adresse e-mail invalide.");
  } else {
    try {
      const domain = email.split("@")[1]?.toLowerCase();
      if (domain && disposableDomains.includes(domain)) {
        errors.push("Les adresses e-mail jetables ne sont pas autorisées.");
      }
    } catch {
      errors.push("Adresse e-mail invalide.");
    }
  }
  return { isValid: errors.length === 0, errors };
}

function validatePhone(phone = "") {
  const errors = [];
  if (!phone) {
    errors.push("Le numéro de téléphone est requis.");
  } else {
    try {
      const phoneNumber = parsePhoneNumber(phone, RULES.phone.defaultRegion);
      if (!phoneNumber?.isValid()) {
        errors.push(
          "Le numéro de téléphone doit être valide et au format DRC."
        );
      }
    } catch {
      errors.push("Numéro de téléphone invalide.");
    }
  }
  return { isValid: errors.length === 0, errors };
}

function validatePassword(password = "") {
  const errors = [];
  if (
    !validator.isLength(password, { min: RULES.password.minLength }) ||
    !RULES.password.regex.test(password)
  ) {
    errors.push(
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
    );
  }
  return { isValid: errors.length === 0, errors };
}

// --- Combined validator ---
function validateInput({ email, phone, password }) {
  const errors = [];



  const emailCheck = validateEmail(email);
  if (!emailCheck.isValid) errors.push(...emailCheck.errors);

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.isValid) errors.push(...phoneCheck.errors);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) errors.push(...passwordCheck.errors);

  return { isValid: errors.length === 0, errors };
}

// Export everything
module.exports = {
  validateInput,
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
};
