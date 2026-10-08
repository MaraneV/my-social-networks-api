import EventSchema from '../models/event.mjs';
import GroupSchema from '../models/group.mjs';
import UserSchema from '../models/user.mjs';
import ThreadSchema from '../models/thread.mjs';
import MessageSchema from '../models/message.mjs';
import AlbumSchema from '../models/album.mjs';
import PhotoSchema from '../models/photo.mjs';
import CommentSchema from '../models/comment.mjs';
import PollSchema from '../models/poll.mjs';
import PollAnswerSchema from '../models/poll-answer.mjs';
import TicketTypeSchema from '../models/ticket-type.mjs';
import TicketSchema from '../models/ticket.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isIn, isGroupAdmin, isGroupMember, isOrganizer, isEventMember, canSeeEvent } from '../utils/permissions.mjs';

const Events = class Events {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.EventModel = connect.model('Event', EventSchema);
    this.GroupModel = connect.model('Group', GroupSchema);
    this.UserModel = connect.model('User', UserSchema);
    this.ThreadModel = connect.model('Thread', ThreadSchema);
    this.MessageModel = connect.model('Message', MessageSchema);
    this.AlbumModel = connect.model('Album', AlbumSchema);
    this.PhotoModel = connect.model('Photo', PhotoSchema);
    this.CommentModel = connect.model('Comment', CommentSchema);
    this.PollModel = connect.model('Poll', PollSchema);
    this.PollAnswerModel = connect.model('PollAnswer', PollAnswerSchema);
    this.TicketTypeModel = connect.model('TicketType', TicketTypeSchema);
    this.TicketModel = connect.model('Ticket', TicketSchema);

    this.run();
  }

  create() {
    this.app.post('/events', this.auth, async (req, res) => {
      try {
        const { name, description, startDate, endDate, location, coverPhoto, visibility, hasTicketing, groupId, inviteAllMembers } =
          req.body;

        const event = new this.EventModel({
          name,
          description,
          startDate,
          endDate,
          location,
          coverPhoto,
          visibility,
          hasTicketing,
          organizers: [req.userId], // le créateur est organisateur
          participants: []
        });

        // evenement crée dans un groupe
        if (groupId) {
          const group = await this.GroupModel.findById(groupId);
          if (!group) return res.status(404).json({ code: 404, message: 'Groupe introuvable' });

          const allowed = isGroupAdmin(group, req.userId) || (isGroupMember(group, req.userId) && group.allowMembersToCreateEvents);
          if (!allowed) {
            return res.status(403).json({ code: 403, message: "Vous n'avez pas le droit de créer un événement dans ce groupe" });
          }

          event.group = group._id;

          // Invitation de tous les membres du groupe en un clic
          if (inviteAllMembers) {
            event.participants = group.members.filter((memberId) => !memberId.equals(req.userId));
          }
        }

        await event.save();

        // Chaque événement a son fil de discussion
        await this.ThreadModel.create({ event: event._id });

        res.status(201).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getAll() {
    this.app.get('/events', this.auth, async (req, res) => {
      try {
        // Événements publics + ceux dont je suis organisateur ou participant
        const events = await this.EventModel.find({
          $or: [{ visibility: 'public' }, { organizers: req.userId }, { participants: req.userId }]
        }).sort({ startDate: 1 });

        res.status(200).json(events);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getById() {
    this.app.get('/events/:id', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!canSeeEvent(event, req.userId)) return res.status(403).json({ code: 403, message: 'Événement privé' });

        await event.populate('organizers participants', 'firstName lastName');
        res.status(200).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  update() {
    this.app.put('/events/:id', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        const fields = ['name', 'description', 'startDate', 'endDate', 'location', 'coverPhoto', 'visibility', 'hasTicketing'];
        fields.forEach((field) => {
          if (req.body[field] !== undefined) event[field] = req.body[field];
        });

        await event.save();
        res.status(200).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  delete() {
    this.app.delete('/events/:id', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        // On supprime aussi tout ce qui est lié à l'événement
        const thread = await this.ThreadModel.findOne({ event: event._id });
        if (thread) {
          await this.MessageModel.deleteMany({ thread: thread._id });
          await thread.deleteOne();
        }

        const photos = await this.PhotoModel.find({ event: event._id });
        await this.CommentModel.deleteMany({ photo: { $in: photos.map((photo) => photo._id) } });
        await this.PhotoModel.deleteMany({ event: event._id });
        await this.AlbumModel.deleteMany({ event: event._id });

        const polls = await this.PollModel.find({ event: event._id });
        await this.PollAnswerModel.deleteMany({ poll: { $in: polls.map((poll) => poll._id) } });
        await this.PollModel.deleteMany({ event: event._id });

        await this.TicketModel.deleteMany({ event: event._id });
        await this.TicketTypeModel.deleteMany({ event: event._id });

        await event.deleteOne();
        res.status(200).json({ code: 200, message: 'Événement supprimé' });
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  join() {
    this.app.post('/events/:id/join', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (event.visibility !== 'public') return res.status(403).json({ code: 403, message: 'Événement privé : il faut être invité' });
        if (isEventMember(event, req.userId)) return res.status(400).json({ code: 400, message: 'Vous participez déjà' });

        event.participants.push(req.userId);
        await event.save();
        res.status(200).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addParticipant() {
    this.app.post('/events/:id/participants', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        const user = await this.UserModel.findById(req.body.userId);
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });
        if (isEventMember(event, user._id)) return res.status(400).json({ code: 400, message: 'Cet utilisateur participe déjà' });

        event.participants.push(user._id);
        await event.save();
        res.status(200).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addOrganizer() {
    this.app.post('/events/:id/organizers', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        const user = await this.UserModel.findById(req.body.userId);
        if (!user) return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' });
        if (isIn(event.organizers, user._id)) return res.status(400).json({ code: 400, message: 'Déjà organisateur' });

        event.organizers.push(user._id);
        event.participants.pull(user._id); // il n'est plus simple participant
        await event.save();
        res.status(200).json(event);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getThread() {
    this.app.get('/events/:id/thread', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isEventMember(event, req.userId)) {
          return res.status(403).json({ code: 403, message: "Réservé aux membres de l'événement" });
        }

        const thread = await this.ThreadModel.findOne({ event: event._id });
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
    this.addParticipant();
    this.addOrganizer();
    this.getThread();
  }
};

export default Events;
