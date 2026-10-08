// Vérifie si un id est dans une liste d'ids
export function isIn(list, userId) {
  return list.some((id) => id.equals(userId));
}

export function isGroupAdmin(group, userId) {
  return isIn(group.admins, userId);
}

export function isGroupMember(group, userId) {
  return isIn(group.members, userId);
}

export function isOrganizer(event, userId) {
  return isIn(event.organizers, userId);
}

// Membre d'un événement = organisateur ou participant
export function isEventMember(event, userId) {
  return isIn(event.organizers, userId) || isIn(event.participants, userId);
}

// Public : visible par tous, privé : seulement par ses membres
export function canSeeEvent(event, userId) {
  return event.visibility === 'public' || isEventMember(event, userId);
}
