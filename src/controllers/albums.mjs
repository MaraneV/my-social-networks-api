import AlbumSchema from '../models/album.mjs';
import PhotoSchema from '../models/photo.mjs';
import CommentSchema from '../models/comment.mjs';
import EventSchema from '../models/event.mjs';
import auth from '../middlewares/auth.mjs';
import { sendError } from '../utils/errors.mjs';
import { isEventMember, canSeeEvent } from '../utils/permissions.mjs';

const Albums = class Albums {
  constructor(app, connect, config) {
    this.app = app;
    this.auth = auth(config);
    this.AlbumModel = connect.model('Album', AlbumSchema);
    this.PhotoModel = connect.model('Photo', PhotoSchema);
    this.CommentModel = connect.model('Comment', CommentSchema);
    this.EventModel = connect.model('Event', EventSchema);

    this.run();
  }

  createAlbum() {
    this.app.post('/events/:id/album', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        // Un seul album par événement (index unique => erreur 409 si il existe déjà)
        const album = await this.AlbumModel.create({ event: event._id, name: req.body.name, createdBy: req.userId });
        res.status(201).json(album);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getAlbum() {
    this.app.get('/events/:id/album', this.auth, async (req, res) => {
      try {
        const event = await this.EventModel.findById(req.params.id);
        if (!event) return res.status(404).json({ code: 404, message: 'Événement introuvable' });
        if (!canSeeEvent(event, req.userId)) return res.status(403).json({ code: 403, message: 'Événement privé' });

        const album = await this.AlbumModel.findOne({ event: event._id });
        if (!album) return res.status(404).json({ code: 404, message: "Cet événement n'a pas d'album" });

        res.status(200).json(album);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addPhoto() {
    this.app.post('/albums/:id/photos', this.auth, async (req, res) => {
      try {
        const album = await this.AlbumModel.findById(req.params.id);
        if (!album) return res.status(404).json({ code: 404, message: 'Album introuvable' });

        const event = await this.EventModel.findById(album.event);
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        const photo = await this.PhotoModel.create({
          album: album._id,
          event: album.event, // on garde l'événement dans la photo
          author: req.userId,
          url: req.body.url,
          caption: req.body.caption
        });
        res.status(201).json(photo);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getPhotos() {
    this.app.get('/albums/:id/photos', this.auth, async (req, res) => {
      try {
        const album = await this.AlbumModel.findById(req.params.id);
        if (!album) return res.status(404).json({ code: 404, message: 'Album introuvable' });

        const event = await this.EventModel.findById(album.event);
        if (!canSeeEvent(event, req.userId)) return res.status(403).json({ code: 403, message: 'Événement privé' });

        const photos = await this.PhotoModel.find({ album: album._id }).populate('author', 'firstName lastName');
        res.status(200).json(photos);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  addComment() {
    this.app.post('/photos/:id/comments', this.auth, async (req, res) => {
      try {
        const photo = await this.PhotoModel.findById(req.params.id);
        if (!photo) return res.status(404).json({ code: 404, message: 'Photo introuvable' });

        // Grâce au champ event de la photo, pas besoin de passer par l'album
        const event = await this.EventModel.findById(photo.event);
        if (!isEventMember(event, req.userId)) return res.status(403).json({ code: 403, message: 'Réservé aux participants' });

        const comment = await this.CommentModel.create({ photo: photo._id, author: req.userId, content: req.body.content });
        res.status(201).json(comment);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  getComments() {
    this.app.get('/photos/:id/comments', this.auth, async (req, res) => {
      try {
        const photo = await this.PhotoModel.findById(req.params.id);
        if (!photo) return res.status(404).json({ code: 404, message: 'Photo introuvable' });

        const event = await this.EventModel.findById(photo.event);
        if (!canSeeEvent(event, req.userId)) return res.status(403).json({ code: 403, message: 'Événement privé' });

        const comments = await this.CommentModel.find({ photo: photo._id }).populate('author', 'firstName lastName');
        res.status(200).json(comments);
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  run() {
    this.createAlbum();
    this.getAlbum();
    this.addPhoto();
    this.getPhotos();
    this.addComment();
    this.getComments();
  }
};

export default Albums;
