import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
    price: { type: Number, required: [true, 'Le montant est obligatoire'], min: [0, 'Le montant ne peut pas être négatif'] },
    quantity: { type: Number, required: [true, 'La quantité est obligatoire'], min: [1, 'La quantité doit être au moins 1'] }
  },
  { timestamps: true, collection: 'tickettypes' }
);

export default Schema;
