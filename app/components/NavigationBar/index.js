/**
*
* NavigationBar
*
*/

import React from 'react';
import Logo from 'components/Logo';
import ChapterButton from 'components/ChapterButton';
import SearchButton from 'components/SearchButton';
// import styled from 'styled-components';

// import { FormattedMessage } from 'react-intl';
// import messages from './messages';

class NavigationBar extends React.PureComponent { // eslint-disable-line react/prefer-stateless-function
  render() {
    // const {
    //   toggleVersionSelect,
    //   activeTextName,
    // } = this.props;

    return (
      <nav>
        <div className="small-3 columns">
          <Logo />
        </div>
        <div className="small-6 columns">
          <button className="version-button">active text</button>
          <ChapterButton />
          <form id="search-form" method="post" action="/search" _lpchecked="1">
            <input type="hidden" name="_token" value="c7sP4piHloj4OtAJaujus64WWylkp5OxR1leypxZ" />
            <input className="search" type="text" name="search" placeholder="Romanos 10:17 or Jesus" />
            <input type="hidden" name="bible_id" id="volume" value="ENGNIV" />
            <SearchButton />
          </form>
        </div>
        <div className="small-3 columns">
          <button className="font-button">Aa</button>
        </div>
      </nav>
    );
  }
}

NavigationBar.propTypes = {

};

export default NavigationBar;
