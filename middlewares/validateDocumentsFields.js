 export const validateDocumentFields = (req, res, next) => {
  const requiredFields = ['profilePhoto', 'idFront', 'idBack'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!req.files || !req.files[field] || req.files[field].length === 0) {
      missingFields.push(field);
    }
  }
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Veuillez télécharger tous les documents requis.',
      missing: missingFields,
      message: `Les documents suivants sont manquants : ${missingFields.join(', ')}.`
    });
  }
  next();
};

// module.exports= {validateDocumentFields}
