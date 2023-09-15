import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector, createSlice } from '@reduxjs/toolkit';

import type { BoardView } from 'lib/focalboard/boardView';
import { createBoardView } from 'lib/focalboard/boardView';

import { databaseViewsLoad, initialDatabaseLoad } from './databaseBlocksLoad';

import type { RootState } from './index';

/**
 * @loadedBoardViews is a map of boardIds for which we have loaded views
 */
type ViewsState = {
  views: { [key: string]: BoardView };
  loadedBoardViews: { [key: string]: boolean };
};

const viewsSlice = createSlice({
  name: 'views',
  initialState: { views: {}, loadedBoardViews: {} } as ViewsState,
  reducers: {
    addView: (state, action: PayloadAction<BoardView>) => {
      state.views[action.payload.id] = action.payload;
    },
    updateViews: (state, action: PayloadAction<BoardView[]>) => {
      for (const view of action.payload) {
        if (!view.deletedAt) {
          state.views[view.id] = view;
        } else {
          delete state.views[view.id];
        }
      }
    },
    updateView: (state, action: PayloadAction<BoardView>) => {
      state.views[action.payload.id] = action.payload;
    },
    deleteViews: (state, action: PayloadAction<Pick<BoardView, 'id'>[]>) => {
      action.payload.forEach((deletedView) => {
        delete state.views[deletedView.id];
      });
    }
  },
  extraReducers: (builder) => {
    builder.addCase(initialDatabaseLoad.fulfilled, (state, action) => {
      state.views = state.views ?? {};
      state.loadedBoardViews = state.loadedBoardViews ?? {};
      for (const block of action.payload) {
        if (block.type === 'view') {
          state.views[block.id] = block as BoardView;
          state.loadedBoardViews[block.rootId] = true;
        }
      }
    });

    builder.addCase(databaseViewsLoad.fulfilled, (state, action) => {
      state.views = state.views ?? {};
      state.loadedBoardViews = state.loadedBoardViews ?? {};
      for (const block of action.payload) {
        if (block.type === 'view') {
          state.views[block.id] = block as BoardView;
          state.loadedBoardViews[block.rootId] = true;
        }
      }
    });
  }
});

export const { updateViews, updateView, addView, deleteViews } = viewsSlice.actions;
export const { reducer } = viewsSlice;

export const getViews = (state: RootState): { [key: string]: BoardView } => state.views.views;
export const getSortedViews = createSelector(getViews, (views) => {
  return Object.values(views)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((v) => createBoardView(v));
});

export function getView(viewId: string | undefined): (state: RootState) => BoardView | null {
  return (state: RootState): BoardView | null => {
    return viewId ? state.views.views[viewId] ?? null : null;
  };
}

export function getLoadedBoardViews(): (state: RootState) => Record<string, boolean> {
  return (state: RootState): Record<string, boolean> => {
    return state.views.loadedBoardViews;
  };
}

export const getCurrentBoardViews = createSelector(
  (state: RootState) => state.boards.current,
  getViews,
  (
    boardId: string,
    views: {
      [key: string]: BoardView;
    }
  ) => {
    return Object.values(views)
      .filter((v) => v.parentId === boardId)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((v) => createBoardView(v));
  }
);
