import React, { useState, useCallback } from 'react';

import {
  createChannel,
  uploadChannelIcon,
  changeChannelIcon,
} from '../../logic/channel_firebaseStuff';
import { subscribeToChannel } from '../../logic/user_firebaseStuff';

import Modal from '../Modal';
import NodeOne from './NodeOne';

import '../../styles/CreateChannel.css';
import NodeTwo from './NodeTwo';

const CreateChannel = ({ user, close }) => {
  const [node, setNode] = useState(1);
  const [channelInfo, setChannelInfo] = useState({
    name: `${user.displayName}'s channel`,
    icon: {},
    isPrivate: '',
  });

  function ontoNextNode() {
    setNode((prev) => prev + 1);
  }

  function prevNode() {
    setNode((prev) => prev - 1);
  }

  const onCreateChannel = useCallback(
    async function onCreateChannel() {
      const channelID = await createChannel(channelInfo.name);
      if (channelInfo.icon instanceof File) {
        const iconURL = await uploadChannelIcon(channelID, channelInfo.icon);
        changeChannelIcon(channelID, iconURL);
      }
      subscribeToChannel(user, channelID);
    },
    [channelInfo, user]
  );

  return (
    <Modal close={close}>
      {node === 1 && (
        <NodeOne
          nextNode={ontoNextNode}
          setChannelInfo={(status) =>
            setChannelInfo((prev) => ({ ...prev, isPrivate: status }))
          }
          close={close}
        />
      )}
      {node === 2 && (
        <NodeTwo
          createChannel={onCreateChannel}
          prevNode={prevNode}
          channelName={channelInfo.name}
          handleChange={(e) =>
            setChannelInfo((prev) => ({
              ...prev,
              [e.target.name]: e.target.value,
            }))
          }
          handleIcon={(icon) => setChannelInfo((prev) => ({ ...prev, icon }))}
          close={close}
        />
      )}
    </Modal>
  );
};

export default CreateChannel;
