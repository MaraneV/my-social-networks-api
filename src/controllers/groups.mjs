import GroupSchema from '../models/group.mjs';
import ThreadSchema from '../models/thread.mjs';
import MessageSchema from '../models/message.mjs';
import UserSchema from '../models/user.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isIn, isGroupAdmin, isGroupMember } from '../utils/permissions.mjs';

const Groups = class Groups {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.GroupModel = connect.model('Group', GroupSchema);
    this.ThreadModel = connect.model('Thread', ThreadSchema);
    this.MessageModel = connect.model('Message', MessageSchema);
    this.UserModel = connect.model('User', UserSchema);

    this.run();
  }

  create() {
    this.app.post('/groups', this.auth, async (req, res) => {
      try {
        const { name, description, icon, coverPhoto, type, allowMembersToPost, allowMembersToCreateEvents } = req.body;

        // Le créateur est admin et membre
        const group = await this.GroupModel.create({
          name,
          description,
          icon,
          coverPhoto,
          type,
          allowMembersToPost,
          allowMembersToCreateEvents,
          admins: [req.userId],
          members: [req.userId]
        });

        // Chaque groupe a son fil de discussion
        await this.ThreadModel.create({ group: group._id });

        res.status(201).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getAll() {
    this.app.get('/groups', this.auth, async (req, res) => {
      try {
        // Groupes publics et privés + groupes secrets dont on est membre
        const groups = await this.GroupModel.find({
          $or: [{ type: { $in: ['public', 'private'] } }, { members: req.userId }]
        }).select('name description icon coverPhoto type');

        res.status(200).json(groups);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getById() {
    this.app.get('/groups/:id', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);

        // Un groupe secret est invisible pour les non-membres
        if (!group || (group.type === 'secret' && !isGroupMember(group, req.userId))) {
          return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        }
        if (group.type === 'private' && !isGroupMember(group, req.userId)) {
          return res.status(403).json({ code: 403, message: 'Groupe privé : réservé aux membres' });
        }

        await group.populate('admins members', 'firstName lastName');
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  update() {
    this.app.put('/groups/:id', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (!isGroupAdmin(group, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });

        const fields = ['name', 'description', 'icon', 'coverPhoto', 'type', 'allowMembersToPost', 'allowMembersToCreateEvents'];
        fields.forEach((field) => {
          if (req.body[field] !== undefined) group[field] = req.body[field];
        });

        await group.save();
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  delete() {
    this.app.delete('/groups/:id', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (!isGroupAdmin(group, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });

        const thread = await this.ThreadModel.findOne({ group: group._id });
        if (thread) {
          await this.MessageModel.deleteMany({ thread: thread._id });
          await thread.deleteOne();
        }
        await group.deleteOne();

        res.status(200).json({ code: 200, message: 'Groupe supprimé' });
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  join() {
    this.app.post('/groups/:id/join', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group || group.type === 'secret') return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (group.type !== 'public') {
          return res.status(403).json({ code: 403, message: 'Seuls les groupes publics peuvent être rejoints librement' });
        }
        if (isGroupMember(group, req.userId)) return res.status(400).json({ code: 400, message: 'Vous êtes déjà membre' });

        group.members.push(req.userId);
        await group.save();
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addMember() {
    this.app.post('/groups/:id/members', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (!isGroupAdmin(group, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });

        const user = await this.UserModel.findById(req.body.userId);
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });
        if (isIn(group.members, user._id)) return res.status(400).json({ code: 400, message: 'Déjà membre du groupe' });

        group.members.push(user._id);
        await group.save();
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  removeMember() {
    this.app.delete('/groups/:id/members/:userId', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (!isGroupAdmin(group, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });

        group.members.pull(req.params.userId);
        group.admins.pull(req.params.userId);
        await group.save(); // erreur si plus aucun admin ou membre
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addAdmin() {
    this.app.post('/groups/:id/admins', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (!isGroupAdmin(group, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });

        if (!isIn(group.members, req.body.userId)) {
          return res.status(400).json({ code: 400, message: "L'utilisateur doit d'abord être membre du groupe" });
        }
        if (isIn(group.admins, req.body.userId)) return res.status(400).json({ code: 400, message: 'Déjà administrateur' });

        group.admins.push(req.body.userId);
        await group.save();
        res.status(200).json(group);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getThread() {
    this.app.get('/groups/:id/thread', this.auth, async (req, res) => {
      try {
        const group = await this.GroupModel.findById(req.params.id);
        if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });
        if (group.type !== 'public' && !isGroupMember(group, req.userId)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux membres' });
        }

        const thread = await this.ThreadModel.findOne({ group: group._id });
        res.status(200).json(thread);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.create();
    this.getAll();
    this.getById();
    this.update();
    this.delete();
    this.join();
    this.addMember();
    this.removeMember();
    this.addAdmin();
    this.getThread();
  }
};

export default Groups;
