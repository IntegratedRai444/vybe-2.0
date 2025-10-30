import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EditorState {
  activeFile: string | null;
  openFiles: string[];
  activeTab: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: number | null;
  error: string | null;
  viewState: 'editor' | 'split' | 'terminal';
  terminalHeight: number;
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
}

const initialState: EditorState = {
  activeFile: null,
  openFiles: [],
  activeTab: null,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  error: null,
  viewState: 'editor',
  terminalHeight: 200,
  sidebarWidth: 250,
  isSidebarCollapsed: false,
};

export const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setActiveFile: (state, action: PayloadAction<string>) => {
      state.activeFile = action.payload;
      if (action.payload && !state.openFiles.includes(action.payload)) {
        state.openFiles.push(action.payload);
      }
      state.activeTab = action.payload;
    },
    closeFile: (state, action: PayloadAction<string>) => {
      state.openFiles = state.openFiles.filter(file => file !== action.payload);
      if (state.activeFile === action.payload) {
        state.activeFile = state.openFiles[0] || null;
        state.activeTab = state.activeFile;
      }
    },
    setDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
    startSaving: (state) => {
      state.isSaving = true;
      state.error = null;
    },
    saveSuccess: (state) => {
      state.isSaving = false;
      state.isDirty = false;
      state.lastSaved = Date.now();
    },
    saveError: (state, action: PayloadAction<string>) => {
      state.isSaving = false;
      state.error = action.payload;
    },
    setViewState: (state, action: PayloadAction<EditorState['viewState']>) => {
      state.viewState = action.payload;
    },
    setTerminalHeight: (state, action: PayloadAction<number>) => {
      state.terminalHeight = action.payload;
    },
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
  },
});

export const {
  setActiveFile,
  closeFile,
  setDirty,
  startSaving,
  saveSuccess,
  saveError,
  setViewState,
  setTerminalHeight,
  setSidebarWidth,
  toggleSidebar,
} = editorSlice.actions;

export default editorSlice.reducer;
