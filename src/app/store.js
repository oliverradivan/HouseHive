import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { setAccessToken } from "../api/client.js";

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
});

// Keep client.js's in-memory token in sync with Redux state,
// without client.js needing to import the store directly (avoids circular import).
let previousToken = null;
store.subscribe(() => {
    const currentToken = store.getState().auth.accessToken;
    if (currentToken !== previousToken) {
        previousToken = currentToken;
        setAccessToken(currentToken);
    }
});