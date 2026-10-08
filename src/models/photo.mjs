import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true },
    // Copie de l'événement de l'album pour vérifier les droits sans passer par l'album
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: [true, "L'URL de la photo est obligatoire"] },
    caption: { type: String, maxlength: 500 }
  },
  { timestamps: true, collection: 'photos' }
);

export default Schema;
