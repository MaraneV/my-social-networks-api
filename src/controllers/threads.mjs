import ThreadSchema from '../models/thread.mjs';
import MessageSchema from '../models/message.mjs';
import GroupSchema from '../models/group.mjs';
import EventSchema from '../models/event.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isGroupAdmin, isGroupMember, isEventMember } from '../utils/permissions.mjs';

const Threads = class Threads {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.ThreadModel = connect.model('Thread', ThreadSchema);
    this.MessageModel = connect.model('Message', MessageSchema);
    this.GroupModel = connect.model('Group', GroupSchema);
    this.EventModel = connect.model('Event', EventSchema);

    this.run();
  }

  // Calcule les droits de l'utilisateur sur un fil
  async getRights(thread, userId) {
    if (thread.group) {
      const group = await this.GroupModel.findById(thread.group);
      const member = isGroupMember(group, userId);
      return {
        canRead: member || group.type === 'public',
        canPost: isGroupAdmin(group, userId) || (member && group.allowMembersToPost),
        canReply: member
      };
    }

    const event = await this.EventModel.findById(thread.event);
    const member = isEventMember(event, userId);
    return { canRead: member, canPost: member, canReply: member };
  }

  getMessages() {
    this.app.get('/threads/:id/messages', this.auth, async (req, res) => {
      try {
        const thread = await this.ThreadModel.findById(req.params.id);
        if (!thread) return res.status(404).json({ code: 404, message: 'Fil introuvable' });

        const rights = await this.getRights(thread, req.userId);
        if (!rights.canRead) return res.status(403).json({ code: 403, message: 'Accès refusé' });

        const messages = await this.MessageModel.find({ thread: thread._id })
          .populate('author', 'firstName lastName')
          .sort({ createdAt: 1 });

        res.status(200).json(messages);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  postMessage() {
    this.app.post('/threads/:id/messages', this.auth, async (req, res) => {
      try {
        const { content, replyTo } = req.body;

        const thread = await this.ThreadModel.findById(req.params.id);
        if (!thread) return res.status(404).json({ code: 404, message: 'Fil introuvable' });

        const rights = await this.getRights(thread, req.userId);

        if (replyTo) {
          if (!rights.canReply) return res.status(403).json({ code: 403, message: 'Seuls les membres peuvent répondre' });
          const parent = await this.MessageModel.findOne({ _id: replyTo, thread: thread._id });
          if (!parent) return res.status(404).json({ code: 404, message: 'Message auquel vous répondez introuvable' });
        } else if (!rights.canPost) {
          return res.status(403).json({ code: 403, message: "Vous n'avez pas le droit de publier dans ce fil" });
        }

        const message = await this.MessageModel.create({
          thread: thread._id,
          author: req.userId,
          content,
          replyTo: replyTo || null
        });

        res.status(201).json(message);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.getMessages();
    this.postMessage();
  }
};

export default Threads;
