import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: [true, 'Le texte de la question est obligatoire'] },
  options: [{ text: { type: String, required: true } }]
});

QuestionSchema.path('options').validate((options) => options.length >= 2, 'Une question doit avoir au moins 2 réponses possibles');

const Schema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    title: { type: String, required: [true, 'Le titre est obligatoire'], trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [QuestionSchema]
  },
  { timestamps: true, collection: 'polls' }
);

Schema.path('questions').validate((questions) => questions.length >= 1, 'Un sondage doit avoir au moins une question');

export default Schema;
