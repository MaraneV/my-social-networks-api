import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [
      {
        _id: false,
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        optionId: { type: mongoose.Schema.Types.ObjectId, required: true }
      }
    ]
  },
  { timestamps: true, collection: 'pollanswers' }
);

// Une seule réponse par utilisateur et par sondage
Schema.index({ poll: 1, user: 1 }, { unique: true });

export default Schema;
