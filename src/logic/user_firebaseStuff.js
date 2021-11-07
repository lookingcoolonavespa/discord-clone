import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  onValue,
  off,
  onDisconnect,
} from 'firebase/database';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getRoleOfUser, getRoomList } from './channel_firebaseStuff';
import { db } from '../firebaseStuff';
import getUnixTime from 'date-fns/getUnixTime';

function detachListenersForUser(uid) {
  const channelListRef = ref(db, `users/${uid}/channels`);

  off(channelListRef);
}

async function createUser(
  email,
  password,
  displayName,
  channelID,
  setUser,
  setError
) {
  const auth = getAuth();
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(userCredential.user, { displayName });
    if (channelID) {
      let updates = {};

      updates[`users/${userCredential.user.uid}/channels`] = {
        [channelID]: '',
      };

      updates[`Channels/${channelID}/users/${userCredential.user.uid}`] = {
        displayName,
        avatar: '',
      };

      update(ref(db), updates);
    }

    setUser(userCredential.user);

    return true;
  } catch (error) {
    console.log(error);
    setError && setError(error.message);
    return false;
    //setError(error.code);
  }
}

function signIn(email, password, setError) {
  const auth = getAuth();
  try {
    signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.log(error);
    setError && setError(error.message);
    //setError(error.code);
  }
}

async function subscribeToChannel(uid, channelID, setError) {
  try {
    const newChannelRef = ref(db, `users/${uid}/channels/${channelID}`);

    let roomList = [];
    await getRoomList(channelID, updateRoomList);
    if (roomList.length === 0) return;

    let updates = {};
    roomList.forEach((roomID) => {
      updates[
        `users/${uid}/channels/${channelID}/unread_rooms/${roomID}`
      ] = true;
    });
    update(ref(db), updates);

    function updateRoomList(list) {
      roomList = list;
    }
  } catch (error) {
    setError && setError(error);
  }
}

function getChannelList(uid, setChannelList, setError) {
  try {
    const userChannelListRef = ref(db, `users/${uid}/channels`);

    let channelList = [];
    onValue(userChannelListRef, (snap) => {
      const data = snap.val();

      for (const id in data) {
        channelList.push({ role: data[id], id });
      }
      setChannelList(channelList);
    });
  } catch (error) {
    setError && setError(error.message);
  }
}

function updateUserOnline(uid, userChannelList, setError) {
  try {
    const connectedRef = ref(db, '.info/connected');
    const userRef = ref(db, `users/${uid}`);

    // add user to online_users for all channels in their list
    userChannelList.forEach((channel) => {
      const userStatusRef = ref(db, `Channels/${channel.id}/users/${uid}`);

      onValue(connectedRef, async (snapshot) => {
        if (snapshot.val() === false) {
          off(connectedRef);
          detachListenersForUser(uid);
        }

        await onDisconnect(userStatusRef).update({ status: 'offline' });
        await onDisconnect(userRef).update({
          isOnline: false,
          last_logged_in: getUnixTime(new Date()),
        });

        update(userStatusRef, {
          status: 'online',
        });
        update(userRef, { isOnline: true });
      });
    });
  } catch (error) {
    setError(error.message);
  }
}

function updateMentions(uid, channelID, roomID, msgID, setError) {
  const mentionsRef = ref(
    db,
    `users/${uid}/mentions/${channelID}/${roomID}/${msgID}`
  );
  try {
    set(mentionsRef, true);
  } catch (error) {
    setError(error.message);
  }
}

function isUserOnline(uid) {
  const userRef = ref(db, `users/${uid}/isOnline`);

  return get(userRef);
}

export {
  createUser,
  signIn,
  isUserOnline,
  subscribeToChannel,
  getChannelList,
  updateUserOnline,
  updateMentions,
  detachListenersForUser,
};
