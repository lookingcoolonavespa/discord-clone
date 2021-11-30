import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import ChannelList from './ChannelList';

import '../../styles/MainNav.css';
import ChannelListHeader from './ChannelListHeader';
import MainNavBtn from './MainNavBtn';
import CreateChannel from '../CreateChannel/CreateChannel';

import plusSVG from '../../assets/svg/add-line.svg';
import compassSVG from '../../assets/svg/compass-3-fill.svg';

const MainNav = ({ beginCreateChannel, isCreateChannel }) => {
  const history = useHistory();
  return (
    <>
      <nav id="main-nav">
        <ChannelListHeader />
        <div className="scroller">
          <ChannelList />
          <div className="btn-ctn">
            <MainNavBtn
              svg={plusSVG}
              active={isCreateChannel}
              onClick={beginCreateChannel}
              tooltipText={'Create a channel'}
            />
            {/* add a server */}
            <MainNavBtn
              svg={compassSVG}
              active={history.location.pathname.includes('explore')}
              onClick={() => history.push('/explore')}
              tooltipText={'Explore public channels'}
            />
          </div>
          {/* explore servers */}
        </div>
      </nav>
    </>
  );
};

export default MainNav;
