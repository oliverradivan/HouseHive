import api from "./client.js";

export function getUsers() {
  return api.get("/api/v1/users/");
}

export function followUser(username) {
  return api.post(`/api/v1/users/follow/${encodeURIComponent(username)}`);
}

export function getFriends() {
  return api.get("/api/v1/users/friends");
}

export function unfollowUser(username) {
  return api.post(`/api/v1/users/unfollow/${encodeURIComponent(username)}`);
}

export function getStats() {
  return api.get("/api/v1/users/stats");
}
