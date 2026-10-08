import PollSchema from '../models/poll.mjs';
import PollAnswerSchema from '../models/poll-answer.mjs';
import EventSchema from '../models/event.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isOrganizer, isEventMember } from '../utils/permissions.mjs';

const Polls = class Polls {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.PollModel = connect.model('Poll', PollSchema);
    this.PollAnswerModel = connect.model('PollAnswer', PollAnswerSchema);
    this.EventModel = connect.model('Event', EventSchema);

    this.run();
  }

  // body : { title, questions: [ { text, options: ["choix 1", "choix 2"] } ] }
  create() {
    this.app.post('/events/:id/polls', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isOrganizer(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });

        const { title, questions } = req.body;
        if (!Array.isArray(questions)) {
          return res.status(400).json({ code: 400, message: 'questions doit être un tableau' });
        }

        const poll = await this.PollModel.create({
          event: event._id,
          title,
          createdBy: req.userId,
          questions: questions.map((q) => ({
            text: q.text,
            options: Array.isArray(q.options) ? q.options.map((option) => ({ text: option })) : []
          }))
        });

        res.status(201).json(poll);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getAll() {
    this.app.get('/events/:id/polls', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        const polls = await this.PollModel.find({ event: event._id });
        res.status(200).json(polls);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  // body : { answers: [ { questionId, optionId } ] } -> une seule réponse par question
  answer() {
    this.app.post('/polls/:id/answers', this.auth, async (req, res) => {
      try {
        const poll = await this.PollModel.findById(req.params.id);
        if (!poll) return res.status(404).json({ code: 404, message: 'Sondage introuvable' });

        const event = await this.EventModel.findById(poll.event);
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        const { answers } = req.body;
        if (!Array.isArray(answers) || answers.length !== poll.questions.length) {
          return res.status(400).json({ code: 400, message: 'Il faut répondre à chaque question (une réponse par question)' });
        }

        // Chaque question doit avoir exactement une réponse valide
        for (const question of poll.questions) {
          const found = answers.filter((a) => a && question._id.equals(a.questionId));
          if (found.length !== 1) {
            return res.status(400).json({ code: 400, message: `Une seule réponse attendue pour : ${question.text}` });
          }
          const optionExists = question.options.some((option) => option._id.equals(found[0].optionId));
          if (!optionExists) {
            return res.status(400).json({ code: 400, message: `Réponse invalide pour : ${question.text}` });
          }
        }

        const alreadyAnswered = await this.PollAnswerModel.findOne({ poll: poll._id, user: req.userId });
        if (alreadyAnswered) return res.status(409).json({ code: 409, message: 'Vous avez déjà répondu à ce sondage' });

        const pollAnswer = await this.PollAnswerModel.create({ poll: poll._id, user: req.userId, answers });
        res.status(201).json(pollAnswer);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  results() {
    this.app.get('/polls/:id/results', this.auth, async (req, res) => {
      try {
        const poll = await this.PollModel.findById(req.params.id);
        if (!poll) return res.status(404).json({ code: 404, message: 'Sondage introuvable' });

        const event = await this.EventModel.findById(poll.event);
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        const allAnswers = await this.PollAnswerModel.find({ poll: poll._id });

        // Nombre de votes pour chaque option
        const results = poll.questions.map((question) => ({
          question: question.text,
          options: question.options.map((option) => ({
            text: option.text,
            votes: allAnswers.filter((a) => a.answers.some((ans) => ans.optionId.equals(option._id))).length
          }))
        }));

        res.status(200).json({ title: poll.title, totalAnswers: allAnswers.length, results });
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.create();
    this.getAll();
    this.answer();
    this.results();
  }
};

export default Polls;
