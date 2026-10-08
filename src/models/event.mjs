import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 150 },
    description: { type: String, maxlength: 5000 },
    startDate: { type: Date, required: [true, 'La date de début est obligatoire'] },
    endDate: { type: Date, required: [true, 'La date de fin est obligatoire'] },
    location: { type: String, required: [true, 'Le lieu est obligatoire'], trim: true },
    coverPhoto: { type: String },
    visibility: {
      type: String,
      enum: { values: ['public', 'private'], message: 'La visibilité doit être public ou private' },
      default: 'public'
    },
    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    hasTicketing: { type: Boolean, default: false }
  },
  { timestamps: true, collection: 'events' }
);

Schema.path('organizers').validate((organizers) => organizers.length >= 1, "L'événement doit avoir au moins un organisateur");

// La date de fin doit etre apres la date de debut
Schema.pre('validate', function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'La date de fin doit être après la date de début');
  }
});

export default Schema;
