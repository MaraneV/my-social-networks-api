import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserSchema from '../models/user.mjs';
import { sendError } from '../utils/errors.mjs';

const Auth = class Auth {
  constructor(app, connect, config) {
    this.app = app;
    this.config = config;
    this.UserModel = connect.model('User', UserSchema);

    this.run();
  }

  createToken(user) {
    return jwt.sign({ id: user._id }, this.config.jwtSecret, { expiresIn: this.config.jwtExpiresIn });
  }

  register() {
    this.app.post('/auth/register', async (req, res) => {
      try {
        const { firstName, lastName, email, password } = req.body;
        const user = await this.UserModel.create({ firstName, lastName, email, password });

        res.status(201).json({
          token: this.createToken(user),
          user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  login() {
    this.app.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        // empeche injection NoSQL
        if (typeof email !== 'string' || typeof password !== 'string') {
          return res.status(400).json({ code: 400, message: 'Email et mot de passe obligatoires' });
        }

        const user = await this.UserModel.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(401).json({ code: 401, message: 'Email ou mot de passe incorrect' });
        }

        res.status(200).json({
          token: this.createToken(user),
          user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.register();
    this.login();
  }
};

export default Auth;
