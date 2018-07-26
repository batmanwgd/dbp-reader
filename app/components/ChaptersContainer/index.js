/**
 *
 * ChaptersContainer
 *
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import Link from 'next/link';

function ChaptersContainer({
	bookName,
	bookNameShort,
	bookId,
	selectedBookName,
	chapters,
	activeTextId,
	activeChapter,
	activeBookName,
	handleChapterClick,
}) {
	if (bookName || bookNameShort) {
		return (
			<div
				className={`chapter-container${
					selectedBookName === (bookName || bookNameShort)
						? ' active-book-chapters'
						: ' inactive-book-chapters'
				}`}
			>
				{chapters.map((chapter) => (
					<Link
						href={`/${activeTextId.toLowerCase()}/${bookId.toLowerCase()}/${chapter}`}
						as={`/bible/${activeTextId.toLowerCase()}/${bookId.toLowerCase()}/${chapter}`}
						key={chapter}
					>
						<a
							role={'button'}
							tabIndex={0}
							className={'chapter-box'}
							onClick={() => handleChapterClick()}
						>
							<span
								className={
									activeChapter === chapter &&
									(bookName || bookNameShort) === activeBookName
										? 'active-chapter'
										: ''
								}
							>
								{chapter}
							</span>
						</a>
					</Link>
				))}
			</div>
		);
	}

	return null;
}

ChaptersContainer.propTypes = {
	activeTextId: PropTypes.string,
	activeChapter: PropTypes.number,
	activeBookName: PropTypes.string,
	handleChapterClick: PropTypes.func,
	selectedBookName: PropTypes.string,
	bookName: PropTypes.string,
	bookNameShort: PropTypes.string,
	bookId: PropTypes.string,
	chapters: PropTypes.object,
};

export default ChaptersContainer;
