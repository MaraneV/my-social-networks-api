import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, collection: 'albums' }
);

// Un seul album par événement
Schema.index({ event: 1 }, { unique: true });

export default Schema;
