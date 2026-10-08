import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const Schema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'Le prénom est obligatoire'], trim: true, maxlength: 50 },
    lastName: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 50 },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide']
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: [8, 'Le mot de passe doit faire au moins 8 caractères'],
      select: false
    },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 }
  },
  { timestamps: true, collection: 'users' }
);

// Hash mdp
Schema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export default Schema;
