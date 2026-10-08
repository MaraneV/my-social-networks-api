import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: [true, 'Le message est vide'], trim: true, maxlength: 2000 },
    // Message auquel on répond (null si ce n'est pas une réponse)
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }
  },
  { timestamps: true, collection: 'messages' }
);

export default Schema;
