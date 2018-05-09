/*
 *
 * Notes actions
 *
 */

import {
	TOGGLE_VERSE_TEXT,
	TOGGLE_ADD_VERSE_MENU,
	SET_PAGE_SIZE,
	SET_ACTIVE_CHILD,
	SET_ACTIVE_PAGE_DATA,
	TOGGLE_PAGE_SELECTOR,
	ADD_NOTE,
	ADD_HIGHLIGHT,
	GET_USER_NOTES,
	GET_CHAPTER_FOR_NOTE,
	ADD_BOOKMARK,
	UPDATE_NOTE,
	DELETE_NOTE,
	GET_USER_NOTEBOOK_DATA,
} from './constants';

export const getNotesForNotebook = (props) => ({
	type: GET_USER_NOTEBOOK_DATA,
	...props,
});

export const getNotes = (props) => ({
	type: GET_USER_NOTES,
	...props,
});

export const getChapterForNote = (props) => ({
	type: GET_CHAPTER_FOR_NOTE,
	...props,
});

export const deleteNote = (props) => ({
	type: DELETE_NOTE,
	...props,
});

export const updateNote = (props) => ({
	type: UPDATE_NOTE,
	...props,
});

export const addNote = (props) => ({
	type: ADD_NOTE,
	...props,
});

export const addBookmark = (data) => ({
	type: ADD_BOOKMARK,
	data,
});

export const addHighlight = (props) => ({
	type: ADD_HIGHLIGHT,
	...props,
});

export const setActiveChild = (child) => ({
	type: SET_ACTIVE_CHILD,
	child,
});

export const setActivePage = (props) => ({
	type: SET_ACTIVE_PAGE_DATA,
	...props,
});

export const setPageSize = (props) => ({
	type: SET_PAGE_SIZE,
	...props,
});

export const toggleVerseText = () => ({
	type: TOGGLE_VERSE_TEXT,
});

export const toggleAddVerseMenu = () => ({
	type: TOGGLE_ADD_VERSE_MENU,
});

export const togglePageSelector = () => ({
	type: TOGGLE_PAGE_SELECTOR,
});
