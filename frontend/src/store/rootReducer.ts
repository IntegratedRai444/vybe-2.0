import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import editorReducer from "./slices/editorSlice";
import layoutReducer from "./slices/layoutSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  editor: editorReducer,
  layout: layoutReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
