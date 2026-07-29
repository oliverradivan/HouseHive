import api from "./client.js";

export function listHouseExpenses(houseId) {
  return api.get(`/api/v1/houses/${encodeURIComponent(houseId)}/expenses`);
}

export function createHouseExpense(houseId, expenseData) {
  return api.post(`/api/v1/houses/${encodeURIComponent(houseId)}/expenses`, expenseData);
}

export function deleteHouseExpense(houseId, expenseId) {
  return api.delete(
    `/api/v1/houses/${encodeURIComponent(houseId)}/expenses/${encodeURIComponent(expenseId)}`
  );
}

export function listHouseBalances(houseId) {
  return api.get(`/api/v1/houses/${encodeURIComponent(houseId)}/balances`);
}

export function listHouseDebts(houseId) {
  return api.get(`/api/v1/houses/${encodeURIComponent(houseId)}/debts`);
}

export function listHouseSettlements(houseId) {
  return api.get(`/api/v1/houses/${encodeURIComponent(houseId)}/settlements`);
}

export function createHouseSettlement(houseId, settlementData) {
  return api.post(`/api/v1/houses/${encodeURIComponent(houseId)}/settlements`, settlementData);
}
