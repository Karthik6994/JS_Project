// --- Firebase Imports ---
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { 
  getAuth, 
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js';

// --- Firebase Config (from index.html) ---
const firebaseConfig = {
  apiKey: "AIzaSyDtXS_4meIBVh7L1Psz2VCgV9Kq0QnD3k8",
  authDomain: "studyspheree-1da28.firebaseapp.com",
  databaseURL: "https://studyspheree-1da28-default-rtdb.firebaseio.com/",
  projectId: "studyspheree-1da28",
  storageBucket: "studyspheree-1da28.firebasestorage.app",
  messagingSenderId: "520045957983",
  appId: "1:520045957983:web:8b57fda16800c10d16dcea"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- DOM Elements ---
const groupListEl = document.getElementById('groupList');
const createGroupBtn = document.getElementById('createGroupBtn');
const joinGroupBtn = document.getElementById('joinGroupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

// Modals and inputs
const createGroupModal = document.getElementById('createGroupModal');
const joinGroupModal = document.getElementById('joinGroupModal');
const cancelCreate = document.getElementById('cancelCreate');
const cancelJoin = document.getElementById('cancelJoin');
const createGroupForm = document.getElementById('createGroupForm');
const joinGroupForm = document.getElementById('joinGroupForm');

const groupNameInput = document.getElementById('groupNameInput');
const subjectInput = document.getElementById('subjectInput');
const descriptionInput = document.getElementById('descriptionInput');
const groupCodeInput = document.getElementById('groupCodeInput');

// Alert/Confirm Modals
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');
const alertCloseBtn = document.getElementById('alertCloseBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmBtnYes = document.getElementById('confirmBtnYes');
const confirmBtnNo = document.getElementById('confirmBtnNo');

// --- Global User Object ---
let currentUser = null;

// --- Custom Alert/Confirm Functions ---
function showAlert(message) {
  alertMessage.textContent = message;
  alertModal.style.display = "flex";
}
alertCloseBtn.onclick = () => (alertModal.style.display = "none");

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmModal.style.display = "flex";

    confirmBtnYes.onclick = () => {
      confirmModal.style.display = "none";
      resolve(true);
    };
    confirmBtnNo.onclick = () => {
      confirmModal.style.display = "none";
      resolve(false);
    };
  });
}

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    currentUser = user;
    userEmailEl.textContent = user.displayName || user.email;
    initializeDashboard();
  } else {
    // User is signed out
    currentUser = null;
    window.location.href = 'index.html';
  }
});

// --- Initialize Dashboard (runs after auth) ---
function initializeDashboard() {
  if (!currentUser) return; // Should be impossible, but good check

  // --- Modal Handling ---
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  function closeModal(modal) {
    modal.style.display = 'none';
  }

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === createGroupModal) closeModal(createGroupModal);
    if (e.target === joinGroupModal) closeModal(joinGroupModal);
    if (e.target === alertModal) closeModal(alertModal);
    if (e.target === confirmModal) closeModal(confirmModal);
  });

  cancelCreate.addEventListener('click', () => closeModal(createGroupModal));
  cancelJoin.addEventListener('click', () => closeModal(joinGroupModal));

  // --- Create Group ---
  createGroupBtn.addEventListener('click', () => openModal(createGroupModal));

  createGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const groupName = groupNameInput.value.trim();
    if (!groupName) return showAlert('Group name is required.');

    const subject = subjectInput.value.trim() || 'General';
    const description = descriptionInput.value.trim() || 'No description provided.';

    // Generate a 6-char random ID
    const groupId = Math.random().toString(36).substring(2, 8);

    try {
      // Create group globally
      await set(ref(db, `groups/${groupId}`), {
        name: groupName,
        subject: subject,
        description: description,
        createdBy: currentUser.uid,
        members: {
          [currentUser.uid]: {
            displayName: currentUser.displayName || currentUser.email,
          },
        },
      });

      // Add group under user’s list
      await set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), {
        name: groupName,
        subject: subject,
        description: description,
      });

      createGroupForm.reset();
      closeModal(createGroupModal);
    } catch (err) {
      console.error('Error creating group:', err);
      showAlert('Failed to create group. Please try again.');
    }
  });

  // --- Join Group ---
  joinGroupBtn.addEventListener('click', () => openModal(joinGroupModal));

  joinGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const groupId = groupCodeInput.value.trim();
    if (!groupId) return;

    try {
      const groupSnap = await get(ref(db, `groups/${groupId}`));
      if (!groupSnap.exists()) {
        showAlert('Invalid group code!');
        return;
      }

      const groupData = groupSnap.val();

      // Add user to group’s members list
      await set(ref(db, `groups/${groupId}/members/${currentUser.uid}`), {
        displayName: currentUser.displayName || currentUser.email,
      });

      // Add group to user’s list
      await set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), {
        name: groupData.name || 'Unnamed Group',
        subject: groupData.subject || 'General',
        description: groupData.description || 'No description',
      });

      joinGroupForm.reset();
      closeModal(joinGroupModal);
    } catch (err) {
      console.error('Error joining group:', err);
      showAlert('Failed to join group.');
    }
  });

  // --- Logout ---
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle the redirect
    } catch (error) {
      console.error('Error signing out:', error);
      showAlert('Failed to sign out.');
    }
  });

  // --- Load Groups ---
  loadGroups();
}

// --- Helper: Sanitize Text ---
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Open Group ---
window.openGroup = (groupId) => {
  window.location.href = `group.html?id=${groupId}`;
};

// --- Leave Group ---
window.leaveGroup = async (groupId) => {
  if (!currentUser) return;
  
  const confirmLeave = await showConfirm('Are you sure you want to leave this group?');
  if (!confirmLeave) return;

  try {
    const groupRef = ref(db, `groups/${groupId}/members/${currentUser.uid}`);
    const userGroupRef = ref(db, `users/${currentUser.uid}/groups/${groupId}`);

    await remove(groupRef);
    await remove(userGroupRef);

    // Check if group is empty and delete if so
    const membersSnap = await get(ref(db, `groups/${groupId}/members`));
    if (!membersSnap.exists()) {
      await remove(ref(db, `groups/${groupId}`));
    }
  } catch (err) {
    console.error('Error leaving group:', err);
    showAlert('Error leaving group.');
  }
};

// --- Load Groups ---
function loadGroups() {
  if (!currentUser) return;
  const userGroupsRef = ref(db, `users/${currentUser.uid}/groups`);

  onValue(
    userGroupsRef,
    async (snapshot) => {
      groupListEl.innerHTML = '';
      const groups = snapshot.val();

      if (!groups) {
        groupListEl.innerHTML = '<p class="empty-state">You haven\'t joined any groups yet. Create one or join one!</p>';
        return;
      }

      for (const [groupId, groupData] of Object.entries(groups)) {
        let name = groupData.name;
        let subject = groupData.subject;
        let description = groupData.description;

        // Fallback for older entries (syncs user's list with global list)
        if (!name || name === 'Unnamed Group' || typeof groupData !== 'object') {
          try {
            const groupSnap = await get(ref(db, `groups/${groupId}`));
            if (groupSnap.exists()) {
              const fullGroup = groupSnap.val();
              name = fullGroup.name || 'Unnamed Group';
              subject = fullGroup.subject || 'General';
              description = fullGroup.description || '';

              // Resync the user's group record
              await set(ref(db, `users/${currentUser.uid}/groups/${groupId}`), {
                name,
                subject,
                description,
              });
            } else {
              // Group doesn't exist in global, remove from user's list
              await remove(ref(db, `users/${currentUser.uid}/groups/${groupId}`));
              continue; // Skip rendering this card
            }
          } catch (err) {
            console.error(`Failed to fetch group ${groupId}:`, err);
          }
        }

        // --- Render Card ---
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h3>${escapeHtml(name)}</h3>
          <p class="subject">${escapeHtml(subject || 'General')}</p>
          <p class="description">${escapeHtml(description || '')}</p>
          <p class="group-id">GROUP ID: ${groupId}</p>
          <div class="btn-container">
            <button class="btn btn-primary" onclick='openGroup("${groupId}")'>Open</button>
            <button class="btn btn-secondary" onclick="leaveGroup('${groupId}')">Leave</button>
          </div>
        `;
        groupListEl.appendChild(card);
      }
    },
    (error) => {
      console.error('loadGroups: unexpected error', error);
      groupListEl.innerHTML = `<p class="empty-state error">Failed to load groups.</p>`;
    }
  );
}
