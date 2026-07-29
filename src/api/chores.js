import api from "./client.js";

export function listHouseChores(house_Id) {
  return api.get("/api/v1/chores", {
    params: { house_id: house_Id },
  });
}

export function createChore(choreData) {
  return api.post("/api/v1/chores", choreData);
}

export function updateChore(choreId, choreData) {
  return api.patch(`/api/v1/chores/${choreId}`, choreData);
}

export function deleteChore(choreId) {
  return api.delete(`/api/v1/chores/${choreId}`);
}

export function listChoreCompletions(choreId) {
  return api.get("/api/v1/chore-completions", {
    params: { chore_id: choreId },
  });
}

export function createChoreCompletion(choreId) {
  return api.post("/api/v1/chore-completions", {
    chore_id: choreId,
  });
}
