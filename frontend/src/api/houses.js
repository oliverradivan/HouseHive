import api from './client.js'

export function listHouses() {
  return api.get('/api/v1/houses')
}

export function getHouse(house_Id) {
  return api.get(`/api/v1/houses/${encodeURIComponent(house_Id)}`)
}

export function listHouseMembers(house_Id) {
  return api.get('/api/v1/house-members', {
    params: { house_id: house_Id },
  })
}

export function createHouse(houseData) {
  return api.post('/api/v1/houses', houseData)
}

export function joinHouse(house_Id) {
  return api.post(`/api/v1/houses/${encodeURIComponent(house_Id)}/join`)
}
