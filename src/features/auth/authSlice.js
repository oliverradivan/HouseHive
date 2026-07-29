import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as authApi from "../../api/auth.js";
import { setAccessToken } from "../../api/client.js";

function extractErrorMessage(err) {
    return err.response?.data?.detail || err.message || "Something went wrong";
}

export const getMe = createAsyncThunk(
    "auth/getMe",
    async (_, { rejectWithValue }) => {
        try {
            const user = await authApi.getMe();
            return user;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const login = createAsyncThunk(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            const data = await authApi.login(credentials);
            // save token to local storage
            if (data?.tokens?.access_token) {
                setAccessToken(data.tokens.access_token);
            }
            return data; // { user, tokens }
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const register = createAsyncThunk(
    "auth/register",
    async (payload, { rejectWithValue }) => {
        try {
            const data = await authApi.register(payload);
            // save token to local storage
            if (data?.tokens?.access_token) {
                setAccessToken(data.tokens.access_token);
            }
            return data; // { user, tokens }
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const logout = createAsyncThunk(
    "auth/logout",
    async () => {
        try {
            await authApi.logout();
        } catch {
            // Local logout should still complete if the backend token is expired or already revoked.
        } finally {
            setAccessToken(null);
        }
        return null;
    }
);

const initialState = {
    user: null,
    accessToken: localStorage.getItem("token") || null,
    // ONLY set loading to true if a token actually exists to check! If no token exists, loading is false so the app instantly forces you to /login.
    loading: localStorage.getItem("token") ? true : false,
};

const authSlice = createSlice({
    name: "auth",
    initialState, // Use our clean dynamic initial state
    reducers: {},

    extraReducers: (builder) => {
        builder
            .addCase(getMe.fulfilled, (state, action) => {
                state.user = action.payload;
                state.loading = false;
            })
            .addCase(getMe.rejected, (state) => {
                state.user = null;
                state.accessToken = null;
                state.loading = false;
                setAccessToken(null);
            })
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.accessToken = action.payload.tokens.access_token;
                state.loading = false;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.accessToken = action.payload.tokens.access_token;
                state.loading = false;
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.accessToken = null;
                state.loading = false;
                setAccessToken(null);
            });
    }
});

export default authSlice.reducer;
