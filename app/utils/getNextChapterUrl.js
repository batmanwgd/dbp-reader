import { fromJS } from 'immutable';
import url from './hrefLinkOrAsLink';

export default ({
	books,
	chapter,
	bookId,
	textId,
	verseNumber,
	text: chapterText,
	isHref,
}) => {
	// console.log('verse number', verseNumber);
	if (verseNumber && chapterText.length) {
		const nextVerse = parseInt(verseNumber, 10) + 1 || 1;
		const lastVerse = chapterText.length;
		// console.log('verse number parsed', parseInt(verseNumber, 10) + 1);
		// console.log(chapterText.length);

		if (nextVerse <= lastVerse && nextVerse > 0) {
			// The next verse is within a valid range
			// console.log('Verse is in a valid range for getNext with chapter text');

			return url({ textId, bookId, chapter, nextVerse, isHref });
			// return `${baseUrl}/${textId}/${bookId}/${chapter}/${nextVerse}`;
		} else if (nextVerse < 0) {
			// The next verse is below 0 and thus invalid

			return url({ textId, bookId, chapter, nextVerse: '1', isHref });
			// return `${baseUrl}/${textId}/${bookId}/${chapter}/1`;
		} else if (nextVerse > lastVerse) {
			// Next verse is above the last verse in the chapter and thus is invalid

			return url({ textId, bookId, chapter, nextVerse: lastVerse, isHref });
			// return `${baseUrl}/${textId}/${bookId}/${chapter}/${lastVerse}`;
		}
		return url({ textId, bookId, chapter, nextVerse: verseNumber, isHref });
		// return `${baseUrl}/${textId}/${bookId}/${chapter}/${verseNumber}`;
	} else if (verseNumber) {
		const nextVerse = parseInt(verseNumber, 10) + 1 || 1;
		// console.log('verse number parsed', parseInt(verseNumber, 10) + 1);

		if (nextVerse && nextVerse > 0) {
			// The next verse is within a valid range
			// console.log('Verse is in a valid range for getNext');
			return url({ textId, bookId, chapter, nextVerse, isHref });
			// return `${baseUrl}/${textId}/${bookId}/${chapter}/${nextVerse}`;
		} else if (nextVerse < 0) {
			// The next verse is below 0 and thus invalid

			return url({ textId, bookId, chapter, nextVerse: '1', isHref });
			// return `${baseUrl}/${textId}/${bookId}/${chapter}/1`;
			// Need to find a way to do this for formatted text
			// } else if (nextVerse > lastVerse) {
			// Next verse is above the last verse in the chapter and thus is invalid
			// 	return url({ textId, bookId, chapter, nextVerse: lastVerse, isHref });
		}
		// Worst case just go back to the same verse (In hindsight this may not be the best...)
		return url({ textId, bookId, chapter, nextVerse: verseNumber, isHref });
	}

	let activeBookIndex;
	let nextBookIndex;

	books.forEach((book, index) => {
		if (book.book_id.toLowerCase() === bookId) {
			activeBookIndex = index;
			if (index + 1 <= books.length - 1) {
				nextBookIndex = index + 1;
			} else {
				nextBookIndex = index;
			}
		}
	});

	const nextBook =
		fromJS(books[nextBookIndex]) || fromJS({ chapters: [1], book_id: '' });
	const activeBook =
		fromJS(books[activeBookIndex]) || fromJS({ chapters: [1], book_id: '' });
	const maxChapter = activeBook.getIn(['chapters', -1]);

	// If the next book in line doesn't exist and we are already at the last chapter just return
	if (!nextBook.size && chapter === maxChapter) {
		return url({ textId, bookId, chapter });
		// return `${baseUrl}/${textId}/${bookId}/${chapter}`;
	}

	if (chapter === maxChapter) {
		// Need to get the first chapter of the next book
		return url({
			textId,
			bookId: nextBook.get('book_id').toLowerCase(),
			chapter: nextBook.getIn(['chapters', 0]),
			isHref,
		});
		// return `${baseUrl}/${textId}/${nextBook
		// 	.get('book_id')
		// 	.toLowerCase()}/${nextBook.getIn(['chapters', 0])}`;
	}
	const chapterIndex = activeBook
		.get('chapters')
		.findIndex((c) => c === chapter || c > chapter);
	const nextChapterIndex =
		activeBook.getIn(['chapters', chapterIndex]) === chapter
			? chapterIndex + 1
			: chapterIndex;

	return url({
		textId,
		bookId,
		chapter: activeBook.getIn(['chapters', nextChapterIndex]),
		isHref,
	});
	// return `${baseUrl}/${textId}/${bookId}/${activeBook.getIn([
	// 	'chapters',
	// 	nextChapterIndex,
	// ])}`;
};