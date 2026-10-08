import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 100 },
    description: { type: String, maxlength: 2000 },
    icon: { type: String },
    coverPhoto: { type: String },
    type: {
      type: String,
      enum: { values: ['public', 'private', 'secret'], message: 'Le type doit être public, private ou secret' },
      default: 'public'
    },
    allowMembersToPost: { type: Boolean, default: true },
    allowMembersToCreateEvents: { type: Boolean, default: false },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true, collection: 'groups' }
);

Schema.path('admins').validate((admins) => admins.length >= 1, 'Le groupe doit avoir au moins un administrateur');
Schema.path('members').validate((members) => members.length >= 1, 'Le groupe doit avoir au moins un membre');

export default Schema;
