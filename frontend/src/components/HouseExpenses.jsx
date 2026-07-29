import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Receipt, Trash2 } from "lucide-react";
import {
  createHouseExpense,
  createHouseSettlement,
  deleteHouseExpense,
  listHouseBalances,
  listHouseDebts,
  listHouseExpenses,
  listHouseSettlements,
} from "../api/expenses.js";

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ILS",
  }).format((cents || 0) / 100);
}

function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function shortId(id) {
  return id ? `${id.slice(0, 8)}...` : "Unknown member";
}

export default function HouseExpenses({ houseId, members = [] }) {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [debts, setDebts] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettlementKey, setSavingSettlementKey] = useState(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    amount: "",
    description: "",
  });

  async function loadExpenses() {
    setLoading(true);
    try {
      const [expenseRows, balanceRows, debtRows, settlementRows] = await Promise.all([
        listHouseExpenses(houseId),
        listHouseBalances(houseId),
        listHouseDebts(houseId),
        listHouseSettlements(houseId),
      ]);
      setExpenses(expenseRows);
      setBalances(balanceRows);
      setDebts(debtRows);
      setSettlements(settlementRows);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [expenseRows, balanceRows, debtRows, settlementRows] = await Promise.all([
          listHouseExpenses(houseId),
          listHouseBalances(houseId),
          listHouseDebts(houseId),
          listHouseSettlements(houseId),
        ]);
        if (active) {
          setExpenses(expenseRows);
          setBalances(balanceRows);
          setDebts(debtRows);
          setSettlements(settlementRows);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Could not load expenses.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [houseId]);

  const totalSpent = useMemo(
    () => expenses.reduce((total, expense) => total + expense.amount_cents, 0),
    [expenses]
  );

  const usernamesByMemberId = useMemo(() => {
    const names = new Map();

    const setName = (memberId, username) => {
      if (memberId && username) {
        names.set(memberId, username);
      }
    };

    members.forEach((member) => {
      const memberId = member.id || member.member_id;
      setName(memberId, member.user?.username || member.username);
    });

    expenses.forEach((expense) => {
      setName(expense.paid_by_member_id, expense.paid_by_username);
      expense.shares?.forEach((share) => {
        setName(share.member_id, share.username);
      });
    });

    balances.forEach((balance) => {
      setName(balance.member_id, balance.username);
    });

    debts.forEach((debt) => {
      setName(debt.from_member_id, debt.from_username);
      setName(debt.to_member_id, debt.to_username);
    });

    settlements.forEach((settlement) => {
      setName(settlement.from_member_id, settlement.from_username);
      setName(settlement.to_member_id, settlement.to_username);
    });

    return names;
  }, [balances, debts, expenses, members, settlements]);

  const getBalanceName = (memberId) => {
    const username = usernamesByMemberId.get(memberId);
    return username ? `@${username}` : shortId(memberId);
  };

  const getMemberName = (memberId, username) => (
    username ? `@${username}` : getBalanceName(memberId)
  );

  const formatDate = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const title = form.title.trim();
    const description = form.description.trim();
    const amount_cents = toCents(form.amount);

    if (!title || amount_cents <= 0) {
      setError("Enter an expense title and a positive amount.");
      return;
    }

    setSaving(true);
    try {
      await createHouseExpense(houseId, {
        title,
        description: description || null,
        amount_cents,
      });
      setForm({ title: "", amount: "", description: "" });
      setShowExpenseForm(false);
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.message || "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm("Delete this expense?")) {
      return;
    }

    setDeletingExpenseId(expenseId);
    setError("");
    try {
      await deleteHouseExpense(houseId, expenseId);
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete expense.");
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleRecordSettlement = async (debt) => {
    const settlementKey = `${debt.from_member_id}-${debt.to_member_id}`;
    setSavingSettlementKey(settlementKey);
    setError("");

    try {
      await createHouseSettlement(houseId, {
        from_member_id: debt.from_member_id,
        to_member_id: debt.to_member_id,
        amount_cents: debt.amount_cents,
        note: `Repayment from ${debt.from_username} to ${debt.to_username}`,
      });
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.message || "Unable to record repayment.");
    } finally {
      setSavingSettlementKey(null);
    }
  };

  return (
    <section className="house-panel house-expenses-panel">
      <div className="house-section-header">
        <div>
          <h2>Expenses</h2>
          <p className="house-section-subtitle">Track shared house costs split across all members.</p>
        </div>
        <span>{formatMoney(totalSpent)}</span>
      </div>

      <button
        type="button"
        className={`form-dropdown-toggle ${showExpenseForm ? "is-open" : ""}`}
        onClick={() => setShowExpenseForm((current) => !current)}
        aria-expanded={showExpenseForm}
        aria-controls="expense-form"
      >
        <span>
          <Receipt size={15} />
          Add expense
        </span>
        <ChevronDown className="form-dropdown-icon" size={17} />
      </button>

      {!showExpenseForm && error && <p className="house-error form-dropdown-error" role="alert">{error}</p>}

      {showExpenseForm && (
        <form id="expense-form" className="expense-form" onSubmit={handleSubmit}>
          <div className="expense-field">
            <label htmlFor="expense-title">Title</label>
            <input
              id="expense-title"
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="e.g. Groceries"
              maxLength={100}
              disabled={saving}
              required
            />
          </div>

          <div className="expense-field expense-amount-field">
            <label htmlFor="expense-amount">Amount</label>
            <input
              id="expense-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={updateField}
              placeholder="0.00"
              disabled={saving}
              required
            />
          </div>

          <div className="expense-field">
            <label htmlFor="expense-description">Description</label>
            <input
              id="expense-description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Optional note"
              disabled={saving}
            />
          </div>

          {error && <p className="house-error expense-error" role="alert">{error}</p>}

          <button type="submit" className="house-button" disabled={saving}>
            {saving ? "Adding..." : "Add expense"}
          </button>
        </form>
      )}

      <div className="expense-grid">
        <section className="expense-subsection">
          <div className="expense-subsection-header">
            <h3>Expense History</h3>
            <span>{expenses.length}</span>
          </div>

          {loading ? (
            <p className="house-empty">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="house-empty">No expenses yet.</p>
          ) : (
            <ul className="expense-list">
              {expenses.map((expense) => (
                <li key={expense.id} className="expense-row">
                  <div className="expense-icon">
                    <Receipt size={17} />
                  </div>
                  <div className="expense-copy">
                    <strong>{expense.title}</strong>
                    {expense.description && <p>{expense.description}</p>}
                    <span>
                      {formatMoney(expense.amount_cents)} split {expense.shares.length} way
                      {expense.shares.length === 1 ? "" : "s"}
                    </span>
                    <span>Paid by {getMemberName(expense.paid_by_member_id, expense.paid_by_username)}</span>
                  </div>
                  <button
                    type="button"
                    className="expense-delete-button"
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingExpenseId === expense.id}
                    aria-label={`Delete ${expense.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="expense-subsection">
          <div className="expense-subsection-header">
            <h3>Balances</h3>
            <span>{balances.length}</span>
          </div>

          {loading ? (
            <p className="house-empty">Loading balances...</p>
          ) : balances.length === 0 ? (
            <p className="house-empty">No balances yet.</p>
          ) : (
            <ul className="balance-list">
              {balances.map((balance) => (
                <li key={balance.member_id} className="balance-row">
                  <span>{getBalanceName(balance.member_id)}</span>
                  <strong className={balance.balance_cents >= 0 ? "balance-positive" : "balance-negative"}>
                    {formatMoney(balance.balance_cents)}
                  </strong>
                </li>
              ))}
            </ul>
          )}

          <div className="expense-subsection-header expense-debts-header">
            <h3>Who Owes Who</h3>
            <span>{debts.length}</span>
          </div>

          {loading ? (
            <p className="house-empty">Loading debts...</p>
          ) : debts.length === 0 ? (
            <p className="house-empty">Everyone is settled.</p>
          ) : (
            <ul className="debt-list">
              {debts.map((debt) => (
                <li key={`${debt.from_member_id}-${debt.to_member_id}`} className="debt-row">
                  <div className="debt-copy">
                    <strong>{getMemberName(debt.from_member_id, debt.from_username)}</strong>
                    <span>owes {getMemberName(debt.to_member_id, debt.to_username)}</span>
                  </div>
                  <div className="debt-actions">
                    <strong className="debt-amount">{formatMoney(debt.amount_cents)}</strong>
                    <button
                      type="button"
                      onClick={() => handleRecordSettlement(debt)}
                      disabled={savingSettlementKey === `${debt.from_member_id}-${debt.to_member_id}`}
                    >
                      {savingSettlementKey === `${debt.from_member_id}-${debt.to_member_id}` ? "Recording..." : "Record payment"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="expense-subsection-header expense-debts-header">
            <h3>Repayments</h3>
            <span>{settlements.length}</span>
          </div>

          {loading ? (
            <p className="house-empty">Loading repayments...</p>
          ) : settlements.length === 0 ? (
            <p className="house-empty">No repayments recorded.</p>
          ) : (
            <ul className="settlement-list">
              {settlements.map((settlement) => (
                <li key={settlement.id} className="settlement-row">
                  <div>
                    <strong>
                      {getMemberName(settlement.from_member_id, settlement.from_username)} paid{" "}
                      {getMemberName(settlement.to_member_id, settlement.to_username)}
                    </strong>
                    {settlement.note && <p>{settlement.note}</p>}
                    <span>{formatDate(settlement.settled_at)}</span>
                  </div>
                  <strong>{formatMoney(settlement.amount_cents)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
