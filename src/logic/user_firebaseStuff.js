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
  updateEmail,
  updatePassword,
  deleteUser,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reload,
  signOut,
} from 'firebase/auth';
import { ref as store, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getChannelIcons,
  getChannelNames,
  getInfoForChannelList,
} from './channel_firebaseStuff';
import { db, storage } from '../firebaseStuff';
import getUnixTime from 'date-fns/getUnixTime';

function sendPWResetEmail(email) {
  const auth = getAuth();
  sendPasswordResetEmail(auth, email);
}

function detachListenersForUser(uid) {
  const channelListRef = ref(db, `users/${uid}/channels`);

  off(channelListRef);
}

async function uploadAvatar(uid, image) {
  const userAvatarRef = store(storage, `user_avatars/${uid}`);
  await uploadBytes(userAvatarRef, image);
  const avatarURL = await getDownloadURL(userAvatarRef);
  return avatarURL;
}

async function updateUserInfo(infoType, value, setUser, channelList) {
  const auth = getAuth();
  const user = auth.currentUser;

  switch (infoType) {
    case 'displayName': {
      await updateProfile(user, { displayName: value });
      break;
    }
    case 'avatar': {
      await updateProfile(user, { photoURL: value });
      break;
    }
    case 'color': {
      await updateUserProfileColor(user.uid, value);
      break;
    }
    case 'email': {
      await updateEmail(user, value);
      break;
    }
    case 'password': {
      await updatePassword(user, value);
      break;
    }
    default: {
      return;
    }
  }
  if (channelList && channelList.length > 0) {
    const updateObj = { [infoType]: value };
    updateUserInfoForAllChannels(user.uid, channelList, updateObj);
  }

  await reload(user);
  setUser(user);
  return;
}
function updateUserProfileColor(uid, color) {
  const defaultColors = [
    'rgb(92, 100, 244)',
    'rgb(237, 66, 69)',
    'rgb(250, 166, 26)',
  ];
  color =
    color || defaultColors[Math.floor(Math.random() * defaultColors.length)];

  const userRef = ref(db, `users/${uid}`);
  update(userRef, { color });

  return color;
}
function updateUserInfoForAllChannels(uid, channelList, updateObj) {
  channelList.forEach(async (c) => {
    await update(ref(db, `Channels/${c.id}/users/${uid}`), updateObj);
  });
}
async function removeUser(channelList, setError) {
  const auth = getAuth();
  const user = auth.currentUser;
  try {
    await deleteUser(user);
  } catch (error) {
    setError && setError(error.message);
  }
}

async function createUser(email, password, displayName, channelID, setUser) {
  const auth = getAuth();
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  await updateProfile(userCredential.user, { displayName });
  const profileColor = await updateUserProfileColor(userCredential.user.uid);
  userCredential.user.color = profileColor;

  if (channelID) subscribeToChannel(userCredential.user, channelID);

  setUser(userCredential.user);
}

async function signIn(email, password) {
  const auth = getAuth();
  await signInWithEmailAndPassword(auth, email, password);
}

async function subscribeToChannel(user, channelID) {
  let updates = {};
  updates[`users/${user.uid}/channels/${channelID}`] = '';

  updates[`Channels/${channelID}/users/${user.uid}`] = {
    displayName: user.displayName,
    avatar: user.photoURL || '',
    color: user.color,
  };

  await update(ref(db), updates);
}

async function getUserInfo(uid, setChannelList, setUserProfileColor) {
  const userRef = ref(db, `users/${uid}/`);

  onValue(userRef, async (snap) => {
    const data = snap.val();

    setUserProfileColor(data.color);
    updateChannelList();

    //helper
    async function updateChannelList() {
      let channelList = [];
      for (const id in data.channels) {
        channelList.push({ id, role: data.channels[id] });
      }
      await getInfoForChannelList(
        'icon',
        channelList,
        updateChannelListWithInfo
      );
      await getInfoForChannelList(
        'name',
        channelList,
        updateChannelListWithInfo
      );
      await getInfoForChannelList(
        'defaultRoom',
        channelList,
        updateChannelListWithInfo
      );
      await setChannelList(channelList);

      //helpers
      function updateChannelListWithInfo(type, vals) {
        vals.forEach((v, i) => (channelList[i][type] = v));
      }
    }
  });
}

async function getRoleOfUser(channelID, userId, setRole, setError) {
  try {
    const userRoleRef = ref(db, `users/${userId}/channels/${channelID}`);
    onValue(userRoleRef, (snap) => {
      const data = snap.val();

      setRole(data);
    });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

function updateUserOnline(uid, userChannelList) {
  const connectedRef = ref(db, '.info/connected');
  // add user to online_users for all channels in their list
  userChannelList.forEach((channel) => {
    const userStatusRef = ref(db, `Channels/${channel.id}/users/${uid}`);

    onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() === false) {
        off(connectedRef);
        detachListenersForUser(uid);
      }

      await onDisconnect(userStatusRef).update({ status: 'offline' });

      update(userStatusRef, {
        status: 'online',
      });
    });
  });
}

function updateMentions(uid, channelID, roomID, msgID) {
  const mentionsRef = ref(
    db,
    `users/${uid}/mentions/${channelID}/${roomID}/${msgID}`
  );
  set(mentionsRef, true);
}

async function getMentions(uid, channelID, setRoomsMentioned, setError) {
  const mentionsRef = ref(db, `users/${uid}/mentions/${channelID}`);

  try {
    onValue(mentionsRef, (snap) => {
      const data = snap.val();
      setRoomsMentioned(data);
    });
  } catch (error) {
    setError(error.message);
  }
}

function isUserOnline(uid) {
  const userRef = ref(db, `users/${uid}/isOnline`);

  return get(userRef);
}

async function verifyPW(pw) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { isValid: true };
  try {
    const credential = EmailAuthProvider.credential(user.email, pw);

    const status = await reauthenticateWithCredential(user, credential);
    if (status) return { isValid: true };
    return { error: 'something went wrong' };
  } catch (error) {
    return { error: error.message };
  }
}

async function logout() {
  const auth = getAuth();
  signOut(auth);
}

export {
  uploadAvatar,
  sendPWResetEmail,
  updateUserInfoForAllChannels,
  updateUserProfileColor,
  updateUserInfo,
  getUserInfo,
  createUser,
  signIn,
  isUserOnline,
  getRoleOfUser,
  getMentions,
  subscribeToChannel,
  updateUserOnline,
  updateMentions,
  detachListenersForUser,
  verifyPW,
  removeUser,
  logout,
};
