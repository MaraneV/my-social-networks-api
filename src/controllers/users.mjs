import UserSchema from '../models/user.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';

const Users = class Users {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.UserModel = connect.model('User', UserSchema);

    this.run();
  }

  getMe() {
    this.app.get('/users/me', this.auth, async (req, res) => {
      try {
        const user = await this.UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });

        res.status(200).json(user);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  updateMe() {
    this.app.put('/users/me', this.auth, async (req, res) => {
      try {
        const user = await this.UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });

        const fields = ['firstName', 'lastName', 'avatar', 'bio'];
        fields.forEach((field) => {
          if (req.body[field] !== undefined) user[field] = req.body[field];
        });

        await user.save();
        res.status(200).json(user);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getUsers() {
    this.app.get('/users', this.auth, async (req, res) => {
      try {
        const users = await this.UserModel.find().select('firstName lastName avatar');
        res.status(200).json(users);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getUser() {
    this.app.get('/users/:id', this.auth, async (req, res) => {
      try {
        const user = await this.UserModel.findById(req.params.id).select('firstName lastName avatar bio');
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });

        res.status(200).json(user);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    // /users/me doit être déclaré avant /users/:id
    this.getMe();
    this.updateMe();
    this.getUsers();
    this.getUser();
  }
};

export default Users;
