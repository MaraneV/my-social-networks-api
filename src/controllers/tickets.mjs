import TicketTypeSchema from '../models/ticket-type.mjs';
import TicketSchema from '../models/ticket.mjs';
import EventSchema from '../models/event.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isOrganizer } from '../utils/permissions.mjs';

const Tickets = class Tickets {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.TicketTypeModel = connect.model('TicketType', TicketTypeSchema);
    this.TicketModel = connect.model('Ticket', TicketSchema);
    this.EventModel = connect.model('Event', EventSchema);

    this.run();
  }

  // La billetterie existe seulement pour un événement public
  hasTicketing(event) {
    return event && event.visibility === 'public' && event.hasTicketing;
  }

  // body : { name, price, quantity }
  createType() {
    this.app.post('/events/:id/ticket-types', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        if (!this.hasTicketing(event)) {
          return res.status(400).json({ code: 400, message: "La billetterie n'est pas activée pour cet événement" });
        }

        const { name, price, quantity } = req.body;
        const ticketType = await this.TicketTypeModel.create({ event: event._id, name, price, quantity });
        res.status(201).json(ticketType);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  // Route publique : pas besoin d'être connecté
  getTypes() {
    this.app.get('/events/:id/ticket-types', async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!this.hasTicketing(event)) return res.status(404).json({ code: 404, message: 'Billetterie introuvable' });

        const ticketTypes = await this.TicketTypeModel.find({ event: event._id });

        // Nombre de billets restants pour chaque type
        const result = [];
        for (const type of ticketTypes) {
          const sold = await this.TicketModel.countDocuments({ ticketType: type._id });
          result.push({ ...type.toObject(), remaining: type.quantity - sold });
        }

        res.status(200).json(result);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  // Route publique : une personne extérieure peut acheter un billet
  // body : { ticketTypeId, firstName, lastName, email, address: { street, zipCode, city, country } }
  buy() {
    this.app.post('/events/:id/tickets', async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!this.hasTicketing(event)) return res.status(404).json({ code: 404, message: 'Billetterie introuvable' });

        const { ticketTypeId, firstName, lastName, email, address } = req.body;
        if (typeof ticketTypeId !== 'string' || typeof email !== 'string') {
          return res.status(400).json({ code: 400, message: 'ticketTypeId et email sont obligatoires' });
        }

        const ticketType = await this.TicketTypeModel.findOne({ _id: ticketTypeId, event: event._id });
        if (!ticketType) return res.status(404).json({ code: 404, message: 'Type de billet introuvable' });

        // Quantité limitée
        const sold = await this.TicketModel.countDocuments({ ticketType: ticketType._id });
        if (sold >= ticketType.quantity) {
          return res.status(400).json({ code: 400, message: 'Plus de billets disponibles pour ce type' });
        }

        // Un seul billet par personne
        const existing = await this.TicketModel.findOne({ event: event._id, email: email.toLowerCase().trim() });
        if (existing) return res.status(409).json({ code: 409, message: 'Cette personne a déjà un billet pour cet événement' });

        const ticket = await this.TicketModel.create({
          event: event._id,
          ticketType: ticketType._id,
          firstName,
          lastName,
          email,
          address
        });

        res.status(201).json(ticket);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getAll() {
    this.app.get('/events/:id/tickets', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        const tickets = await this.TicketModel.find({ event: event._id }).populate('ticketType', 'name price');
        res.status(200).json(tickets);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.createType();
    this.getTypes();
    this.buy();
    this.getAll();
  }
};

export default Tickets;
