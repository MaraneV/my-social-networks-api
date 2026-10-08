import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
    firstName: { type: String, required: [true, 'Le prénom est obligatoire'], trim: true },
    lastName: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide']
    },
    address: {
      street: { type: String, required: [true, 'La rue est obligatoire'] },
      zipCode: { type: String, required: [true, 'Le code postal est obligatoire'] },
      city: { type: String, required: [true, 'La ville est obligatoire'] },
      country: { type: String, required: [true, 'Le pays est obligatoire'] }
    },
    purchaseDate: { type: Date, default: Date.now }
  },
  { collection: 'tickets' }
);

// Un seul billet par email et par événement
Schema.index({ event: 1, email: 1 }, { unique: true });

export default Schema;
