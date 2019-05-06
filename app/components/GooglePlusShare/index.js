import React from 'react';
import PropTypes from 'prop-types';
import SvgWrapper from '../SvgWrapper';

class GooglePlusShare extends React.PureComponent {
  componentDidMount() {
    /* eslint-disable no-undef */
    if (typeof gapi !== 'undefined' && process.env.GOOGLE_APP_ID_PROD && process.env.GOOGLE_SECRET_PROD) {
      const options = {
        contenturl: window.location.href,
        contentdeeplinkid: '/bible',
        clientid: process.env.GOOGLE_APP_ID_PROD,
        clientsecret: process.env.GOOGLE_SECRET_PROD,
        cookiepolicy: 'single_host_origin',
        prefilltext: `"${this.props.quote}" - ${document.title}`,
        calltoactionlabel: 'VISIT',
        calltoactionurl: window.location.href,
        calltoactiondeeplinkid: window.location.pathname,
      };

      gapi.interactivepost.render('sharePost', options);
      /* eslint-enable no-undef */
    }
  }

  render() {
    if (process.env.GOOGLE_APP_ID_PROD && process.env.GOOGLE_SECRET_PROD) {
      return (
        <div
          id="sharePost"
          className="SocialMediaShareButton SocialMediaShareButton--googlePlus menu-item social google"
        >
          <SvgWrapper className="icon" svgid="google" />
        </div>
      );
    }

    return (
      <div id="sharePost" className="SocialMediaShareButton SocialMediaShareButton--googlePlus menu-item social google">
        N/A
      </div>
    );
  }
}

GooglePlusShare.propTypes = {
  quote: PropTypes.string,
};

export default GooglePlusShare;
