import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useContext,
} from 'react';
import { Link } from 'react-router-dom';

import { ErrorContext } from '../../logic/contexts/ErrorContext';
import {
  getPublicChannels,
  searchPublicChannels,
} from '../../logic/channel_firebaseStuff';

import Sidebar from '../Settings/Sidebar';
import UserInfo from '../UserInfo/UserInfo_desktop';
import ChannelCard from './ChannelCard';
import NavBtn from '../NavBtn';
import BannerSearch from './BannerSearch';
import LoadingScreen from '../LoadingScreen';
import MainNav from '../MainNav/MainNav_desktop';

import prevSVG from '../../assets/svg/arrow-left-s-line.svg';
import nextSVG from '../../assets/svg/arrow-right-s-line.svg';

import '../../styles/Explore.css';

const Explore = ({ finishLoading }) => {
  const { setError } = useContext(ErrorContext);
  const [publicChannelList, setPublicChannelList] = useState([]);
  const firstChannelID = useRef(null);
  const [query, setQuery] = useState();
  const searchedQuery = useRef();
  const [isSearch, setIsSearch] = useState(false);
  const scrollerRef = useRef();
  const [loading, setLoading] = useState(true);

  useEffect(() => finishLoading(), [finishLoading]);

  const getBatchOfChannels = useCallback(
    async (status, key) => {
      try {
        setLoading(true);
        const data = await getPublicChannels(status, key);
        console.log(data);
        if (status === 'init') firstChannelID.current = data[0].id;
        setPublicChannelList(data);
        setLoading(false);
        if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
      } catch (error) {
        setError(error.message);
      }
    },
    [setError]
  );
  useEffect(() => {
    getBatchOfChannels('init');
  }, [getBatchOfChannels, setError]);

  const searchChannels = useCallback(async () => {
    setLoading(true);
    try {
      if (!query) {
        setQuery('');
        setIsSearch(false);
        return await getBatchOfChannels('init');
      }
      const data = await searchPublicChannels(query);
      searchedQuery.current = query;
      setLoading(false);
      setIsSearch(true);
      setPublicChannelList(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  }, [query, getBatchOfChannels, setError]);

  return (
    <div className="explore-view">
      <div className="nav-ctn">
        <MainNav />
        <nav className="sidebar view-sidebar">
          <header>
            <h2>Discover</h2>
          </header>
          <Sidebar
            btnList={[
              { text: 'Home', isDefault: true },
              { text: 'Gaming' },
              { text: 'Technology' },
            ]}
          />
          <UserInfo />
        </nav>
      </div>
      <main>
        <header>
          <BannerSearch
            onSearch={searchChannels}
            handleChange={(e) => setQuery(e.target.value)}
            cancelSearch={() => {
              setIsSearch(false);
              setQuery('');
              getBatchOfChannels('init');
            }}
            query={query}
          />
        </header>
        <div className="content">
          {isSearch ? (
            <div className="text-wrapper">
              <h3>Search results for: "{searchedQuery.current}"</h3>
            </div>
          ) : (
            <div className="page-navigation">
              <div className="btn-ctn">
                <NavBtn
                  icon={prevSVG}
                  text={'Prev'}
                  className={
                    publicChannelList.find(
                      (c) => c.id === firstChannelID.current
                    )
                      ? 'default_transition inactive'
                      : 'default_transition'
                  }
                  onClick={() =>
                    getBatchOfChannels('prev', publicChannelList[0].id)
                  }
                />
                <NavBtn
                  icon={nextSVG}
                  text={'Next'}
                  className={
                    publicChannelList.length % 20 !== 0 ||
                    publicChannelList.length === 0
                      ? 'flex-reverse default_transition inactive'
                      : 'flex-reverse default_transition'
                  }
                  onClick={() =>
                    getBatchOfChannels(
                      'next',
                      publicChannelList[publicChannelList.length - 1].id
                    )
                  }
                />
              </div>
            </div>
          )}
          <div className="publicChannels-ctn">
            {loading ? (
              <LoadingScreen />
            ) : (
              <div className="scroller" ref={scrollerRef}>
                <div className="scroller-content">
                  <ol>
                    {publicChannelList.map((c) => (
                      <Link to={`/channels/${c.id}`} key={c.id}>
                        <ChannelCard channel={c} />
                      </Link>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;
