/**
 *
 * Text
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import PrefetchLink from '../../utils/PrefetchLink';
import Information from '../../components/Information';
import SvgWrapper from '../../components/SvgWrapper';
import ContextPortal from '../../components/ContextPortal';
import FootnotePortal from '../../components/FootnotePortal';
import LoadingSpinner from '../../components/LoadingSpinner';
import IconsInText from '../../components/IconsInText';
import PopupMessage from '../../components/PopupMessage';
import PleaseSignInMessage from '../../components/PleaseSignInMessage';
import AudioOnlyMessage from '../../components/AudioOnlyMessage';
import {
	getFormattedParentVerseNumber,
	getPlainParentVerse,
	getFormattedParentVerse,
	getFormattedChildIndex,
	getFormattedElementVerseId,
	getPlainParentVerseWithoutNumber,
	getClosestParent,
	getOffsetNeededForPsalms,
} from '../../utils/highlightingUtils';
import getPreviousChapterUrl from '../../utils/getPreviousChapterUrl';
import getNextChapterUrl from '../../utils/getNextChapterUrl';
import {
	calcDistance,
	getClassNameForMain,
	getClassNameForTextContainer,
	getReference,
	isEndOfBible,
	isStartOfBible,
} from './textRenderUtils';
import createHighlights from './highlightPlainText';
import createFormattedHighlights from './highlightFormattedText';
import { applyNotes, applyBookmarks } from './formattedTextUtils';
import ReadFullChapter from '../../components/ReadFullChapter';
import differenceObject from '../../utils/deepDifferenceObject';

/* Disabling the jsx-a11y linting because we need to capture the selected text
	 and the most straight forward way of doing so is with the onMouseUp event */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
// Todo: Set selected text when user clicks a verse
class Text extends React.PureComponent {
	state = {
		contextMenuState: false,
		footnoteState: false,
		coords: {},
		selectedText: '',
		userSelectedText: '',
		firstVerse: 0,
		lastVerse: 0,
		highlightActive: this.props.highlights || false,
		handlersAreSet: false,
		handledMouseDown: false,
		activeVerseInfo: { verse: 0 },
		loadingNextPage: false,
		wholeVerseIsSelected: false,
		dommountedsostuffworks: false,
		formattedVerse: false,
		footnotes: {},
	};

	componentDidMount() {
		this.createHighlights = createHighlights;
		this.createFormattedHighlights = createFormattedHighlights;
		this.applyNotes = applyNotes;
		this.applyBookmarks = applyBookmarks;
		this.window = window;

		if (this.format) {
			// console.log('setting event listeners on format');
			this.setEventHandlersForFootnotes(this.format);
			this.setEventHandlersForFormattedVerses(this.format);
		} else if (this.formatHighlight) {
			// console.log('setting event listeners on formatHighlight');
			this.setEventHandlersForFootnotes(this.formatHighlight);
			this.setEventHandlersForFormattedVerses(this.formatHighlight);
		}
		// console.log('props at time component first mounted', this.props);
		this.dommountedsostuffworks();
		this.getFootnotesOnFirstRender();
	}

	componentWillReceiveProps(nextProps) {
		if (Object.keys(differenceObject(this.props, nextProps)).length) {
			// console.log('component did update new props difference: ', differenceObject(this.props, nextProps));
			// console.log('component did update old props difference: ', differenceObject(nextProps, this.props));
		}
		if (nextProps.formattedSource.main !== this.props.formattedSource.main) {
			this.setState(
				{
					footnoteState: false,
					activeVerseInfo: { verse: 0 },
					loadingNextPage: false,
				},
				() => {
					this.props.setTextLoadingState({ state: false });
				},
			);
		}
		if (!isEqual(nextProps.text, this.props.text)) {
			this.setState({ activeVerseInfo: { verse: 0 }, loadingNextPage: false });
			this.props.setTextLoadingState({ state: false });
		}
		// if (nextProps.text !== this.props.text || nextProps.formattedSource.main !== this.props.formattedSource.main || nextProps.audioSource !== this.props.audioSource) {
		// 	this.props.setTextLoadingState({ state: false });
		// }
		if (nextProps.verseNumber !== this.props.verseNumber) {
			this.setState({ loadingNextPage: false });
			this.props.setTextLoadingState({ state: false });
		}
		if (nextProps.activeChapter !== this.props.activeChapter) {
			this.setState({ loadingNextPage: false });
			this.props.setTextLoadingState({ state: false });
		}
	}

	// I am using this function because it means that the component finished updating and that the dom is available
	componentDidUpdate(prevProps, prevState) {
		// console.log(this.format, this.formatHighlight);
		// if (Object.keys(differenceObject(this.state, prevState)).length || Object.keys(differenceObject(this.props, prevProps)).length) {
		// 	console.log('component did update new props difference: ', differenceObject(this.props, prevProps));
		// 	console.log('component did update new state difference: ', differenceObject(this.state, prevState));
		// 	console.log('component did update old props difference: ', differenceObject(prevProps, this.props));
		// 	console.log('component did update old state difference: ', differenceObject(prevState, this.state));
		// }
		// console.log('updating---------------------------------------------');
		// if (this.main) {
		// 	this.main.removeEventListener('scroll', this.handleScrollOnMain, true);
		// 	this.main.addEventListener('scroll', this.handleScrollOnMain, true);
		// }

		if (
			this.main &&
			(this.format || this.formatHighlight) &&
			this.state.activeVerseInfo.isPlain === false &&
			this.state.activeVerseInfo.verse !== prevState.activeVerseInfo.verse &&
			this.state.activeVerseInfo.verse
		) {
			// Add the highlight to the new active verse
			const verse = this.state.activeVerseInfo.verse;
			const verseNodes = [
				...this.main.querySelectorAll(
					`[data-id="${this.props.activeBookId}${
						this.props.activeChapter
					}_${verse}"]`,
				),
			];
			if (verseNodes.length) {
				verseNodes.forEach(
					(n) => (n.className = `${n.className} active-verse`), // eslint-disable-line no-param-reassign
				);
			}
			// Remove the highlight from the old active verse
			const prevVerse = prevState.activeVerseInfo.verse;
			const prevVerseNodes = [
				...this.main.querySelectorAll(
					`[data-id="${this.props.activeBookId}${
						this.props.activeChapter
					}_${prevVerse}"]`,
				),
			];
			if (prevVerseNodes.length) {
				prevVerseNodes.forEach(
					(n) => (n.className = n.className.slice(0, -13)), // eslint-disable-line no-param-reassign
				); // eslint-disable-line no-param-reassign
			}
		} else if (
			this.main &&
			(this.format || this.formatHighlight) &&
			this.state.activeVerseInfo.isPlain === false
		) {
			// Remove the highlight from the old active verse
			const prevVerse = prevState.activeVerseInfo.verse;
			const prevVerseNodes = [
				...this.main.querySelectorAll(
					`[data-id="${this.props.activeBookId}${
						this.props.activeChapter
					}_${prevVerse}"]`,
				),
			];
			if (prevVerseNodes.length) {
				prevVerseNodes.forEach(
					(n) => (n.className = n.className.slice(0, -13)), // eslint-disable-line no-param-reassign
				);
			}
		}

		if (
			this.props.formattedSource.footnoteSource &&
			this.props.formattedSource.footnoteSource !==
				prevProps.formattedSource.footnoteSource
		) {
			// console.log('this.props.formatted', this.props.formattedSource.footnoteSource);
			// Safety check since I use browser apis
			if (this.props.formattedSource.footnoteSource) {
				// console.log('formatted source changed, updating footnotes', this.props.formattedSource.footnoteSource);
				// console.log('dom parser', DOMParser);
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(
					this.props.formattedSource.footnoteSource,
					'text/xml',
				);

				// console.log('in component did update function', [...xmlDoc.querySelectorAll('.footnote')].reduce((a, c) => a.concat(c.textContent), ''))
				const footnotes =
					[...xmlDoc.querySelectorAll('.footnote')].reduce((a, n) => {
						let node = n;
						let safeGuard = 0;
						// console.log('node before while loop', node);
						while ((node && !node.attributes.id) || safeGuard >= 10) {
							// console.log('node in while loop', node);
							node = node.parentElement;
							safeGuard += 1;
						}
						// console.log('sliced id', node.attributes.id.value.slice(4));
						// console.log('text content', node.textContent);
						if (node && node.attributes.id) {
							return {
								...a,
								[node.attributes.id.value.slice(4)]: node.textContent,
							};
						}
						// if (n.parentElement.parentElement.attributes.id) {
						// 	return {
						// 		...a,
						// 		[n.parentElement.parentElement.attributes.id.value.slice(
						// 			4,
						// 		)]: n.textContent,
						// 	};
						// }
						return a;
					}, {}) || {};
				// console.log('generated new footnotes', footnotes);
				this.callSetStateNotInUpdate(footnotes);
			}
		}
		// Logic below ensures that the proper event handlers are set on each footnote
		if (
			this.props.formattedSource.main &&
			prevProps.formattedSource.main !== this.props.formattedSource.main &&
			(this.format || this.formatHighlight)
		) {
			if (this.format) {
				// console.log('setting event listeners on format first');
				this.setEventHandlersForFootnotes(this.format);
				this.setEventHandlersForFormattedVerses(this.format);
			} else if (this.formatHighlight) {
				// console.log('setting event listeners on formatHighlight first');
				this.setEventHandlersForFootnotes(this.formatHighlight);
				this.setEventHandlersForFormattedVerses(this.formatHighlight);
			}
		} else if (
			!isEqual(this.props.highlights, prevProps.highlights) &&
			this.formatHighlight
		) {
			// console.log('setting event listeners on formatHighlight because highlights changed second');
			this.setEventHandlersForFootnotes(this.formatHighlight);
			this.setEventHandlersForFormattedVerses(this.formatHighlight);
		} else if (
			prevProps.userSettings.getIn([
				'toggleOptions',
				'readersMode',
				'active',
			]) !==
				this.props.userSettings.getIn([
					'toggleOptions',
					'readersMode',
					'active',
				]) &&
			!this.props.userSettings.getIn([
				'toggleOptions',
				'readersMode',
				'active',
			]) &&
			(this.formatHighlight || this.format)
		) {
			// Need to set event handlers again here because they are removed once the plain text is rendered
			if (this.format) {
				// console.log('setting event listeners on format third');
				this.setEventHandlersForFootnotes(this.format);
				this.setEventHandlersForFormattedVerses(this.format);
			} else if (this.formatHighlight) {
				// console.log('setting event listeners on formatHighlight third');
				this.setEventHandlersForFootnotes(this.formatHighlight);
				this.setEventHandlersForFormattedVerses(this.formatHighlight);
			}
		}

		// This handles setting the events on a page refresh or navigation via url
		if (
			this.format &&
			// !this.state.handlersAreSet &&
			!this.props.loadingNewChapterText
		) {
			// console.log('setting event listeners on format fourth', this.state.footnotes);
			this.setEventHandlersForFootnotes(this.format);
			this.setEventHandlersForFormattedVerses(this.format);
			// this.callSetStateNotInUpdate();
		} else if (
			this.formatHighlight &&
			// !this.state.handlersAreSet &&
			!this.props.loadingNewChapterText
		) {
			// console.log('setting event listeners on formatHighlight fourth ');
			this.setEventHandlersForFootnotes(this.formatHighlight);
			this.setEventHandlersForFormattedVerses(this.formatHighlight);
			// this.callSetStateNotInUpdate();
		}
	}

	setEventHandlersForFormattedVerses = (ref) => {
		// Set mousedown and mouseup events on verse elements
		try {
			const verses = [...ref.querySelectorAll('[data-id]')].slice(1); // [...ref.getElementsByClassName('v')];

			verses.forEach((verse) => {
				// console.log('setting events on this verse', verse);
				/* eslint-disable no-param-reassign, no-unused-expressions, jsx-a11y/no-static-element-interactions */
				verse.onmousedown = (e) => {
					e.stopPropagation();
					// console.log('mousedown event');
					this.getFirstVerse(e);
				};
				verse.onmouseup = (e) => {
					e.stopPropagation();
					// console.log('mouseup event');

					this.handleMouseUp(e);
				};
				// Noop to get the mouse events to fire on iOS
				verse.onclick = () => {};
			});
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error adding event handlers to formatted verses: ', err); // eslint-disable-line no-console
			}
			// if Production then log error to service
		}

		// Set click events on bookmark icons
		try {
			const elements = [...ref.getElementsByClassName('bookmark-in-verse')];
			// It might not work 100% of the time to use i here, but I think it
			// will work most of the time
			elements.forEach((el, i) => {
				el.onclick = (e) => {
					e.stopPropagation();

					this.handleNoteClick(i, true);
				};
			});
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error adding event handlers to formatted verses: ', err); // eslint-disable-line no-console
			}
			// if Production then log error to service
		}

		// Set click events on note icons
		try {
			const elements = [...ref.getElementsByClassName('note-in-verse')];

			// It might not work 100% of the time to use i here, but I think it
			// will work most of the time
			elements.forEach((el, i) => {
				el.onclick = (e) => {
					e.stopPropagation();

					this.handleNoteClick(i, false);
				};
			});
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Error adding event handlers to formatted verses: ', err); // eslint-disable-line no-console
			}
			// if Production then log error to service
		}
	};

	setEventHandlersForFootnotes = (ref) => {
		const notes = [...ref.getElementsByClassName('note')];

		notes.forEach((note) => {
			// console.log('setting a click handler for: ', note.attributes);
			/* eslint-disable no-param-reassign */
			// May need to change this and change the regex if we do infinite scrolling
			if (
				note.childNodes &&
				note.childNodes[0] &&
				typeof note.childNodes[0].removeAttribute === 'function'
			) {
				note.childNodes[0].removeAttribute('href');
			}

			// note.ontouchend = (e) => {
			//
			// }

			note.onclick = (e) => {
				e.stopPropagation();
				// console.log('clicked note');
				if (typeof this.window !== 'undefined') {
					const rightEdge = this.window.innerWidth - 300;
					const x = rightEdge < e.clientX ? rightEdge : e.clientX;

					this.openFootnote({
						id: note.attributes.id.value,
						coords: { x, y: e.clientY },
					});
				}
			};
		});
	};

	setFormattedRefHighlight = (el) => {
		this.formatHighlight = el;
	};

	setFormattedRef = (el) => {
		this.format = el;
	};

	setMainRef = (el) => {
		this.main = el;
	};
	// Use selected text only when marking highlights
	setActiveNote = ({ coords, existingNote, bookmark }) => {
		// console.log('this.state', this.state);
		if (!this.props.userAuthenticated || !this.props.userId) {
			this.openPopup({ x: coords.x, y: coords.y });
			return;
		}
		const { firstVerse, lastVerse } = this.state;
		const { activeBookId, activeChapter, bibleId } = this.props;

		const note = {
			verse_start: firstVerse || lastVerse,
			verse_end: lastVerse || firstVerse,
			book_id: activeBookId,
			chapter: activeChapter,
			bible_id: bibleId,
			bookmark: bookmark ? 1 : 0,
		};

		this.props.setActiveNote({ note: existingNote || note });
	};

	getFootnotesOnFirstRender = () => {
		// console.log('getFootnotesOnFirstRender', this.props.formattedSource.footnoteSource);
		// console.log('dom parser', DOMParser);
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(
			this.props.formattedSource.footnoteSource,
			'text/html',
		);
		// console.log('in first render function', [...xmlDoc.querySelectorAll('.footnote')].reduce((a, c) => a.concat(c.textContent), ''))
		const footnotes =
			[...xmlDoc.querySelectorAll('.footnote')].reduce((a, n) => {
				let node = n;
				let safeGuard = 0;
				// console.log('node before while loop', node);
				while ((node && !node.attributes.id) || safeGuard >= 10) {
					// console.log('node in while loop', node);
					node = node.parentElement;
					safeGuard += 1;
				}
				// console.log('sliced id', node.attributes.id.value.slice(4));
				// console.log('text content', node.textContent);
				if (node && node.attributes.id) {
					return {
						...a,
						[node.attributes.id.value.slice(4)]: node.textContent,
					};
				}
				return a;
			}, {}) || {};
		this.setState({
			footnoteState: false,
			footnotes,
		});
	};

	getFirstVerse = (e) => {
		// alert('mousedown fired');
		e.stopPropagation();
		// console.log('getting first verse');
		const target = e.target;
		const isFormatted =
			!!this.props.formattedSource.main &&
			(!this.props.userSettings.getIn([
				'toggleOptions',
				'readersMode',
				'active',
			]) ||
				!this.props.userSettings.getIn([
					'toggleOptions',
					'readersMode',
					'available',
				])) &&
			(!this.props.userSettings.getIn([
				'toggleOptions',
				'oneVersePerLine',
				'active',
			]) ||
				!this.props.userSettings.getIn([
					'toggleOptions',
					'oneVersePerLine',
					'available',
				]));
		const primaryButton = e.button === 0;

		try {
			// if formatted iterate up the dom looking for data-id
			if (isFormatted) {
				const verseNode = getFormattedParentVerse(target);
				const firstVerse = verseNode
					? verseNode.attributes['data-id'].value.split('_')[1]
					: '';
				// console.log('first formatted verse', firstVerse);
				// third check may not be required, if micro optimization is needed then look into removing contains
				if (primaryButton && this.main.contains(target) && firstVerse) {
					this.setState({
						firstVerse,
					});
				}
			} else if (!isFormatted) {
				const verseNode = getPlainParentVerseWithoutNumber(target);
				const firstVerse = verseNode
					? verseNode.attributes['data-verseid'].value
					: '';
				// console.log('first plain verse', firstVerse);
				// third check may not be required, if micro optimization is needed then look into removing contains
				if (primaryButton && this.main.contains(target) && firstVerse) {
					this.setState({
						firstVerse,
					});
				}
			}
		} catch (err) {
			if (process.env.NODE_ENV === 'development') {
				console.warn('Error with getting last verse and opening menu', err); // eslint-disable-line no-console
			}
		}
	};

	getLastVerse = (e) => {
		const target = e.target;
		// const parent = e.target.parentElement;
		const isFormatted =
			!!this.props.formattedSource.main &&
			(!this.props.userSettings.getIn([
				'toggleOptions',
				'readersMode',
				'active',
			]) ||
				!this.props.userSettings.getIn([
					'toggleOptions',
					'readersMode',
					'available',
				])) &&
			(!this.props.userSettings.getIn([
				'toggleOptions',
				'oneVersePerLine',
				'active',
			]) ||
				!this.props.userSettings.getIn([
					'toggleOptions',
					'oneVersePerLine',
					'available',
				]));
		// console.log('is formatted', isFormatted);
		// May need to get the parent using the same functions as for highlighting
		// console.log('Get last verse target', target);
		// console.log('Get last verse parent', parent);
		// console.log('Get last verse event', e);
		// console.log('Selection in last verse event', this.window.getSelection());
		const primaryButton = e.button === 0;
		// console.log(this.window.getSelection().toString());
		if (typeof this.window !== 'undefined') {
			// if formatted iterate up the dom looking for data-id
			if (isFormatted) {
				const verseNode = getFormattedParentVerse(target);
				const lastVerse = verseNode
					? verseNode.attributes['data-id'].value.split('_')[1]
					: '';
				// console.log('last formatted verse', lastVerse);
				// third check may not be required, if micro optimization is needed then look into removing contains
				if (
					primaryButton &&
					this.window.getSelection().toString() &&
					this.main.contains(target) &&
					lastVerse
				) {
					typeof e.persist === 'function' && e.persist();
					const selectedText = this.window.getSelection().toString();

					this.setState(
						{
							wholeVerseIsSelected: false,
							lastVerse,
							anchorOffset: this.window.getSelection().anchorOffset,
							anchorText: this.window.getSelection().anchorNode.data,
							anchorNode: this.window.getSelection().anchorNode,
							focusOffset: this.window.getSelection().focusOffset,
							focusText: this.window.getSelection().focusNode.data,
							focusNode: this.window.getSelection().focusNode,
							selectedText,
							userSelectedText: selectedText,
						},
						() => {
							this.openContextMenu(e);
						},
					);
				} else if (lastVerse && this.main.contains(target) && primaryButton) {
					// treat the event as a click and allow the whole verse to be highlighted
					// console.log('counts as a click not a text selection formatted');
					const verseText =
						[
							...document.querySelectorAll(
								`[data-id=${this.props.activeBookId}${
									this.props.activeChapter
								}_${lastVerse}]`,
							),
						].reduce((a, c) => a.concat(' ', c.textContent), '') || '';

					this.selectedWholeVerse(
						lastVerse,
						false,
						e.clientX,
						e.clientY,
						verseText,
					);
				}
			} else if (!isFormatted) {
				const verseNode = getPlainParentVerseWithoutNumber(target);
				const lastVerse = verseNode
					? verseNode.attributes['data-verseid'].value
					: '';
				// console.log('last plain verse', lastVerse);
				// third check may not be required, if micro optimization is needed then look into removing contains
				if (
					primaryButton &&
					this.window.getSelection().toString() &&
					this.main.contains(target) &&
					lastVerse
				) {
					typeof e.persist === 'function' && e.persist();
					const selectedText = this.window.getSelection().toString();

					this.setState(
						{
							wholeVerseIsSelected: false,
							lastVerse,
							anchorOffset: this.window.getSelection().anchorOffset,
							anchorText: this.window.getSelection().anchorNode.data,
							anchorNode: this.window.getSelection().anchorNode,
							focusOffset: this.window.getSelection().focusOffset,
							focusText: this.window.getSelection().focusNode.data,
							focusNode: this.window.getSelection().focusNode,
							selectedText,
							userSelectedText: selectedText,
						},
						() => {
							this.openContextMenu(e);
						},
					);
				} else if (lastVerse && this.main.contains(target) && primaryButton) {
					// treat the event as a click and allow the whole verse to be highlighted
					// console.log('counts as a click not a text selection for plain');
					this.selectedWholeVerse(
						lastVerse,
						true,
						e.clientX,
						e.clientY,
						this.props.text
							.filter((v) => v.verse_start === parseInt(lastVerse, 10))
							.map((v) => v.verse_text)[0] || '',
					);
				}
			} else {
				this.openContextMenu(e);
			}
		}
	};

	getTextComponents(dommountedsostuffworks) {
		const {
			text: initialText,
			userSettings,
			formattedSource: initialFormattedSourceFromProps,
			// formattedSource: initialFormattedSource,
			highlights,
			activeChapter,
			activeBookName,
			verseNumber,
			userNotes,
			bookmarks,
			audioSource,
			userAuthenticated,
			// invalidBibleId,
			activeBookId,
		} = this.props;
		// console.log('initialText', initialText);
		const initialFormattedSource = JSON.parse(
			JSON.stringify(initialFormattedSourceFromProps),
		);
		let formattedVerse = false;

		// Need to move this to selector and use regex
		// Possible for verse but not for footnotes
		if (dommountedsostuffworks && initialFormattedSource.main) {
			if (verseNumber) {
				// console.log('dom parser', DOMParser);
				const parser = new DOMParser();
				const serializer = new XMLSerializer();
				// Create temp xml doc from source
				const xmlDocText = parser.parseFromString(
					initialFormattedSource.main,
					'text/xml',
				);
				// Find the verse node by its classname
				const verseClassName = `${activeBookId.toUpperCase()}${activeChapter}_${verseNumber}`;
				const verseNumberElement = xmlDocText.getElementsByClassName(
					`verse${verseNumber}`,
				)[0];
				// Get the inner text of the verse
				const verseString = xmlDocText.getElementsByClassName(
					verseClassName,
				)[0];
				// Create a new container for the verse
				const newXML = xmlDocText.createElement('div');
				newXML.className = 'single-formatted-verse';
				// Add the verse to the new container
				if (verseNumberElement && verseString) {
					newXML.appendChild(verseNumberElement);
					newXML.appendChild(verseString);
				}
				// Use the new text as the formatted source
				initialFormattedSource.main = newXML
					? serializer.serializeToString(newXML)
					: 'This chapter does not have a verse matching the url';
				formattedVerse = true;
				// console.log('setting the state for the verse being done')
				// console.log('Creating new source for verse', initialFormattedSource);
			}
		}

		const chapterAlt = initialText[0] && initialText[0].chapter_alt;
		const verseIsActive =
			this.state.activeVerseInfo.verse && this.state.activeVerseInfo.isPlain;
		const activeVerse = this.state.activeVerseInfo.verse || 0;
		// Doing it like this may impact performance, but it is probably cleaner
		// than most other ways of doing it...
		let formattedSource = initialFormattedSource;

		if (this.applyNotes && this.applyBookmarks) {
			formattedSource = initialFormattedSource.main
				? {
						...initialFormattedSource,
						main: [initialFormattedSource.main]
							.map((s) => this.applyNotes(s, userNotes, this.handleNoteClick))
							.map((s) =>
								this.applyBookmarks(s, bookmarks, this.handleNoteClick),
							)[0],
				  }
				: initialFormattedSource;
		}
		const readersMode = userSettings.getIn([
			'toggleOptions',
			'readersMode',
			'active',
		]);
		const oneVersePerLine = userSettings.getIn([
			'toggleOptions',
			'oneVersePerLine',
			'active',
		]);
		const justifiedText = userSettings.getIn([
			'toggleOptions',
			'justifiedText',
			'active',
		]);
		// console.log(initialText);
		// Need to connect to the api and get the highlights object for this chapter
		// based on whether the highlights object has any data decide whether to
		// run this function or not
		let plainText = [];
		let formattedText = [];

		if (
			highlights.length &&
			userAuthenticated &&
			(!oneVersePerLine && !readersMode && formattedSource.main) &&
			this.createFormattedHighlights
		) {
			// Temporary fix for the fact that highlight_start is a string... ... ...
			const highlightsToPass = highlights.map((h) => ({
				...h,
				highlight_start: parseInt(h.highlight_start, 10),
			}));
			// Use function for highlighting the formatted formattedText
			formattedText = this.createFormattedHighlights(
				highlightsToPass,
				formattedSource.main,
			);
		} else if (
			highlights.length &&
			userAuthenticated &&
			initialText.length &&
			this.createHighlights
		) {
			// Temporary fix for the fact that highlight_start is a string... ... ...
			const highlightsToPass = highlights.map((h) => ({
				...h,
				highlight_start: parseInt(h.highlight_start, 10),
			}));
			// Use function for highlighting the plain plainText
			plainText = this.createHighlights(highlightsToPass, initialText);
		} else {
			plainText = initialText || [];
		}

		let textComponents;

		// Todo: Should handle each mode for formatted text and plain text in a separate component
		// Handle exception thrown when there isn't plain text but readers mode is selected
		// console.log('plainText', plainText);
		/* eslint-disable react/no-danger */
		if (plainText.length === 0 && !formattedSource.main) {
			// Need to have a way to know if this is being run on the server or not
			// if (this.window && !this.window.navigator.onLine) {
			// 	textComponents = [
			// 		<h5 key={'no_connection'}>
			// 			We are having trouble contacting the server. Please check your
			// 			internet connection and then refresh the page.
			// 		</h5>,
			// 	];
			// }
			if (audioSource) {
				textComponents = [
					<AudioOnlyMessage
						key={'no_text'}
						book={activeBookName}
						chapter={activeChapter}
					/>,
				];
			} else {
				textComponents = [
					<h5 key={'no_text'}>
						Text is not currently available for this version.
					</h5>,
				];
			}
		} else if (readersMode) {
			textComponents = plainText.map(
				(verse) =>
					verse.hasHighlight
						? [
								<span
									onMouseUp={this.handleMouseUp}
									onMouseDown={this.getFirstVerse}
									onClick={this.handleHighlightClick}
									data-verseid={verse.verse_start}
									key={verse.verse_start}
									dangerouslySetInnerHTML={{ __html: verse.verse_text }}
									className={
										verseIsActive &&
										(parseInt(activeVerse, 10) === verse.verse_start ||
											activeVerse === verse.verse_start_alt)
											? 'active-verse'
											: ''
									}
								/>,
								<span
									key={`${verse.verse_end}spaces`}
									className={'readers-spaces'}
								>
									&nbsp;
								</span>,
						  ]
						: [
								<span
									onMouseUp={this.handleMouseUp}
									onMouseDown={this.getFirstVerse}
									onClick={this.handleHighlightClick}
									data-verseid={verse.verse_start}
									key={verse.verse_start}
									className={
										verseIsActive &&
										(parseInt(activeVerse, 10) === verse.verse_start ||
											activeVerse === verse.verse_start_alt)
											? 'active-verse'
											: ''
									}
								>
									{verse.verse_text}
								</span>,
								<span
									key={`${verse.verse_end}spaces`}
									className={'readers-spaces'}
								>
									&nbsp;
								</span>,
						  ],
			);
		} else if (oneVersePerLine) {
			textComponents = plainText.map(
				(verse) =>
					verse.hasHighlight ? (
						<span
							onMouseUp={this.handleMouseUp}
							onMouseDown={this.getFirstVerse}
							onClick={this.handleHighlightClick}
							data-verseid={verse.verse_start}
							key={verse.verse_start}
							className={
								verseIsActive &&
								(parseInt(activeVerse, 10) === verse.verse_start ||
									activeVerse === verse.verse_start_alt)
									? 'active-verse'
									: ''
							}
						>
							<br />
							<sup data-verseid={verse.verse_start}>
								&nbsp;{verse.verse_start_alt || verse.verse_start}&nbsp;
							</sup>
							<IconsInText
								clickHandler={this.handleNoteClick}
								bookmarkData={{
									hasBookmark: verse.hasBookmark,
									index: verse.bookmarkIndex,
								}}
								noteData={{ hasNote: verse.hasNote, index: verse.noteIndex }}
							/>
							<span
								data-verseid={verse.verse_start}
								dangerouslySetInnerHTML={{ __html: verse.verse_text }}
							/>
						</span>
					) : (
						<span
							onMouseUp={this.handleMouseUp}
							onMouseDown={this.getFirstVerse}
							onClick={this.handleHighlightClick}
							data-verseid={verse.verse_start}
							key={verse.verse_start}
							className={
								verseIsActive &&
								(parseInt(activeVerse, 10) === verse.verse_start ||
									activeVerse === verse.verse_start_alt)
									? 'active-verse'
									: ''
							}
						>
							<br />
							<sup data-verseid={verse.verse_start}>
								&nbsp;{verse.verse_start_alt || verse.verse_start}&nbsp;
							</sup>
							<IconsInText
								clickHandler={this.handleNoteClick}
								bookmarkData={{
									hasBookmark: verse.hasBookmark,
									index: verse.bookmarkIndex,
								}}
								noteData={{ hasNote: verse.hasNote, index: verse.noteIndex }}
							/>
							<span data-verseid={verse.verse_start}>{verse.verse_text}</span>
						</span>
					),
			);
		} else if (
			formattedSource.main &&
			(!verseNumber || (verseNumber && formattedVerse))
		) {
			// Need to run a function to highlight the formatted text if this option is selected
			if (!Array.isArray(formattedText)) {
				textComponents = (
					<div
						ref={this.setFormattedRefHighlight}
						className={justifiedText ? 'justify' : ''}
						dangerouslySetInnerHTML={{ __html: formattedText }}
					/>
				);
			} else {
				textComponents = (
					<div
						ref={this.setFormattedRef}
						className={justifiedText ? 'justify' : ''}
						dangerouslySetInnerHTML={{ __html: formattedSource.main }}
					/>
				);
			}
		} else {
			textComponents = plainText.map(
				(verse) =>
					verse.hasHighlight ? (
						<span
							onMouseUp={this.handleMouseUp}
							onMouseDown={this.getFirstVerse}
							onClick={this.handleHighlightClick}
							className={
								verseIsActive &&
								(parseInt(activeVerse, 10) === verse.verse_start ||
									activeVerse === verse.verse_start_alt)
									? 'align-left active-verse'
									: 'align-left'
							}
							data-verseid={verse.verse_start}
							key={verse.verse_start}
						>
							<sup data-verseid={verse.verse_start}>
								&nbsp;{verse.verse_start_alt || verse.verse_start}&nbsp;
							</sup>
							<IconsInText
								clickHandler={this.handleNoteClick}
								bookmarkData={{
									hasBookmark: verse.hasBookmark,
									index: verse.bookmarkIndex,
								}}
								noteData={{ hasNote: verse.hasNote, index: verse.noteIndex }}
							/>
							<span
								data-verseid={verse.verse_start}
								dangerouslySetInnerHTML={{ __html: verse.verse_text }}
							/>
						</span>
					) : (
						<span
							onMouseUp={this.handleMouseUp}
							onMouseDown={this.getFirstVerse}
							onClick={this.handleHighlightClick}
							className={
								verseIsActive &&
								(parseInt(activeVerse, 10) === verse.verse_start ||
									activeVerse === verse.verse_start_alt)
									? 'align-left active-verse'
									: 'align-left'
							}
							data-verseid={verse.verse_start}
							key={verse.verse_start}
						>
							<sup data-verseid={verse.verse_start}>
								&nbsp;{verse.verse_start_alt || verse.verse_start}&nbsp;
							</sup>
							<IconsInText
								clickHandler={this.handleNoteClick}
								bookmarkData={{
									hasBookmark: verse.hasBookmark,
									index: verse.bookmarkIndex,
								}}
								noteData={{ hasNote: verse.hasNote, index: verse.noteIndex }}
							/>
							<span data-verseid={verse.verse_start}>{verse.verse_text}</span>
						</span>
					),
			);
		}

		if (
			!formattedSource.main &&
			!readersMode &&
			!oneVersePerLine &&
			Array.isArray(textComponents) &&
			textComponents[0].key !== 'no_text'
		) {
			textComponents.unshift(
				<span key={'chapterNumber'} className={'drop-caps'}>
					{chapterAlt || activeChapter}
				</span>,
			);
		}
		// console.log('text components that are about to be mounted', textComponents);
		// console.log('verseNumber in getComponents', verseNumber);

		// Using parseInt to determine whether or not the verseNumber is a real number or if it is a series of characters
		if (verseNumber && Array.isArray(textComponents)) {
			if (readersMode) {
				return textComponents.filter(
					(c) => c[0].key === (parseInt(verseNumber, 10) ? verseNumber : '1'),
				);
			}
			return textComponents.filter(
				(c) => c.key === (parseInt(verseNumber, 10) ? verseNumber : '1'),
			);
		}
		// console.log('Text components', textComponents)
		return textComponents;
	}

	handleScrollOnMain = () => {
		if (this.state.contextMenuState) {
			this.setState({ contextMenuState: false, activeVerseInfo: { verse: 0 } });
		}
	};

	// This is a noop to trick iOS devices
	handleHighlightClick = () => {
		// Unless there is a click event the mouseup and mousedown events won't fire for mobile devices
		// Left this blank since I actually don't need to do anything with it
	};

	handleMouseUp = (e) => {
		// alert(`mouse up fired: ${e.button}: ${e.changedTouches}`);
		e.stopPropagation();
		// alert('handling mouseup');
		// alert(e.button);
		// console.log('e.changedTouches', e.changedTouches);

		this.getLastVerse(e);
		if (
			e.button === 0 &&
			this.state.footnoteState &&
			e.target.className !== 'key'
		) {
			this.closeFootnote();
		}
	};

	handleArrowClick = () => {
		this.setState({ loadingNextPage: true });
	};

	handleNoteClick = (noteIndex, clickedBookmark) => {
		const userNotes = this.props.userNotes;
		const existingNote = userNotes[noteIndex];
		// console.log('handling note click', noteIndex, clickedBookmark);

		if (!this.props.notesActive) {
			this.setActiveNote({ existingNote });
			if (clickedBookmark) {
				this.props.setActiveNotesView('bookmarks');
			} else {
				this.props.setActiveNotesView('edit');
			}
			this.closeContextMenu();
			this.props.toggleNotesModal();
		} else {
			this.setActiveNote({ existingNote });
			if (clickedBookmark) {
				this.props.setActiveNotesView('bookmarks');
			} else {
				this.props.setActiveNotesView('edit');
			}
			this.closeContextMenu();
		}
	};

	handleAddBookmark = () => {
		// console.log('Props available in bookmarks', this.props);
		// console.log('State available in bookmarks', this.state);
		const {
			activeBookId,
			userId,
			userAuthenticated,
			activeChapter,
			bibleId,
		} = this.props;
		const { firstVerse, lastVerse } = this.state;
		// Need to make first verse and last verse integers for the < comparison
		const fv = parseInt(firstVerse, 10);
		const lv = parseInt(lastVerse, 10);
		// This takes into account RTL and LTR selections
		const verseStart = fv < lv ? fv : lv;
		const verseEnd = fv < lv ? lv : fv;

		// Only add the bookmark if there is a userId to add it too
		if (userAuthenticated && userId) {
			// console.log('Adding bookmark with: ', {
			// 	book_id: activeBookId,
			// 	chapter: activeChapter,
			// 	userId,
			// 	bible_id: bibleId,
			// 	notes: '',
			// 	title: '',
			// 	bookmark: 1,
			// 	verse_start: verseStart,
			// 	verse_end: verseEnd,
			// });
			this.props.addBookmark({
				book_id: activeBookId,
				chapter: activeChapter,
				user_id: userId,
				bible_id: bibleId,
				notes: "''",
				title: '',
				bookmark: 1,
				reference: getReference(
					verseStart || verseEnd,
					verseEnd,
					this.props.activeBookName,
					this.props.activeChapter,
				),
				verse_start: verseStart || verseEnd,
				verse_end: verseEnd,
			});
		}
	};

	// Probably need to stop doing this here
	callSetStateNotInUpdate = (footnotes) => this.setState({ footnotes });

	dommountedsostuffworks = () =>
		this.setState({ dommountedsostuffworks: true, formattedVerse: true });

	openPopup = (coords) => {
		this.setState({ popupOpen: true, popupCoords: coords });
		setTimeout(() => this.setState({ popupOpen: false }), 2500);
	};
	// has an issue with highlights in the same verse
	// This is likely going to be really slow...
	// highlightPlainText = (props) => createHighlights(props);

	addHighlight = ({ color, popupCoords }) => {
		let highlightObject = {};
		// console.log('this.state.wholeVerseIsSelected', this.state.wholeVerseIsSelected);

		// Getting the data for the tests
		// console.log(JSON.stringify(this.props));
		// console.log(JSON.stringify(this.state));
		// console.log('this.props that are important', !this.props.userSettings.getIn(['toggleOptions', 'readersMode', 'active']), !!this.props.formattedSource.main);
		// console.log('this.state', this.state);
		// User must be signed in for the highlight to be added
		if (!this.props.userAuthenticated || !this.props.userId) {
			this.openPopup({ x: popupCoords.x, y: popupCoords.y });
			// Returning the highlightObject for testing purposes
			return highlightObject;
		}
		// needs to send an api request to the server that adds a highlight for this passage
		// Adds userId and bible in homepage container where action is dispatched
		// { bible, book, chapter, userId, verseStart, highlightStart, highlightedWords }
		// Available data
		// text and node where highlight started,
		// text and node where highlight ended
		// verse number of highlight start
		// verse number of highlight end
		// text selected

		// formatted solution
		// get the dom node for the selection start
		// mark the index for selection start inside that dom node
		// go up the dom until I get the entire verse
		// This should accurately get the verse node no matter what node started on
		// split all the text nodes and join them into an array
		// find the index of the marked character
		// use that index as the highlight start
		// if the selected text starts at the end of the anchor node
		// else if the selected text starts at the end of the focus node
		if (this.state.wholeVerseIsSelected) {
			try {
				// do stuff
				// console.log('Highlighting the whole verse');
				const verse = this.state.activeVerseInfo.verse;
				const isPlain = this.state.activeVerseInfo.isPlain;
				// const highlightedWords = this.props.text
				if (isPlain) {
					const highlightedWords = this.props.text.find(
						(t) =>
							t.verse_start === parseInt(verse, 10) ||
							t.verse_start_alt === verse,
					).verse_text.length;
					highlightObject = {
						book: this.props.activeBookId,
						chapter: this.props.activeChapter,
						verseStart: verse,
						color,
						highlightStart: 0,
						highlightedWords,
						reference: getReference(
							verse,
							verse,
							this.props.activeBookName,
							this.props.activeChapter,
						),
					};
				} else {
					// console.log(this.main);
					// console.log(this.main.querySelectorAll)
					// console.log(`[data-id="${this.props.activeBookId}${
					// 	this.props.activeChapter
					// 	}_${verse}"]`);

					const verseElements = this.main
						? [
								...this.main.querySelectorAll(
									`[data-id="${this.props.activeBookId}${
										this.props.activeChapter
									}_${verse}"]`,
								),
						  ]
						: [];
					// console.log('verseElements', verseElements);
					// console.log('verseElements.reduce((a, c) => a.concat(c.textContent), \'\')', verseElements.reduce((a, c) => a.concat(c.textContent), ''));

					const highlightedWords = verseElements
						.reduce((a, c) => a.concat(c.textContent), '')
						.replace(/[\r\n*✝]/g, '').length;
					// console.log('highlightedWords', highlightedWords);
					highlightObject = {
						book: this.props.activeBookId,
						chapter: this.props.activeChapter,
						verseStart: verse,
						color,
						highlightStart: 0,
						highlightedWords,
						reference: getReference(
							verse,
							verse,
							this.props.activeBookName,
							this.props.activeChapter,
						),
					};
				}

				if (highlightObject) {
					// console.log('highlightObject', highlightObject);

					this.props.addHighlight(highlightObject);
				}

				this.setState({
					wholeVerseIsSelected: false,
					activeVerseInfo: { verse: 0 },
				});
			} catch (err) {
				// do stuff with err
			}
		} else {
			try {
				// Globals*
				const first = parseInt(this.state.firstVerse, 10);
				const last = parseInt(this.state.lastVerse, 10);
				const chapter = this.props.activeChapter;
				const activeBookId = this.props.activeBookId;
				// Since a user can highlight "backwards" this makes sure the first verse is correct
				const firstVerse = first < last ? first : last;
				const lastVerse = last > first ? last : first;
				// console.log('first verse state', first);
				// console.log('last verse state', last);
				// console.log('first verse', firstVerse);
				// console.log('last verse', lastVerse);
				// Getting each offset to determine which is closest to the start of the passage
				const offset = this.state.anchorOffset;
				const focusOffset = this.state.focusOffset;
				const focusText = this.state.focusText;
				const aText = this.state.anchorText;
				const aNode = this.state.anchorNode;
				const eNode = this.state.focusNode;
				// console.log('offset', offset);
				// console.log('focusOffset', focusOffset);
				// console.log('focusText', focusText);
				// console.log('aText', aText);
				const selectedText = this.state.selectedText;
				// const aLength = aText.length;
				// const fLength = focusText.length;
				// Setting my anchors with the data that is closest to the start of the passage
				let anchorOffset = offset < focusOffset ? offset : focusOffset;
				let anchorText = offset < focusOffset ? aText : focusText;
				let node = aNode;
				// console.log('a text', anchorText);
				// console.log('nodes in just 7 verses', preorderTraverse(this.format, []));
				// console.log('a offset', anchorOffset);
				// console.log('first verse', firstVerse, 'last verse', lastVerse);
				if (this.props.formattedSource.main) {
					if (aText !== focusText) {
						// if nodes are different
						// I have access to the parent node
						// if texts match
						// reverse order of anchor and focus
						// if texts dont match
						// find the parent of each that has a verse id
						const aParent = getFormattedParentVerse(aNode);
						const eParent = getFormattedParentVerse(eNode);
						// console.log('a parent and e parent', aParent, '\n', eParent);
						// if the parents are different verses
						if (aParent.isSameNode(eParent)) {
							// It doesn't matter from this point which parent is used since they both reference the same object
							// take the offset that occurs first as a child of the verse
							// console.log('parent verse is the same for both elements');
							// console.log('child nodes for parent', aParent.childNodes);
							// console.log(aParent.childNodes[0].isSameNode(aNode));
							const aIndex = getFormattedChildIndex(aParent, aNode);
							const eIndex = getFormattedChildIndex(aParent, eNode);
							// console.log('a node', aNode, 'e node', eNode);
							// console.log('a index', aIndex, 'e index', eIndex);
							// console.log('a parent childNodes', aParent.childNodes);

							// Use the text and offset of the node that was closest to the start of the verse
							if (aIndex < eIndex) {
								// console.log('aIndex is less than eIndex');
								anchorText = aText;
								anchorOffset = offset;
								node = aNode;
							} else {
								anchorText = focusText;
								node = eNode;
								anchorOffset = focusOffset;
							}
							// (could potentially use next/prev sibling for this)
						} else {
							// take the offset that matches the first(lowest) verse between the two
							// console.log('parent verse is not the same for both elements');
							const aVerseNumber = getFormattedElementVerseId(aParent);
							const eVerseNumber = getFormattedElementVerseId(eParent);
							// console.log('aVerseNumber', aVerseNumber);
							// console.log('eVerseNumber', eVerseNumber);

							// Need to check for which node comes first
							// Use the text and offset of the first verse
							if (aVerseNumber < eVerseNumber) {
								// console.log('aVerseNumber is less than eVerseNumber');
								anchorText = aText;
								node = aNode;
								anchorOffset = offset;
								// If the verse numbers are the same but the verse nodes are different then I am dealing with a psalm
							} else if (aVerseNumber === eVerseNumber) {
								// Use prevChild until I get null and use that node
								// Need to decide here whether to use the anchor text or the focus text
								// console.log('aParent vnums are same', aParent);
								// console.log('eParent vnums are same', eParent);
								// console.log('this.formatHighlight', this.formatHighlight);
								// console.log('aParent', [...this.formatHighlight.children[0].children].indexOf(aParent));
								// console.log('eParent', [...this.formatHighlight.children[0].children].indexOf(eParent));
								const closestParent = getClosestParent({
									aParent,
									eParent,
									verse: firstVerse,
									chapter,
									book: activeBookId,
									refNode: this.formatHighlight || this.format,
								});
								// Find distance from each parent back until there is not a sibling with the same verse number
								// make sure both parents have the q class before searching backwards
								// Does not work when putting highlight in the second portion of a verse
								// Build verse - get the index of the text out of the built verse
								// I think I want to somehow either make the anchor offset based on the resulting text from
								// the previous function or to use the resulting text instead of aNode.textContent but
								// I am not exactly sure which one to do...

								// console.log('closestParent and aParent', closestParent, aParent);
								if (aParent.isSameNode(closestParent)) {
									anchorText = aText;
									node = aNode;
									anchorOffset = offset;
								} else {
									anchorText = focusText;
									node = eNode;
									anchorOffset = focusOffset;
								}
							} else {
								anchorText = focusText;
								node = eNode;
								anchorOffset = focusOffset;
							}
						}
					}
				} else if (aText !== focusText) {
					const aParent = getPlainParentVerseWithoutNumber(aNode);
					const eParent = getPlainParentVerseWithoutNumber(eNode);
					// console.log('a parent and e parent', aParent, '\n', eParent);
					// if the parents are different verses
					if (aParent.isSameNode(eParent)) {
						// It doesn't matter from this point which parent is used since they both reference the same object
						// take the offset that occurs first as a child of the verse
						// console.log('parent verse is the same for both elements');
						// console.log('child nodes for parent', aParent.childNodes);
						// console.log(aParent.childNodes[0].isSameNode(aNode));
						const aIndex = getFormattedChildIndex(aParent, aNode);
						const eIndex = getFormattedChildIndex(aParent, eNode);
						// console.log('a node', aNode, 'e node', eNode);
						// console.log('a index', aIndex, 'e index', eIndex);
						// console.log('a parent childNodes', aParent.childNodes);

						// Use the text and offset of the node that was closest to the start of the verse
						if (aIndex < eIndex) {
							// console.log('aIndex is less than eIndex');
							anchorText = aText;
							node = aNode;
							anchorOffset = offset;
						} else {
							anchorText = focusText;
							node = eNode;
							anchorOffset = focusOffset;
						}
						// (could potentially use next/prev sibling for this)
					} else {
						// take the offset that matches the first(lowest) verse between the two
						// console.log('parent verse is not the same for both elements');
						const aVerseNumber = aParent.attributes['data-verseid'].value;
						const eVerseNumber = eParent.attributes['data-verseid'].value;
						// console.log('aVerseNumber', aVerseNumber);
						// console.log('eVerseNumber', eVerseNumber);

						// Use the text and offset of the first verse
						if (aVerseNumber < eVerseNumber) {
							// console.log('aVerseNumber is less than eVerseNumber');
							anchorText = aText;
							node = aNode;
							anchorOffset = offset;
						} else {
							anchorText = focusText;
							node = eNode;
							anchorOffset = focusOffset;
						}
					}
				}
				// console.log('anchorOffset < focusOffset', anchorOffset < focusOffset);
				// Solve's for formatted text
				// Not so sure about this, seems like in theory it should give me the node closest to the beginning but idk
				let highlightStart = 0;
				let highlightedWords = 0;
				const dist = calcDistance(
					lastVerse,
					firstVerse,
					!!this.props.formattedSource.main,
				);
				// Also need to check for class="v" to ensure that this was the first verse
				if (
					this.props.formattedSource.main &&
					!this.props.userSettings.getIn([
						'toggleOptions',
						'readersMode',
						'active',
					]) &&
					!this.props.userSettings.getIn([
						'toggleOptions',
						'oneVersePerLine',
						'active',
					])
				) {
					// Issue with getting the correct parent node
					node = getFormattedParentVerseNumber(node, firstVerse);

					// At this point "node" is the first verse
					const nodeClassValue =
						(node.attributes &&
							node.attributes.class &&
							node.attributes.class.value) ||
						undefined;
					// console.log('nodeClassValue', nodeClassValue);
					// console.log('node.attributes', node.attributes);

					if (nodeClassValue && nodeClassValue.slice(0, 1) === 'q') {
						// Get all of the nodes with the same data-id that come before this one in the dom
						// Add the textContent length of each node to the anchorOffset
						// console.log('original offset', anchorOffset);
						anchorOffset += getOffsetNeededForPsalms({
							node,
							verse: firstVerse,
							chapter,
							book: activeBookId,
							refNode: this.formatHighlight || this.format,
						});
						// console.log('updated offset', anchorOffset);
					}
					// Need to subtract by 1 since the anchor offset isn't 0 based
					highlightStart = node.textContent.indexOf(anchorText) + anchorOffset;
					// I think this can stay the same as formatted, it could be made shorter potentially
					// need to remove all line breaks and note characters

					highlightedWords =
						selectedText.replace(/[\r\n*✝]/g, '').length - dist;
				} else {
					node = getPlainParentVerse(node, firstVerse);
					// taking off the first 2 spaces and the verse number from the string
					// This should only be the case for the first highlight within that verse
					const newText = node.textContent.slice(0);

					if (
						this.props.userSettings.getIn([
							'toggleOptions',
							'readersMode',
							'active',
						])
					) {
						highlightStart =
							node.textContent.indexOf(anchorText) + anchorOffset;
						highlightedWords = selectedText.replace(/\n/g, '').length;
					} else {
						highlightStart = newText.indexOf(anchorText) + anchorOffset;
						highlightedWords = selectedText.replace(/\n/g, '').length - dist;
					}
				}
				// console.log('whole verse node text content', node.textContent);
				// console.log('calc', node.textContent.indexOf(anchorText) + anchorOffset);
				// plain text 乁(✿ ͡° ͜ʖ ͡°)و
				if (this.props.userId && this.props.userAuthenticated) {
					// console.log('highlight being added - not sending to db atm', {
					// 	book: this.props.activeBookId,
					// 	chapter: this.props.activeChapter,
					// 	verseStart: firstVerse,
					// 	color,
					// 	highlightStart,
					// 	highlightedWords,
					// 	reference: getReference(firstVerse, lastVerse, this.props.activeBookName, this.props.activeChapter),
					// });
					// If the color is none then we are assuming that the user wants whatever they highlighted to be removed
					// We could either remove every highlight that was overlapped by this one, or we could try to update all
					// of those highlights and remove the sections of them that were overlapped

					highlightObject.book = this.props.activeBookId;
					highlightObject.chapter = this.props.activeChapter;
					highlightObject.verseStart = firstVerse;
					highlightObject.color = color;
					highlightObject.highlightStart = highlightStart;
					highlightObject.highlightedWords = highlightedWords;
					if (color === 'none') {
						const highs = this.props.highlights;
						const space = highlightStart + highlightedWords;
						// // console.log('space', space);
						// // console.log('highlightStart', highlightStart);
						const highsToDelete = highs
							.filter(
								(high) =>
									high.verse_start === firstVerse &&
									(high.highlight_start <= space &&
										high.highlight_start + high.highlighted_words >=
											highlightStart),
							)
							.reduce((a, h) => [...a, h.id], []);
						// console.log('highsToDelete', highsToDelete);
						// should add a confirmation or something here
						this.props.deleteHighlights({ ids: highsToDelete });
					} else {
						// console.log('Tried to add the highlight anyway... -_-');
						this.props.addHighlight({
							book: this.props.activeBookId,
							chapter: this.props.activeChapter,
							verseStart: firstVerse,
							color,
							highlightStart,
							highlightedWords,
							reference: getReference(
								firstVerse,
								lastVerse,
								this.props.activeBookName,
								this.props.activeChapter,
							),
						});
					}
				}
			} catch (err) {
				if (process.env.NODE_ENV === 'development') {
					console.warn('Error adding highlight', err); // eslint-disable-line no-console
				} else if (process.env.NODE_ENV === 'test') {
					console.log('Error adding highlight', err); // eslint-disable-line no-console
				}
				// dispatch action to log error and also show an error message
				this.closeContextMenu();
			}
		}

		this.closeContextMenu();

		// Returning the highlight for testing purposes
		return highlightObject;
	};

	addFacebookLike = () => {
		// 	console.log('testing adding a like');
		if (typeof this.window !== 'undefined') {
			const fb = this.window.FB;
			// 	fb.ui({
			// 		method: 'share_open_graph',
			// 		action_type: 'og.likes',
			// 		action_properties: JSON.stringify({
			// 			object: 'http://is.bible.build/',
			// 		}),
			// 	}, (res) => console.log('like res', res));

			fb.api(
				`${process.env.FB_APP_ID}?metadata=1`,
				{
					access_token: process.env.FB_ACCESS,
				},
				(res) => res,
			); // console.log('bible is object res', res));
		}
		this.closeContextMenu();
	};

	openFootnote = ({ id, coords }) => {
		this.setState({
			footnoteState: true,
			contextMenuState: false,
			footnotePortal: {
				message: this.state.footnotes[id],
				closeFootnote: this.closeFootnote,
				coords,
			},
		});
	};

	openContextMenu = (e) => {
		if (typeof this.window !== 'undefined') {
			const rightEdge = this.window.innerWidth - 250;
			const bottomEdge = this.window.innerHeight - 297;
			const x = rightEdge < e.clientX ? rightEdge : e.clientX;
			const y = bottomEdge < e.clientY ? bottomEdge : e.clientY;

			// Using setTimeout 0 so that the check for the selection happens in the next frame and not this one
			// That allows the function that updates the selection to run before this one does
			if (this.timer) {
				clearTimeout(this.timer);
			}
			setTimeout(() => {
				if (
					typeof this.window !== 'undefined' &&
					!this.window.getSelection().toString()
				) {
					this.closeContextMenu();
				} else {
					this.setState({
						coords: { x, y },
						contextMenuState: true,
					});
				}
			}, 0);
		}
	};

	closeFootnote = () => this.setState({ footnoteState: false });

	closeContextMenu = () => {
		this.setState({
			contextMenuState: false,
			activeVerseInfo: { verse: 0, isPlain: false },
		});
	};

	selectedWholeVerse = (verse, isPlain, clientX, clientY, userSelectedText) => {
		// console.log('verse: ', verse, '\nisPlain: ', isPlain);
		if (typeof this.window !== 'undefined') {
			const rightEdge =
				this.window.innerWidth < 500
					? this.window.innerWidth - 295
					: this.window.innerWidth - 250;
			const bottomEdge =
				this.window.innerHeight < 900
					? this.window.innerHeight - 317
					: this.window.innerHeight - 297;
			const x = rightEdge < clientX ? rightEdge : clientX;
			const y = bottomEdge < clientY ? bottomEdge : clientY;

			if (isPlain) {
				// console.log('text array', this.props.text);
				// console.log('stuff to compare plain', verse, this.state.activeVerseInfo.verse);
				// const verseObject = this.props.text.find((v) => v.verse_start === parseInt(verse, 10) || v.verse_start_alt === verse);
				// console.log('verseObject', verseObject);
				this.setState((currentState) => ({
					coords: { x, y },
					wholeVerseIsSelected: !(
						currentState.wholeVerseIsSelected &&
						currentState.activeVerseInfo.verse === verse
					),
					contextMenuState: currentState.activeVerseInfo.verse !== verse,
					lastVerse: currentState.firstVerse,
					activeVerseInfo: {
						verse: currentState.activeVerseInfo.verse !== verse ? verse : 0,
						isPlain,
					},
					userSelectedText,
				}));
			} else {
				// is formatted
				// Adding the highlight here since it has to be done through dom manipulation... -_-
				// console.log('stuff to compare format', verse, this.state.activeVerseInfo.verse);
				// console.log('verseNode', verseNode);
				// console.log('verseNode.textContent', verseNode.textContent);
				this.setState((currentState) => ({
					coords: { x, y },
					wholeVerseIsSelected: !(
						currentState.wholeVerseIsSelected &&
						currentState.activeVerseInfo.verse === verse
					),
					contextMenuState: currentState.activeVerseInfo.verse !== verse,
					lastVerse: currentState.firstVerse,
					activeVerseInfo: {
						verse: currentState.activeVerseInfo.verse !== verse ? verse : 0,
						isPlain,
					},
					userSelectedText,
				}));
			}
		}
	};

	shareHighlightToFacebook = () => {
		if (typeof this.window !== 'undefined') {
			const FB = this.window.FB;
			const { activeBookName: book, activeChapter: chapter } = this.props;
			const { firstVerse: v1, lastVerse: v2, selectedText: sl } = this.state;
			const verseRange =
				v1 === v2
					? `${book} ${chapter}:${v1}\n${sl}`
					: `${book} ${chapter}:${v1}-${v2}\n"${sl}"`;

			FB.ui(
				{
					method: 'share',
					quote: verseRange,
					href: 'http://is.bible.build/',
				},
				(res) => res,
			);
		}
		this.closeContextMenu();
	};

	render() {
		const {
			activeChapter,
			toggleNotesModal,
			notesActive,
			setActiveNotesView,
			formattedSource,
			text,
			loadingNewChapterText,
			loadingAudio,
			userSettings,
			verseNumber,
			activeTextId,
			activeBookId,
			books,
			menuIsOpen,
			isScrollingDown,
			// audioSource,
			// audioPlayerState,
			subFooterOpen,
			textDirection,
			chapterTextLoadingState,
		} = this.props;
		// console.log('____________________________\nText component rendered!', verseNumber);
		// console.log('condition for spinner', loadingNewChapterText ||
		// 	loadingAudio ||
		// 	this.state.loadingNextPage ||
		// 	!books.length ||
		// 	chapterTextLoadingState)
		// console.log('loadingNewChapterText', loadingNewChapterText)
		// console.log('loadingAudio', loadingAudio)
		// console.log('!books.length', !books.length)
		// console.log('chapterTextLoadingState', chapterTextLoadingState)
		// console.log('this.state.loadingNextPage', this.state.loadingNextPage)

		const {
			coords,
			contextMenuState,
			footnoteState,
			footnotePortal,
			formattedVerse,
			userSelectedText,
		} = this.state;
		const readersMode = userSettings.getIn([
			'toggleOptions',
			'readersMode',
			'active',
		]);
		const oneVersePerLine = userSettings.getIn([
			'toggleOptions',
			'oneVersePerLine',
			'active',
		]);
		const chapterAlt = text[0] && text[0].chapter_alt;
		if (
			loadingNewChapterText ||
			loadingAudio ||
			this.state.loadingNextPage ||
			chapterTextLoadingState ||
			(!formattedVerse && formattedSource.main)
		) {
			// console.log('Rendering the spinner');
			return (
				<div
					className={getClassNameForTextContainer(
						isScrollingDown,
						subFooterOpen,
					)}
				>
					<LoadingSpinner />
				</div>
			);
		}

		return (
			<div
				className={getClassNameForTextContainer(isScrollingDown, subFooterOpen)}
			>
				<PrefetchLink
					prefetch
					withData
					as={getPreviousChapterUrl({
						books,
						chapter: activeChapter,
						bookId: activeBookId.toLowerCase(),
						textId: activeTextId.toLowerCase(),
						verseNumber,
						text,
						isHref: false,
					})}
					href={getPreviousChapterUrl({
						books,
						chapter: activeChapter,
						bookId: activeBookId.toLowerCase(),
						textId: activeTextId.toLowerCase(),
						verseNumber,
						text,
						isHref: true,
					})}
				>
					<div
						onClick={
							!isStartOfBible(books, activeBookId, activeChapter) && !menuIsOpen
								? this.handleArrowClick
								: () => {}
						}
						className={
							!isStartOfBible(books, activeBookId, activeChapter) && !menuIsOpen
								? 'arrow-wrapper'
								: 'arrow-wrapper disabled'
						}
					>
						{!isStartOfBible(books, activeBookId, activeChapter) ? (
							<SvgWrapper className="prev-arrow-svg" svgid="arrow_left" />
						) : null}
					</div>
				</PrefetchLink>
				<div className={'main-wrapper'}>
					<main
						ref={this.setMainRef}
						className={getClassNameForMain(
							formattedSource,
							userSettings,
							textDirection,
							menuIsOpen,
						)}
						onScroll={this.handleScrollOnMain}
					>
						{(formattedSource.main && !readersMode && !oneVersePerLine) ||
						text.length === 0 ||
						(!readersMode && !oneVersePerLine) ? null : (
							<div className="active-chapter-title">
								<h1 className="active-chapter-title">
									{chapterAlt || activeChapter}
								</h1>
							</div>
						)}
						{this.getTextComponents(this.state.dommountedsostuffworks)}
						{verseNumber ? (
							<ReadFullChapter
								activeTextId={activeTextId}
								activeBookId={activeBookId}
								activeChapter={activeChapter}
							/>
						) : null}
						<Information />
					</main>
				</div>
				<PrefetchLink
					as={getNextChapterUrl({
						books,
						chapter: activeChapter,
						bookId: activeBookId.toLowerCase(),
						textId: activeTextId.toLowerCase(),
						verseNumber,
						text,
						isHref: false,
					})}
					href={getNextChapterUrl({
						books,
						chapter: activeChapter,
						bookId: activeBookId.toLowerCase(),
						textId: activeTextId.toLowerCase(),
						verseNumber,
						text,
						isHref: true,
					})}
					withData
					prefetch
				>
					<div
						onClick={
							!isEndOfBible(books, activeBookId, activeChapter) && !menuIsOpen
								? this.handleArrowClick
								: () => {}
						}
						className={
							!isEndOfBible(books, activeBookId, activeChapter) && !menuIsOpen
								? 'arrow-wrapper'
								: 'arrow-wrapper disabled'
						}
					>
						{!isEndOfBible(books, activeBookId, activeChapter) ? (
							<SvgWrapper className="next-arrow-svg" svgid="arrow_right" />
						) : null}
					</div>
				</PrefetchLink>
				{contextMenuState ? (
					<ContextPortal
						handleAddBookmark={this.handleAddBookmark}
						addHighlight={this.addHighlight}
						addFacebookLike={this.addFacebookLike}
						shareHighlightToFacebook={this.shareHighlightToFacebook}
						setActiveNote={this.setActiveNote}
						setActiveNotesView={setActiveNotesView}
						closeContextMenu={this.closeContextMenu}
						toggleNotesModal={toggleNotesModal}
						notesActive={notesActive}
						coordinates={coords}
						selectedText={userSelectedText}
					/>
				) : null}
				{footnoteState ? <FootnotePortal {...footnotePortal} /> : null}
				{this.state.popupOpen ? (
					<PopupMessage
						message={<PleaseSignInMessage message={'toUseFeature'} />}
						x={this.state.popupCoords.x}
						y={this.state.popupCoords.y}
					/>
				) : null}
			</div>
		);
	}
}

Text.propTypes = {
	text: PropTypes.array,
	books: PropTypes.array,
	userNotes: PropTypes.array,
	bookmarks: PropTypes.array,
	highlights: PropTypes.array,
	userSettings: PropTypes.object,
	formattedSource: PropTypes.object,
	addBookmark: PropTypes.func,
	addHighlight: PropTypes.func,
	setActiveNote: PropTypes.func,
	deleteHighlights: PropTypes.func,
	toggleNotesModal: PropTypes.func,
	setActiveNotesView: PropTypes.func,
	setTextLoadingState: PropTypes.func,
	activeChapter: PropTypes.number,
	// distance: PropTypes.number,
	menuIsOpen: PropTypes.bool,
	notesActive: PropTypes.bool,
	loadingAudio: PropTypes.bool,
	subFooterOpen: PropTypes.bool,
	// invalidBibleId: PropTypes.bool,
	isScrollingDown: PropTypes.bool,
	chapterTextLoadingState: PropTypes.bool,
	// audioPlayerState: PropTypes.bool,
	userAuthenticated: PropTypes.bool,
	loadingNewChapterText: PropTypes.bool,
	userId: PropTypes.string,
	bibleId: PropTypes.string,
	verseNumber: PropTypes.string,
	activeTextId: PropTypes.string,
	activeBookId: PropTypes.string,
	audioSource: PropTypes.string,
	activeBookName: PropTypes.string,
	textDirection: PropTypes.string,
};

export default Text;
