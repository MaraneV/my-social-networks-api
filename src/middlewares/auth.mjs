import jwt from 'jsonwebtoken';

// Verifie le token JWT envoyé dans le header Authorization: Bearer <token>
const auth = (config) => (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: 'Token manquant' });
  }

  try {
    const payload = jwt.verify(header.split(' ')[1], config.jwtSecret);
    req.userId = payload.id;
    return next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'Token invalide ou expiré' });
  }
};

export default auth;
