import 'whatwg-fetch';
import { takeLatest, call, all, put, fork } from 'redux-saga/effects';
import request from 'utils/request';
import some from 'lodash/some';
// import reduce from 'lodash/reduce';
import get from 'lodash/get';
// import uniqBy from 'lodash/uniqBy';
import uniqWith from 'lodash/uniqWith';
import {
	getNotesForChapter,
	getBookmarksForChapter,
} from 'containers/Notes/saga';
import { LOGIN_ERROR, USER_LOGGED_IN } from 'containers/Profile/constants';
import {
	getCountries,
	getLanguages,
	getTexts,
} from 'containers/TextSelection/saga';
import { ADD_BOOKMARK } from 'containers/Notes/constants';
// import filter from 'lodash/filter';
import {
	ADD_HIGHLIGHTS,
	LOAD_HIGHLIGHTS,
	GET_HIGHLIGHTS,
	GET_NOTES_HOMEPAGE,
	GET_COPYRIGHTS,
	INIT_APPLICATION,
	DELETE_HIGHLIGHTS,
	CREATE_USER_WITH_SOCIAL_ACCOUNT,
} from './constants';
import {
	ntCodes,
	otCodes,
	codes,
	// sortBySetSize,
} from './sagaUtils';
// import { fromJS } from 'immutable';
// import unionWith from 'lodash/unionWith';
// import { ADD_HIGHLIGHTS, LOAD_HIGHLIGHTS, GET_CHAPTER_TEXT, GET_HIGHLIGHTS, GET_BOOKS, GET_AUDIO, INIT_APPLICATION } from './constants';
// Todo: Use the env variable for the base of all the routes
export function* deleteHighlights({ ids, userId, bible, book, chapter }) {
	// console.log('ids', ids);
	// console.log('bible', bible);
	// console.log('userid', userId);
	const urls = ids.map(
		(id) =>
			`${process.env.BASE_API_ROUTE}/users/${userId}/highlights/${id}?key=${
				process.env.DBP_API_KEY
			}&v=4&pretty&project_id=${process.env.NOTES_PROJECT_ID}`,
	);
	const options = {
		method: 'DELETE',
	};
	try {
		const res = yield all(urls.map((url) => call(request, url, options)));
		// console.log(res);
		if (res.find((r) => r.success)) {
			yield fork(getHighlights, { bible, book, chapter, userId });
		}
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.error('There was an error deleting the highlights', err); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
}

export function* initApplication(props) {
	const languageISO = props.languageISO;
	// yield fork(getIpAddress);
	// Forking each of these sagas here on the init of the application so that they all run in parallel
	yield fork(getCountries);
	yield fork(getLanguages);
	yield fork(getTexts, { languageISO });
}

export function* getIpAddress() {
	try {
		const response = yield call(request, 'https://api.ipify.org?format=json');

		if (response) {
			// console.log('response', response);
			// const location = yield call(request, `${process.env.BASE_API_ROUTE}/users/geolocate?v=4&key=${process.env.DBP_API_KEY}&ip_address=${response.ip}`);
			// console.log('location', location);
		}
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.log('err', err); // eslint-disable-line no-console
		}
	}
}

export function* addBookmark(props) {
	// console.log('adding bookmark with props: ', props);
	const requestUrl = `${process.env.BASE_API_ROUTE}/users/${
		props.data.user_id
	}/bookmarks?key=${process.env.DBP_API_KEY}&v=4&pretty&project_id=${
		process.env.NOTES_PROJECT_ID
	}`;
	const formData = new FormData();

	// console.log(props.find((p) => p === 'reference'));
	Object.entries(props.data).forEach((item) => formData.set(item[0], item[1]));
	formData.append('tags', `reference::: ${props.data.reference}`);
	// formData.append('project_id', process.env.NOTES_PROJECT_ID);

	const options = {
		body: formData,
		method: 'POST',
	};
	// console.log('adding bookmark', addBookmark);
	try {
		const response = yield call(request, requestUrl, options);
		// console.log('user bookmark response', response);  // eslint-disable-line no-console
		if (response.success) {
			// do stuff
			// console.log('Success message: ', response.success);
			yield fork(getBookmarksForChapter, {
				userId: props.data.user_id,
				params: {
					bible_id: props.data.bible_id,
					book_id: props.data.book_id,
					chapter: props.data.chapter,
					limit: 150,
					page: 1,
				},
			});
		} else {
			// console.log('Other message that wasn\'t a success: ', response);
		}
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.error('There was an error saving the bookmark', err); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
}

export function* getBookMetadata({ bibleId }) {
	const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/${bibleId}/book?key=${
		process.env.DBP_API_KEY
	}&bucket=${process.env.DBP_BUCKET_ID}&v=4`;
	try {
		const response = yield call(request, reqUrl);
		const testaments = response.data.reduce(
			(a, c) => ({ ...a, [c.id]: c.book_testament }),
			{},
		);

		// console.log('res', res);
		yield put({ type: 'book_metadata', testaments });
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Caught in get book metadata request', error); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
}

export function* getHighlights({ bible, book, chapter, userId }) {
	const requestUrl = `${process.env.BASE_API_ROUTE}/users/${userId ||
		'no_user_id'}/highlights?key=${process.env.DBP_API_KEY}&v=4&project_id=${
		process.env.NOTES_PROJECT_ID
	}&bible_id=${bible}&book_id=${book}&chapter=${chapter}`;
	let highlights = [];

	// const options = {
	// 	method: 'GET',
	// 	headers: {
	// 		project_id: process.env.NOTES_PROJECT_ID,
	// 	},
	// };
	// console.log('fetch options', options);
	try {
		const response = yield call(request, requestUrl);
		// console.log('highlight get response', response);
		if (response) {
			highlights = response;
		}

		yield put({ type: LOAD_HIGHLIGHTS, highlights });
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Caught in highlights request', error); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
}

export function* addHighlight({
	bible,
	book,
	chapter,
	userId,
	verseStart,
	highlightStart,
	highlightedWords,
	color,
	reference,
}) {
	const requestUrl = `${
		process.env.BASE_API_ROUTE
	}/users/${userId}/highlights?key=${
		process.env.DBP_API_KEY
	}&v=4&bible_id=${bible}&book_id=${book}&chapter=${chapter}&project_id=${
		process.env.NOTES_PROJECT_ID
	}`;
	const formData = new FormData();
	// console.log('data for highlight { bible, book, chapter, userId, verseStart, highlightStart, highlightedWords, color }', { bible, book, chapter, userId, verseStart, highlightStart, highlightedWords, color });
	if (!userId || color === 'none') {
		return;
	}
	formData.append('book_id', book);
	formData.append('user_id', userId);
	formData.append('bible_id', bible);
	formData.append('chapter', chapter);
	formData.append('verse_start', verseStart);
	if (color !== 'none') {
		formData.append('highlighted_color', color);
	}
	formData.append('highlight_start', highlightStart);
	formData.append('highlighted_words', highlightedWords);
	formData.append('project_id', process.env.NOTES_PROJECT_ID);
	formData.append('reference', reference);

	const options = {
		method: 'POST',
		body: formData,
	};
	// console.log('add highlight data', { bible, book, chapter, userId, verseStart, highlightStart, highlightedWords });
	try {
		const response = yield call(request, requestUrl, options);
		// console.log('add highlight response', response);
		// Need to get the highlights here because they are not being returned
		if (response.success) {
			yield call(getHighlights, { bible, book, chapter, userId });
		} else if (response.error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error creating highlight', response.error); // eslint-disable-line no-console
			}
		}
		// yield put({ type: LOAD_HIGHLIGHTS, highlights });
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Caught in highlights request', error); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
}

export function* getBibleFromUrl({
	bibleId: oldBibleId,
	bookId: oldBookId,
	chapter,
	authenticated,
	userId,
	verse,
}) {
	// This function needs to return the data listed below
	// Books
	// Active or first chapter text
	// Active or first chapter audio
	// Bible name
	// Bible id
	// todo Use other methods combined with the ones below to validate the url before try to use it in saga
	const bibleId = oldBibleId.toUpperCase();
	const bookId = oldBookId.toUpperCase();
	const requestUrl = `${process.env.BASE_API_ROUTE}/bibles/${bibleId}?bucket=${
		process.env.DBP_BUCKET_ID
	}&key=${process.env.DBP_API_KEY}&v=4`;

	// Probably need to do stuff here to get the audio and text for this new bible
	try {
		const response = yield call(request, requestUrl);
		// let filesets;
		// if (!response.data.filesets) {
		// 	const bibleUrl = `${process.env.BASE_API_ROUTE}/bibles?bucket=${process.env.DBP_BUCKET_ID}&key=${process.env.DBP_API_KEY}&v=4&language_code=${response.data.iso}`;
		// 	const allBibles = yield call(request, bibleUrl);
		// 	// console.log('all bibles in language', allBibles);
		// 	const activeBible = allBibles.data.find((bible) => bible.abbr === bibleId) || {};
		// 	filesets = activeBible.filesets;
		// }
		// console.log('bible response', response);
		if (response.data && Object.keys(response.data).length) {
			// Creating new objects for each set of data needed to ensure I don't forget something
			// I probably will want to use 'yield all' for getting the audio and text so they can be run async
			const bible = response.data;
			const books = bible.books; // Need to ensure that I have the books here
			const textDirection =
				response.data.alphabet && response.data.alphabet.direction;
			// console.log('books', books);
			// console.log('response', response);

			let hasMatt = false;
			let activeBookIndex;
			// console.log('books in new bible', books);
			let activeBook = books.find((b, i) => {
				if (b.book_id === 'MAT') {
					activeBookIndex = i;
					hasMatt = true;
				} else if (b.book_id === bookId) {
					activeBookIndex = i;
				}
				return b.book_id === bookId;
			});
			// Not exactly sure why I am checking for an active book here
			let activeChapter = activeBook ? parseInt(chapter, 10) || 1 : 1;
			// console.log('active book', activeBook);
			if (activeBook) {
				const lastChapterIndex = activeBook.chapters.length - 1;
				// console.log(!isNaN(parseInt(chapter, 10)));
				if (!isNaN(parseInt(chapter, 10))) {
					const parsedC = parseInt(chapter, 10);

					// console.log('38 is greater than 6', lastChapterIndex < parsedC, lastChapterIndex, parsedC);
					// Checks if the entered number is greater than the last chapter
					if (activeBook.chapters[lastChapterIndex] < parsedC) {
						activeChapter = activeBook.chapters[lastChapterIndex];
						// Checks if the entered number is less than the starting number
					} else if (activeBook.chapters[0] > parsedC) {
						activeChapter = activeBook.chapters[0];
					} else {
						activeChapter = parsedC;
					}
				} else {
					// If a non number was entered then it will start at the first chapter in the book
					activeChapter = activeBook.chapters[0];
				}
			}
			// console.log('activeChapter', activeChapter);
			// console.log('activeBook.chapters[0]', activeBook.chapters[0]);
			// const activeChapter = activeBook ? (parseInt(chapter, 10) || 1) : 1;
			// Nesting a ternary here because it keeps me from needing more variables and an if statement
			// If there wasn't an activeBook for the bookId given then check for if the resource has Matthew
			// If it has Matthew then use the bookId for that, otherwise just use the first bookId available
			const activeBookId = activeBook // eslint-disable-line no-nested-ternary
				? activeBook.book_id
				: hasMatt
					? 'MAT'
					: get(books, [0, 'book_id'], '');
			const activeBookName = activeBook
				? activeBook.name_short
				: get(books, [0, 'name_short'], '');
			if (!activeBook) {
				activeBook = books.find((b) => b.book_id === activeBookId);
			}
			// console.log('activeBook', activeBook);
			// console.log('activeBookId', activeBookId);
			// console.log('hasMatt', hasMatt);
			// console.log('get(books, [0, "book_id"])', get(books, [0, 'book_id']));

			const filesets = response.data.filesets['dbp-dev'].filter(
				(f) =>
					(f.type === 'audio' ||
						f.type === 'audio_drama' ||
						f.type === 'text_plain' ||
						f.type === 'text_format') &&
					f.id.slice(-4) !== 'DA16',
			);
			// console.log('responseesponse.data', response.data);
			yield fork(getCopyrightSaga, { filesetIds: filesets });
			// calling a generator that will handle the api requests for getting text
			// console.log('filtered filesets', filesets);
			let nextBook = { chapters: [] };
			let prevBook = { chapters: [] };
			let nextBookId = '';
			let prevBookId = '';
			let nextChapter = activeChapter + 1;
			let prevChapter = activeChapter - 1;

			if (books[activeBookIndex + 1]) {
				nextBook = books[activeBookIndex + 1];
				nextBookId = nextBook.book_id;
			}
			if (books[activeBookIndex - 1]) {
				prevBook = books[activeBookIndex - 1];
				prevBookId = prevBook.book_id;
			}

			if (!activeBook.chapters[prevChapter]) {
				prevChapter = prevBook.chapters[-1];
			}

			if (!activeBook.chapters[nextChapter]) {
				nextChapter = nextBook.chapters[0];
			}
			// console.log('nextChapter', nextChapter);
			// console.log('prevChapter', prevChapter);
			// console.log('nextBookId', nextBookId);
			// console.log('prevBookId', prevBookId);

			const chapterData = yield call(getChapterFromUrl, {
				filesets,
				bibleId,
				bookId: activeBookId,
				nextBookId,
				prevBookId,
				nextChapter,
				prevChapter,
				chapter: activeChapter,
				authenticated,
				userId,
				verse,
			});
			// console.log('chapter data', chapterData);
			// still need to include to active book name so that iteration happens here
			yield put({
				type: 'loadbible',
				filesets,
				name: bible.vname || bible.name,
				iso: bible.iso,
				textDirection,
				languageName: bible.language,
				books,
				chapterData,
				bibleId,
				activeBookId,
				activeChapter,
				activeBookName,
			});
		}
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Caught in get bible', error); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
		yield put({ type: 'loadbibleerror' });
	}
}
export function* getChapterFromUrl({
	filesets,
	bibleId: oldBibleId,
	bookId: oldBookId,
	chapter,
	authenticated,
	userId,
	nextBookId,
	prevBookId,
	nextChapter,
	prevChapter,
	verse,
}) {
	// console.log('bible, book, chapter', bibleId, bookId, chapter);
	// console.log('filesets chapter text', filesets);
	// console.log('next prev in get chapt', nextBookId, nextChapter, prevBookId, prevChapter);

	const bibleId = oldBibleId.toUpperCase();
	const bookId = oldBookId.toUpperCase();
	const hasFormattedText = some(filesets, (f) => f.type === 'text_format');
	// checking for audio but not fetching it as a part of this saga
	const hasAudio = some(
		filesets,
		(f) => f.type === 'audio' || f.type === 'audio_drama',
	);

	try {
		let formattedText = '';
		let formattedTextFilesetId = '';
		let plainTextFilesetId = '';
		let plainText = [];
		let hasPlainText = some(filesets, (f) => f.type === 'text_plain');

		if (authenticated) {
			yield fork(getHighlights, {
				bible: bibleId,
				book: bookId,
				chapter,
				userId,
			});
			yield fork(getNotesForChapter, {
				userId,
				params: {
					bible_id: bibleId,
					book_id: bookId,
					chapter,
					limit: 150,
					page: 1,
				},
			});
			yield fork(getBookmarksForChapter, {
				userId,
				params: {
					bible_id: bibleId,
					book_id: bookId,
					chapter,
					limit: 150,
					page: 1,
				},
			});
		}
		// calling this function to start it asynchronously to this one.
		// if (hasAudio) {
		// console.log('calling get chapter audio');
		// Not yielding this as it doesn't matter when the audio comes back
		// This function will sometimes have to make multiple api requests
		// And I don't want it blocking the text from loading
		// Need to get the next and prev audio sources here as well
		if (nextBookId && nextChapter) {
			// console.log('Calling get next audio');

			yield fork(getChapterAudio, {
				filesets,
				bookId,
				nextBookId,
				nextChapter,
				next: true,
			});
		}
		if (prevChapter && prevBookId) {
			// console.log('Calling get prev audio');
			yield fork(getChapterAudio, {
				filesets,
				bookId,
				prevBookId,
				prevChapter,
				previous: true,
			});
		}
		yield fork(getChapterAudio, { filesets, bookId, chapter });
		// }
		yield fork(getBookMetadata, { bibleId });
		// console.log('has formatted text', hasFormattedText);
		// Try to get the formatted text if it is available
		if (hasFormattedText) {
			try {
				// Gets the last fileset id for a formatted text
				const filesetId =
					filesets.reduce(
						(a, c) => (c.type === 'text_format' ? c.id : a),
						'',
					) || bibleId;
				// console.log('before fork');
				// yield fork(getCopyrightSaga, { filesetId });
				// console.log('after fork');
				const reqUrl = `${
					process.env.BASE_API_ROUTE
				}/bibles/filesets/${filesetId}?bucket=${
					process.env.DBP_BUCKET_ID
				}&key=${
					process.env.DBP_API_KEY
				}&v=4&book_id=${bookId}&chapter_id=${chapter}&type=text_format`; // hard coded since this only ever needs to get formatted text
				// console.log(reqUrl);
				const formattedChapterObject = yield call(request, reqUrl);
				const path = get(formattedChapterObject.data, [0, 'path']);
				// console.log('response for formatted text', formattedChapterObject);
				formattedText = yield path ? fetch(path).then((res) => res.text()) : '';

				formattedTextFilesetId = formattedText ? filesetId : '';
				// console.log(formattedText);
			} catch (error) {
				if (process.env.NODE_ENV === 'development') {
					console.error('Caught in get formatted text block', error); // eslint-disable-line no-console
				} else if (process.env.NODE_ENV === 'production') {
					// const options = {
					// 	header: 'POST',
					// 	body: formData,
					// };
					// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				}
			}
		}

		// Try to get the plain text every time
		// When this fails it should fail gracefully and not cause anything to break
		try {
			let filesetId = '';
			if (filesets.filter((set) => set.type === 'text_plain').length > 1) {
				// console.log('has more than 1', filesets.filter((set) => set.type === 'text_plain').length > 1);
				filesetId = filesets.reduce(
					(a, c) => (c.type === 'text_plain' ? a.concat(c.id) : a),
					[],
				);
				// console.log('filesetId', filesetId);
			} else {
				filesetId = filesets.reduce(
					(a, c) => (c.type === 'text_plain' ? c.id : a),
					'',
				);
				// console.log('only has one', filesetId);
			}

			if (Array.isArray(filesetId) && filesetId.length > 1) {
				// Discuss the issues with having multiple filesets for text
				// Will probably need to build out a list of checks like for the audio
				const results = yield call(tryNext, {
					urls: filesetId,
					index: 0,
					bookId,
					chapter,
				});
				plainText = results.plainText;
				plainTextFilesetId = results.plainTextFilesetId;
			} else {
				const reqUrl = `${
					process.env.BASE_API_ROUTE
				}/bibles/filesets/${filesetId}/${bookId}/${chapter}?key=${
					process.env.DBP_API_KEY
				}&v=4&book_id=${bookId}&chapter_id=${chapter}`;
				const res = yield call(request, reqUrl);
				// console.log('response for plain text', res);
				plainText = res.data;

				plainTextFilesetId = plainText ? bibleId : '';
			}
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in get plain text block', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
			}
			hasPlainText = false;
		}

		// console.log('plain text array', plainText);
		// console.log('formatted text array', formattedText);
		// Building response with all the needed data for a chapter to be usable
		yield put({
			type: 'loadnewchapter',
			plainText,
			plainTextFilesetId,
			formattedText,
			formattedTextFilesetId,
			hasPlainText,
			hasFormattedText,
			hasAudio,
			bookId,
			chapter,
			verse,
		});

		return {
			plainText,
			formattedText,
			hasPlainText,
			hasFormattedText,
			hasAudio,
		};
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.error('Caught in get chapter from url', error); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}

	// Return a default object in the case that none of the api calls work
	return {
		plainText: [],
		formattedText: '',
		hasFormattedText: false,
		hasPlainText: false,
		hasAudio: false,
	};
}

// Utility function for getting the plain text
function* tryNext({ urls, index, bookId, chapter }) {
	// let results = {};
	// console.log('in try next');
	let plainText = [];
	let plainTextFilesetId = '';
	try {
		const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${
			urls[index]
		}/${bookId}/${chapter}?key=${
			process.env.DBP_API_KEY
		}&v=4&book_id=${bookId}&chapter_id=${chapter}`;
		const res = yield call(request, reqUrl);
		// console.log('response for plain text', res);
		plainText = res.data;

		plainTextFilesetId = urls[index];

		// console.log('returning stuff');
		return {
			plainText,
			plainTextFilesetId,
		};
	} catch (err) {
		if (err) {
			console.warn('Error in try next function', err); // eslint-disable-line no-console
		}
		return tryNext(urls, index + 1);
	}
	// if (results.plainText) {
	// 	return {
	// 		plainText: results.plainText,
	// 		plainTextFilesetId: results.plainTextFilesetId,
	// 	};
	// }
	// return {
	// 	plainText,
	// 	plainTextFilesetId,
	// };
}

// I think it makes the most sense to start this running from within
// The getChapterFromUrl function. This may need to be adjusted when
// HLS streaming is implemented
export function* getChapterAudio({
	filesets,
	bookId: currentBook,
	chapter: currentChapter,
	previous = false,
	next = false,
	prevBookId,
	nextBookId,
	prevChapter,
	nextChapter,
}) {
	let bookId = currentBook;
	let chapter = currentChapter;
	// console.log('{ filesets, bookId: currentBook, chapter: currentChapter, previous = false, next = false, prevBookId, nextBookId, prevChapter, nextChapter }', { filesets, bookId: currentBook, chapter: currentChapter, previous, next, prevBookId, nextBookId, prevChapter, nextChapter });
	// console.trace()
	if (previous) {
		bookId = prevBookId;
		chapter = prevChapter;
	} else if (next) {
		bookId = nextBookId;
		chapter = nextChapter;
	}
	// Send a loadaudio action for each fail in production so that there isn't a link loaded
	// This handles the case where a user already has a link but getting the next one fails
	// console.log('getting audio', filesets, bookId, chapter);
	// Parse filesets |▰╭╮▰|
	// TODO: Need to handle when there are multiple filesets for the same audio type
	// console.log('filesets', filesets);
	const filteredFilesets = filesets.reduce((a, file) => {
		const newFile = { ...a };

		if (
			(file.type === 'audio' || file.type === 'audio_drama') &&
			file.id.slice(-4) !== 'DA16'
		) {
			// console.log('is 16 bit', file.id.slice(-4) === 'DA16')
			newFile[file.id] = file;
		}

		return newFile;
	}, {});
	// If there isn't any audio then I want to just load an empty string and stop the function
	// console.log(filteredFilesets)
	if (!Object.keys(filteredFilesets).length) {
		yield put({ type: 'loadaudio', audioPaths: [''] });
		return;
	}
	// console.log('filtered filesets', filteredFilesets);
	// console.log('filtered', filteredFilesets);
	// console.log('normal', filesets);
	const completeAudio = [];
	const ntAudio = [];
	const otAudio = [];
	const partialOtAudio = [];
	const partialNtAudio = [];
	const partialNtOtAudio = [];

	Object.entries(filteredFilesets).forEach((fileset) => {
		if (fileset[1].size === 'C') {
			completeAudio.push({ id: fileset[0], data: fileset[1] });
		} else if (fileset[1].size === 'NT') {
			ntAudio.push({ id: fileset[0], data: fileset[1] });
		} else if (fileset[1].size === 'OT') {
			otAudio.push({ id: fileset[0], data: fileset[1] });
		} else if (fileset[1].size === 'OTP') {
			partialOtAudio.push({ id: fileset[0], data: fileset[1] });
		} else if (fileset[1].size === 'NTP') {
			partialNtAudio.push({ id: fileset[0], data: fileset[1] });
		} else if (fileset[1].size === 'NTPOTP') {
			partialNtOtAudio.push({ id: fileset[0], data: fileset[1] });
		}
	});
	// console.log('audio arrays', '\n', completeAudio, '\n', ntAudio, '\n', otAudio, '\n', partialAudio);
	const otLength = otAudio.length;
	const ntLength = ntAudio.length;

	let otHasUrl = false;
	let ntHasUrl = false;

	if (completeAudio.length) {
		// console.log('Bible has complete audio', completeAudio);
		try {
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				completeAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				completeAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('complete audio response object', response);
			const audioPaths = [get(response, ['data', 0, 'path'])];
			// console.log('complete audio path', audioPaths);
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(completeAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio complete audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
		return;
	} else if (ntLength && !otLength) {
		try {
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				ntAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				ntAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('nt audio response object', response);
			const audioPaths = [get(response, ['data', 0, 'path'])];
			// console.log('nt audio path', audioPaths);
			ntHasUrl = !!audioPaths[0];
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(ntAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio nt audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
	} else if (otLength && !ntLength) {
		try {
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				otAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				otAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('ot audio response object', response);
			const audioPaths = [get(response, ['data', 0, 'path'])];
			// console.log('ot audio path', audioPaths);
			// otPath = audioPaths;
			otHasUrl = !!audioPaths[0];
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(otAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio ot audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
	} else if (ntLength && otLength) {
		let ntPath = '';
		let otPath = '';
		// console.log('trying nt & ot', ntLength && !otLength, '\n', ntAudio, '\n', otAudio);

		try {
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				ntAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				ntAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('nt audio response object', response);
			const audioPaths = [get(response, ['data', 0, 'path'])];
			// console.log('nt audio path', audioPaths);
			ntPath = audioPaths;
			// yield put({ type: 'loadaudio', previous, next, audioPaths });
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio nt audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
		try {
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				otAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				otAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('ot audio response object', response);
			const audioPaths = [get(response, ['data', 0, 'path'])];
			// console.log('ot audio path', audioPaths);
			otPath = audioPaths;
			// yield put({ type: 'loadaudio', previous, next, audioPaths });
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio ot audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
		ntHasUrl = !!ntPath;
		otHasUrl = !!otPath;
		yield put({
			type: 'loadaudio',
			previous,
			next,
			audioPaths: ntPath || otPath,
			audioFilesetId: ntPath
				? get(ntAudio, [0, 'id'])
				: get(otAudio, [0, 'id']),
		});
	}

	if (partialOtAudio.length && !otLength && (!otHasUrl && !ntHasUrl)) {
		// return a list of all of the s3 file paths since a chapter could have v1-v5 and v20-v25
		// console.log('files that contain partial audio', partialAudio);
		try {
			// Need to iterate over each object here to see if I can find the right chapter
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				partialOtAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				partialOtAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('partial audio response object', response);
			const audioPaths = [];
			if (response.data.length > 1) {
				response.data.forEach((file) => audioPaths.push(file.path));
			} else {
				audioPaths.push(get(response, ['data', 0, 'path']));
			}
			// console.log('partial audio path', audioPaths);
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(partialOtAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio partial audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
	}

	if (partialNtAudio.length && !ntLength && (!otHasUrl && !ntHasUrl)) {
		// return a list of all of the s3 file paths since a chapter could have v1-v5 and v20-v25
		// console.log('files that contain partial audio', partialAudio);
		try {
			// Need to iterate over each object here to see if I can find the right chapter
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				partialNtAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				partialNtAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('partial audio response object', response);
			const audioPaths = [];
			if (response.data.length > 1) {
				response.data.forEach((file) => audioPaths.push(file.path));
			} else {
				audioPaths.push(get(response, ['data', 0, 'path']));
			}
			// console.log('partial audio path', audioPaths);
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(partialNtAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio partial audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
	}

	if (
		partialNtOtAudio.length &&
		(!otLength && !ntLength) &&
		(!otHasUrl && !ntHasUrl)
	) {
		// return a list of all of the s3 file paths since a chapter could have v1-v5 and v20-v25
		// console.log('files that contain partial audio', partialAudio);
		try {
			// Need to iterate over each object here to see if I can find the right chapter
			const reqUrl = `${process.env.BASE_API_ROUTE}/bibles/filesets/${get(
				partialNtOtAudio,
				[0, 'id'],
			)}?bucket=${
				process.env.DBP_BUCKET_ID
			}&key=e8a946a0-d9e2-11e7-bfa7-b1fb2d7f5824&v=4&book_id=${bookId}&chapter_id=${chapter}&type=${get(
				partialNtOtAudio,
				[0, 'data', 'type'],
			)}`;
			const response = yield call(request, reqUrl);
			// console.log('partial audio response object', response);
			const audioPaths = [];
			if (response.data.length > 1) {
				response.data.forEach((file) => audioPaths.push(file.path));
			} else {
				audioPaths.push(get(response, ['data', 0, 'path']));
			}
			// console.log('partial audio path', audioPaths);
			yield put({
				type: 'loadaudio',
				previous,
				next,
				audioPaths,
				audioFilesetId: get(partialNtOtAudio, [0, 'id']),
			});
		} catch (error) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Caught in getChapterAudio partial audio', error); // eslint-disable-line no-console
			} else if (process.env.NODE_ENV === 'production') {
				// const options = {
				// 	header: 'POST',
				// 	body: formData,
				// };
				// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
				yield put({ type: 'loadaudio', previous, next, audioPaths: [''] });
			}
		}
	}
}

export function* getCopyrightSaga({ filesetIds }) {
	// Todo: Try to optimize at least a little bit
	const filteredFilesetIds = uniqWith(
		filesetIds.filter((f) => codes[f.type] && codes[f.size]),
		(a, b) => a.type === b.type && a.size === b.size,
	);
	const reqUrls = [];

	// Todo: Need a type param to add on to the end of this call so that I will get the copyright type that I need
	filteredFilesetIds.forEach((set) =>
		reqUrls.push(
			`${process.env.BASE_API_ROUTE}/bibles/filesets/${set.id}/copyright?key=${
				process.env.DBP_API_KEY
			}&v=4`,
		),
	);

	try {
		const response = yield all(reqUrls.map((url) => call(request, url)));
		// console.log(response);
		// const copyrightArray = response
		// 	.map((res) => ({ size: res.size, organizations: res.copyright.organizations, copyright: res.copyright.copyright }));
		// Todo: Once the api is updated remove the set_size_code and set_type_code usages below
		// Takes the response and turns it into an array that is more easily used and that doesn't contain unnecessary fields
		const copyrights = response.map((cp) => ({
			message: cp.copyright.copyright,
			testament: cp.size || cp.set_size_code,
			type: cp.type || cp.set_type_code,
			organizations: cp.copyright.organizations.map((org) => {
				const icon = org.logos.find((l) => l.icon);
				if (org.translations.length) {
					return {
						name: org.translations[0].name,
						logo: icon || (org.logos && org.logos[0]),
						isIcon: icon === undefined ? 0 : 1,
						url: org.url_website,
					};
				}
				return {
					name: '',
					logo: '',
					isIcon: 0,
					url: '',
				};
			}),
		}));
		// console.log('copyright response', copyrights);

		const cText = copyrights.filter(
			(c) =>
				c.testament === 'C' &&
				(c.type === 'text_plain' || c.type === 'text_format'),
		)[0];
		const ntText = !cText
			? copyrights.filter(
					(c) =>
						ntCodes[c.testament] &&
						(c.type === 'text_plain' || c.type === 'text_format'),
			  )[0]
			: {};
		const otText = !cText
			? copyrights.filter(
					(c) =>
						otCodes[c.testament] &&
						(c.type === 'text_plain' || c.type === 'text_format'),
			  )[0]
			: {};

		const cAudio = copyrights.filter(
			(c) =>
				c.testament === 'C' && (c.type === 'audio' || c.type === 'audio_drama'),
		)[0];
		const ntAudio = !cAudio
			? copyrights.filter(
					(c) =>
						ntCodes[c.testament] &&
						(c.type === 'audio' || c.type === 'audio_drama'),
			  )[0]
			: {};
		const otAudio = !cAudio
			? copyrights.filter(
					(c) =>
						otCodes[c.testament] &&
						(c.type === 'audio' || c.type === 'audio_drama'),
			  )[0]
			: {};

		// console.log('cText', cText);
		// console.log('ntText', ntText);
		// console.log('otText', otText);
		//
		// console.log('cAudio', cAudio);
		// console.log('ntAudio', ntAudio);
		// console.log('otAudio', otAudio);
		// One audio || audio_drama for C
		// One text_plain || text_format for C
		// or
		// One audio || audio_drama for OT &&
		// One audio || audio_drama for NT
		// One text_plain || text_format for OT &&
		// One text_plain || text_format for NT
		// copyrights.filter((c) => c.testament === 'C');

		const copyrightObject = {
			newTestament: {
				audio: cAudio || ntAudio,
				text: cText || ntText,
			},
			oldTestament: {
				audio: !(cAudio || ntAudio) && (cAudio || otAudio),
				text: !(cAudio || ntAudio) && (cText || otText),
			},
		};
		// console.log('copyrights', copyrightObject);
		yield put({ type: 'loadcopyright', copyrights: copyrightObject });
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('Caught in get copyright', err); // eslint-disable-line no-console
		}
	}
}

export function* createSocialUser({
	email,
	name,
	nickname,
	id,
	avatar,
	provider,
}) {
	// otherwise create a new account with this information
	const requestUrl = `${process.env.BASE_API_ROUTE}/users?key=${
		process.env.DBP_API_KEY
	}&v=4&pretty&project_id=${process.env.NOTES_PROJECT_ID}`;
	const data = new FormData();

	data.append('email', email);
	// data.append('password', password);
	data.append('name', name);
	data.append('nickname', nickname);
	data.append('subscribed', '0');
	data.append('avatar', avatar);
	data.append('project_id', process.env.NOTES_PROJECT_ID);
	data.append('social_provider_id', provider);
	data.append('social_provider_user_id', id);

	const options = {
		method: 'POST',
		body: data,
	};

	try {
		const response = yield call(request, requestUrl, options);

		if (response.success) {
			// console.log('res', response);

			yield put({
				type: USER_LOGGED_IN,
				userId: response.user.id,
				userProfile: response.user,
			});
			sessionStorage.setItem('bible_is_user_id', response.user.id);
		} else if (response.error) {
			// console.log('res error', response);
			if (process.env.NODE_ENV === 'development') {
				console.warn(response.error); // eslint-disable-line no-console
			}
			// console.log('response.error.message.email', response.error.message.email[0] === 'The email has already been taken.');

			if (
				response.error.message &&
				response.error.message.email &&
				response.error.message.email[0] === 'The email has already been taken.'
			) {
				// console.log('response.error.message.email', response.error.message.email);

				const r = `${process.env.BASE_API_ROUTE}/users/login?key=${
					process.env.DBP_API_KEY
				}&v=4&pretty&project_id=${process.env.NOTES_PROJECT_ID}`;
				const fd = new FormData();

				// fd.append('password', password);
				fd.append('email', email);
				fd.append('social_provider_id', provider);
				fd.append('social_provider_user_id', id);

				const op = {
					method: 'POST',
					body: fd,
				};

				try {
					const res = yield call(request, r, op);
					// console.log('res', res);

					if (res.error) {
						yield put({ type: LOGIN_ERROR, message: res.error.message });
					} else {
						yield put({
							type: USER_LOGGED_IN,
							userId: res.id,
							userProfile: res,
						});
						// May add an else that will save the id to the session so it is persisted through a page refresh
						sessionStorage.setItem('bible_is_user_id', res.id);
					}
				} catch (err) {
					if (process.env.NODE_ENV === 'development') {
						console.error(err); // eslint-disable-line no-console
					} else if (process.env.NODE_ENV === 'production') {
						// const options = {
						// 	header: 'POST',
						// 	body: formData,
						// };
						// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
					}
				}
			}
			// const message = Object.values(response.error.message).reduce((acc, cur) => acc.concat(cur), '');
			// yield put({ type: SIGNUP_ERROR, message });
			// yield put('user-login-failed', response.error.message);
		}
	} catch (err) {
		if (process.env.NODE_ENV === 'development') {
			console.error(err); // eslint-disable-line no-console
		} else if (process.env.NODE_ENV === 'production') {
			// const options = {
			// 	header: 'POST',
			// 	body: formData,
			// };
			// fetch('${process.env.BASE_API_ROUTE}/error_logging', options);
		}
	}
	// }
}

// Individual exports for testing
export default function* defaultSaga() {
	yield takeLatest(INIT_APPLICATION, initApplication);
	// yield takeLatest(GET_AUDIO, getAudio);
	// yield takeLatest(GET_BOOKS, getBooks);
	// yield takeLatest(GET_CHAPTER_TEXT, getChapter);
	yield takeLatest('getchapter', getChapterFromUrl);
	yield takeLatest(GET_HIGHLIGHTS, getHighlights);
	yield takeLatest(ADD_HIGHLIGHTS, addHighlight);
	yield takeLatest('getbible', getBibleFromUrl);
	yield takeLatest('getaudio', getChapterAudio);
	yield takeLatest(ADD_BOOKMARK, addBookmark);
	yield takeLatest(GET_NOTES_HOMEPAGE, getNotesForChapter);
	yield takeLatest(GET_COPYRIGHTS, getCopyrightSaga);
	yield takeLatest(DELETE_HIGHLIGHTS, deleteHighlights);
	yield takeLatest(CREATE_USER_WITH_SOCIAL_ACCOUNT, createSocialUser);
}
