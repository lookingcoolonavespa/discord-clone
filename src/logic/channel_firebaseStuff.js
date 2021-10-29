import { updatePassword } from '@firebase/auth';
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  onValue,
  off,
  orderByValue,
  limitToFirst,
  onDisconnect,
} from 'firebase/database';
import { db } from '../firebaseStuff';
import { isUserOnline } from './user_firebaseStuff';

function detachListenersForChannel(channelID, uid) {
  const userRolesRef = ref(db, `Channels/${channelID}/user_roles`);
  const roomCategoriesRef = ref(db, `Channels/${channelID}/room_categories`);
  const roomListRef = ref(db, `Channels/${channelID}/rooms`);
  const unreadRoomsRef = ref(db, `users/${uid}/unread_rooms/${channelID}`);
  const onlineUsersRef = ref(db, `Channels/${channelID}/online_users`);

  off(unreadRoomsRef);
  off(userRolesRef);
  off(roomCategoriesRef);
  off(roomListRef);
  off(onlineUsersRef);
}

async function getChannelName(id, setError) {
  try {
    const channelNameRef = ref(db, `Channels/${id}/name`);

    const data = await get(channelNameRef);

    return data.val();
  } catch (error) {
    setError && setError(error.message);
  }
}

async function createRoom(channelID, name, setError) {
  try {
    const channelRoomListRef = ref(db, `Channels/${channelID}/rooms`);
    const newRoomRef = push(channelRoomListRef);
    set(newRoomRef, { name });

    set(ref(db, `Rooms/${newRoomRef.key}`), {
      name,
    });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

function getRoomList(channelID, setRoomList) {
  const roomsRef = ref(db, `Channels/${channelID}/rooms`);

  onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();

    let roomList = [];
    for (const id in data) {
      roomList.push({ ...data[id], id });
    }
    setRoomList(roomList);
  });
}

async function getUnreadRooms(uid, channelID, setUnreadRooms, setError) {
  try {
    const unreadRoomsRef = ref(db, `users/${uid}/unread_rooms/${channelID}`);

    onValue(unreadRoomsRef, (snap) => {
      const data = snap.val();
      if (!data) return setUnreadRooms([]);

      const unreadRooms = Object.keys(data);

      setUnreadRooms(unreadRooms);
    });
  } catch (error) {
    setError && setError(error.message);
  }
}

async function getMentions(uid, channelID, setRoomsMentioned, setError) {
  const mentionsRef = ref(db, `users/${uid}/mentions/${channelID}`);

  try {
    onValue(mentionsRef, (snap) => {
      const data = snap.val();
      console.log(data);
      setRoomsMentioned(data);
    });
  } catch (error) {
    setError(error.message);
  }
}

function getRoomCategories(channelID, setRoomCategories, setError) {
  try {
    const roomCategoriesRef = ref(db, `Channels/${channelID}/room_categories`);
    onValue(roomCategoriesRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      const roomCategories = Object.keys(data);
      setRoomCategories(['none', ...roomCategories]);
    });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

function createRoomCategory(channelID, name, setError) {
  try {
    const channelRoomCategoriesRef = ref(
      db,
      `Channels/${channelID}/room_categories`
    );
    update(channelRoomCategoriesRef, { [name]: true });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

function updateCategoryOfRoom(channelID, roomId, category, setError) {
  try {
    const channelRoomRef = ref(db, `Channels/${channelID}/rooms/${roomId}`);
    update(channelRoomRef, { category });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

async function getOnlineUsers(channelID, setUserList, setError) {
  const onlineUsersRef = ref(db, `Channels/${channelID}/online_users`);

  try {
    onValue(onlineUsersRef, (snapshot) => {
      let data = snapshot.val();
      let userList = [];
      for (const id in data) {
        userList.push(data[id]);
      }

      setUserList(userList);
    });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

async function getUsersForMentions(channelID, query, setError) {
  try {
    const channelUsersRef = ref(db, `Channels/${channelID}`);

    const results = query(
      channelUsersRef,
      orderByValue().startAt(query).limitToFirst(5)
    );

    const data = await get(results);

    return data.val();
  } catch (error) {
    setError && setError(error.message);
  }
}

async function createUserRole(channelID, role, setError) {
  try {
    const channelUserRolesRef = ref(db, `Channels/${channelID}/user_roles`);
    /* const newRoleRef = push(channelUserRolesRef);
    set(newRoleRef, { role }); */

    update(channelUserRolesRef, { [role]: true });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
}

async function getUserRoles(channelID, setUserRoles, setError) {
  try {
    const channelUserRolesRef = ref(db, `Channels/${channelID}/user_roles`);

    onValue(channelUserRolesRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const userRoles = Object.keys(data);

      setUserRoles([...userRoles, 'Online']);
    });
  } catch (error) {
    setError && setError(error.message);
    console.log(error);
  }
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

async function updateRoleOfUser(channelID, userId, role, setError) {
  try {
    let updates = {};
    updates[`users/${userId}/channels/${channelID}`] = role;
    if (isUserOnline(userId))
      updates[`Channels/${channelID}/online_users/${userId}/role`] = role;

    update(ref(db), updates);
  } catch (error) {
    setError && setError(error.message);
  }
}

// async function getUnreadRooms(channelID, userId, roomList, setError) {
// try {

// }
// }

export {
  getChannelName,
  getRoomCategories,
  createRoomCategory,
  updateCategoryOfRoom,
  getUnreadRooms,
  getMentions,
  getRoomList,
  createRoom,
  getOnlineUsers,
  getUserRoles,
  getRoleOfUser,
  createUserRole,
  updateRoleOfUser,
  getUsersForMentions,
  detachListenersForChannel,
};
