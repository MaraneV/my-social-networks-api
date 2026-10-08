import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: [true, 'Le commentaire est vide'], trim: true, maxlength: 1000 }
  },
  { timestamps: true, collection: 'comments' }
);

export default Schema;
