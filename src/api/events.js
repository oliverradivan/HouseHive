import api from "./client.js";

export function listHouseEvents(houseId) {
  return api.get("/api/v1/events", {
    params: { house_id: houseId },
  });
}

export function createEvent(eventData) {
  return api.post("/api/v1/events", eventData);
}
