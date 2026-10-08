// Renvoie une erreur propre au client (sans stack trace)
export function sendError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      code: 400,
      message: 'Bad Request',
      errors: Object.values(err.errors).map((e) => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ code: 400, message: 'Identifiant invalide' });
  }

  // Doublon sur un champ unique
  if (err.code === 11000) {
    return res.status(409).json({ code: 409, message: 'Cette ressource existe déjà' });
  }

  // JSON mal formé
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 400, message: 'JSON invalide' });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({ code: 500, message: 'Internal Server Error' });
}
