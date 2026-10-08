import mongoose from 'mongoose';

const Schema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }
  },
  { timestamps: true, collection: 'threads' }
);

// Lié à un groupe OU à un événement, pas les deux
Schema.pre('validate', function () {
  if ((this.group && this.event) || (!this.group && !this.event)) {
    this.invalidate('group', 'Un fil doit être lié soit à un groupe, soit à un événement');
  }
});

export default Schema;
