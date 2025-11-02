import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";


/* ---------- CONFIG - keep your real config here ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDtXS_4meIBVh7L1Psz2VCgV9Kq0QnD3k8",
  authDomain: "studyspheree-1da28.firebaseapp.com",
  databaseURL: "https://studyspheree-1da28-default-rtdb.firebaseio.com/",
  projectId: "studyspheree-1da28",
  storageBucket: "studyspheree-1da28.firebasestorage.app",
  messagingSenderId: "520045957983",
  appId: "1:520045957983:web:8b57fda16800c10d16dcea"
};
/* --------------------------------------------------------- */


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


/* DOM elements (match your HTML) */
const groupNameEl = document.getElementById("group-name");
const membersListEl = document.getElementById("members-list");
const messagesContainer = document.getElementById("messages");
const msgInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const leaveBtn = document.getElementById("leave-group");
const backBtn = document.getElementById("back-btn");


// Note elements
const notesListEl = document.getElementById("notes-list");
const filterSelect = document.getElementById("filter-select");
const uploadNoteBtn = document.getElementById("upload-note-btn");


// Modal elements
const previewModal = document.getElementById('filePreviewModal');
const previewContainer = document.getElementById('previewContainer');
const closePreviewBtn = document.getElementById('closePreview');


// In-memory cache for note data
let notesCache = new Map();


/* Custom popup functions */
function showAlert(message) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  content.innerHTML = `
    <p>${escapeHtml(message)}</p>
    <button id="okBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">OK</button>
  `;
  modal.appendChild(content);
  document.body.appendChild(modal);
  const okBtn = content.querySelector('#okBtn');
  okBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  okBtn.focus();
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  // ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    content.innerHTML = `
      <p>${escapeHtml(message)}</p>
      <button id="yesBtn" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Yes</button>
      <button id="noBtn" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">No</button>
    `;
    modal.appendChild(content);
    document.body.appendChild(modal);
    const yesBtn = content.querySelector('#yesBtn');
    const noBtn = content.querySelector('#noBtn');
    const yesHandler = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
    const noHandler = () => {
      document.body.removeChild(modal);
      resolve(false);
    };
    yesBtn.addEventListener('click', yesHandler);
    noBtn.addEventListener('click', noHandler);
    yesBtn.focus();
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        noHandler();
      }
    });
    // ESC key for No
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        noHandler();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}


/* groupId comes from URL ?id=... */
const params = new URLSearchParams(window.location.search);
const groupId = params.get("id");
if (!groupId) {
  showAlert("No group id found in URL. Open group via dashboard so ?id=<groupId> is present.");
  console.error("group.html: missing ?id in url");
}


/* helper to read local fallback user (if you store user in localStorage) */
function getLocalUserFallback() {
  try {
    const local = localStorage.getItem("user");
    if (!local) return null;
    return JSON.parse(local);
  } catch (e) {
    return null;
  }
}


/* Wait for auth; fallback to localStorage user if auth not used */
onAuthStateChanged(auth, async (fbUser) => {
  let user = fbUser || getLocalUserFallback();
  if (!user) {
    // if no firebase auth and no local user, redirect
    console.log("No authenticated user found.");
    // don't forcibly redirect if you want local testing; uncomment to force:
    // window.location.href = 'index.html';
    return;
  }


  // canonicalize user fields we expect:
  // If user object is from firebase user, map fields to { uid, email, name }
  if (fbUser) {
    user = {
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName || fbUser.email.split("@")[0]
    };
  } else {
    // localStorage user expected to have uid,email,name or similar
    user.uid = user.uid || user.localUid || user.uid; // best-effort
    user.name = user.name || user.displayName || (user.email ? user.email.split("@")[0] : "User");
  }


  console.log("Group page running for user:", user);


  /* Ensure we add the user as a member if missing */
  await ensureMemberPresent(user);


  /* Start real-time listeners */
  startGroupNameListener();
  startMembersListener();
  startMessagesListener(user);
  loadNotes(); // Load notes on auth


  /* Hook up UI actions */
  sendBtn?.addEventListener("click", () => sendMessage(user));
  msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); sendMessage(user); }
  });
  leaveBtn?.addEventListener("click", () => leaveGroup(user));
  backBtn?.addEventListener("click", () => { window.location.href = "dashboard.html"; });


  // Add event listeners for notes
  filterSelect?.addEventListener("change", loadNotes);
  uploadNoteBtn?.addEventListener("click", handleNoteUpload);


  // Add event listeners for modal
  closePreviewBtn?.addEventListener('click', closePreviewModal);
  window?.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      closePreviewModal();
    }
  });


});


/* ------------------ FUNCTIONS ------------------ */


async function ensureMemberPresent(user) {
  if (!groupId) return;
  try {
    const memberRef = ref(db, `groups/${groupId}/members/${user.uid}`);
    const snap = await get(memberRef);
    if (!snap.exists()) {
      // write with fields you use: name and email (your DB stores 'name', not 'displayName')
      await set(memberRef, {
        name: user.name || user.displayName || (user.email ? user.email.split("@")[0] : "User"),
        email: user.email || ""
      });
      // also ensure users/{uid}/groups/{groupId} exists so dashboard shows it
      await set(ref(db, `users/${user.uid}/groups/${groupId}`), true);
      console.log("Added missing member record for", user.uid);
    } else {
      // If the member exists but missing `name`, try to populate it
      const data = snap.val();
      if ((!data.name || data.name.trim() === "") && (user.name || user.displayName)) {
        await set(memberRef, { name: user.name || user.displayName, email: user.email || "" });
        console.log("Updated member record with name for", user.uid);
      }
    }
  } catch (err) {
    console.error("ensureMemberPresent error:", err);
  }
}


function startGroupNameListener() {
  if (!groupId) return;
  const groupNameRef = ref(db, `groups/${groupId}/name`);
  onValue(groupNameRef, (snap) => {
    if (snap.exists()) {
      groupNameEl.textContent = snap.val();
    } else {
      groupNameEl.textContent = "Unknown Group";
    }
  });
}


function startMembersListener() {
  if (!groupId) return;
  const membersRef = ref(db, `groups/${groupId}/members`);
  onValue(membersRef, (snap) => {
    membersListEl.innerHTML = "";
    if (!snap.exists()) {
      membersListEl.innerHTML = "<li>No members</li>";
      return;
    }
    snap.forEach((child) => {
      const info = child.val() || {};
      // read the 'name' field (your DB uses 'name')
      const display = info.name || info.displayName || info.email || "Unnamed User";
      const li = document.createElement("li");
      li.textContent = display;
      membersListEl.appendChild(li);
    });
  }, (err) => {
    console.error("members listener error:", err);
  });
}


function startMessagesListener(currentUser) {
  if (!groupId) return;
  const msgsRef = ref(db, `groups/${groupId}/messages`);


  onValue(msgsRef, (snap) => {
    messagesContainer.innerHTML = "";


    if (!snap.exists()) {
      messagesContainer.innerHTML = "<p class='text-center text-muted'>No messages yet.</p>";
      return;
    }


    let lastDateLabel = "";


    snap.forEach((child) => {
      const msg = child.val();
      const div = document.createElement("div");
      div.className = (msg.uid && msg.uid === currentUser.uid) ? "message mine" : "message";


      const sender = msg.name || msg.senderName || msg.email || "Unknown";
      const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const dateLabel = formatDateLabel(timestamp);
      const timeLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


      // --- Add date separator if new date ---
      if (dateLabel !== lastDateLabel) {
        const sep = document.createElement("div");
        sep.className = "date-separator";
        sep.innerText = dateLabel;
        messagesContainer.appendChild(sep);
        lastDateLabel = dateLabel;
      }


      // Message bubble HTML
      let inner = `
        <div class="bubble">
         <div class="sender">${escapeHtml(sender)}</div>
      `;


      // --- Handle File messages ---
      if (msg.fileName && msg.fileURL) {
        const fileName = escapeHtml(msg.fileName);
        const fileKey = child.key; // Use key to cache/retrieve
        
        // Cache this message data for preview
        notesCache.set(fileKey, { fileURL: msg.fileURL, fileName: msg.fileName });


        const lower = fileName.toLowerCase();


        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lower)) {
          inner += `<img src="${msg.fileURL}" class="chat-image" data-key="${fileKey}" alt="${fileName}">`;
        } else if (/\.pdf$/i.test(lower)) {
          inner += `<span class="file-link" data-key="${fileKey}">${fileName}</span>`;
        } else {
          inner += `<a href="${msg.fileURL}" download="${fileName}">${fileName}</a>`;
        }
      }


      // --- Handle Text messages ---
      else if (msg.text || msg.message || msg.content) {
        const text = escapeHtml(msg.text || msg.message || msg.content);
        inner += `<p class="msg-text">${text}</p>`;
      }


      inner += `<div class="msg-time">${timeLabel}</div></div>`;
      div.innerHTML = inner;


      messagesContainer.appendChild(div);
    });


    messagesContainer.scrollTop = messagesContainer.scrollHeight;


    // Activate preview events AFTER adding messages
    messagesContainer.querySelectorAll(".chat-image, .file-link").forEach(link => {
      link.addEventListener("click", () => {
        const fileKey = link.dataset.key;
        const fileData = notesCache.get(fileKey);
        if (fileData) {
          previewFile(fileData.fileURL, fileData.fileName);
        }
      });
    });
  }, (err) => {
    console.error("messages listener error:", err);
  });
}


// --- Helper: Format date as "Today", "Yesterday", or readable date ---
function formatDateLabel(date) {
  const today = new Date();
  const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));


  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}


async function sendMessage(user) {
  if (!groupId) return showAlert("No group selected.");
  const text = (msgInput.value || "").trim();
  const fileEl = document.getElementById("fileInput");
  const file = fileEl ? fileEl.files[0] : null;


  if (!text && !file) {
    return; // Don't send empty messages
  }


  try {
    const msgsRef = ref(db, `groups/${groupId}/messages`);
    const newMsgRef = push(msgsRef);


    if (file) {
      if (file.size > 3 * 1024 * 1024) { showAlert("File too large (max 3MB)."); return; }
      const dataUrl = await fileToDataURL(file);
      await set(newMsgRef, {
        uid: user.uid,
        name: user.name || user.displayName || user.email.split("@")[0],
        email: user.email || "",
        fileName: file.name,
        fileURL: dataUrl,
        timestamp: Date.now()
      });
    } else {
      await set(newMsgRef, {
        uid: user.uid,
        name: user.name || user.displayName || user.email.split("@")[0],
        email: user.email || "",
        text,
        timestamp: Date.now()
      });
    }


    msgInput.value = "";
    if (fileEl) fileEl.value = "";
  } catch (err) {
    console.error("sendMessage error:", err);
    showAlert("Failed to send message. Check console.");
  }
}


function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}


async function leaveGroup(user) {
  if (!groupId) return;
  // Using a simple confirm. In a real app, replace with a custom modal
  if (!(await showConfirm("Are you sure you want to leave this group?"))) return;


  try {
    // remove member entry
    await remove(ref(db, `groups/${groupId}/members/${user.uid}`));
    console.log("Removed member from group members node.");


    // remove group from user's groups node (if you store it)
    await remove(ref(db, `users/${user.uid}/groups/${groupId}`));
    console.log("Removed group from user's groups list.");


    // check if no members left -> delete group node entirely
    const membersSnap = await get(ref(db, `groups/${groupId}/members`));
    if (!membersSnap.exists()) {
      await remove(ref(db, `groups/${groupId}`));
      console.log("Deleted group because no members remain.");
    }


    showAlert("You left the group.");
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("leaveGroup error:", err);
    showAlert("Failed to leave group. See console for details.");
  }
}


/* small helper */
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ------------------ NOTES LOGIC ------------------ */


// ---- Load Notes ----
function loadNotes() {
  if (!groupId) return;
  const notesRef = ref(db, `groups/${groupId}/notes`);


  onValue(notesRef, (snapshot) => {
    const notes = [];
    snapshot.forEach((child) => {
      notes.push({ ...child.val(), key: child.key }); // Store note with its key
    });
    renderNotes(notes);
  }, (error) => {
    console.error("Error loading notes: ", error);
  });
}


// ---- Render Notes ----
function renderNotes(notes) {
  const filterValue = filterSelect?.value || "all";
  if (!notesListEl) {
    console.error("notesListEl not found");
    return;
  }
  notesListEl.innerHTML = "";
  notesCache.clear(); // Clear cache on each render


  const filtered = notes.filter(note => {
    const name = note.fileName?.toLowerCase() || "";
    if (filterValue === "all") return true;
    if (filterValue === "pdf") return name.endsWith(".pdf");
    if (filterValue === "doc") return name.endsWith(".doc") || name.endsWith(".docx");
    if (filterValue === "txt") return name.endsWith(".txt");
    if (filterValue === "img") return /\.(png|jpg|jpeg|gif|webp)$/.test(name);
    return true;
  });


  if (filtered.length === 0) {
    notesListEl.innerHTML = "<li class='list-group-item text-muted'>No notes found.</li>";
    return;
  }


  // Sort by newest first
  filtered.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));


  filtered.forEach(note => {
    // Store note in cache
    if (note.key) {
      notesCache.set(note.key, note);
    }


    const li = document.createElement("li");
    li.className = "note-item list-group-item";


    // Using note key in data-key attribute
    li.innerHTML = `
      <span class="note-name">${escapeHtml(note.fileName)}</span>
      <div class="note-actions">
        <button data-key="${escapeHtml(note.key)}" class="preview-note-btn btn btn-outline-secondary btn-sm">Preview</button>
        <a href="${note.fileURL}" download="${escapeHtml(note.fileName)}" class="btn btn-outline-primary btn-sm ms-1">Download</a>
      </div>
    `;
    notesListEl.appendChild(li);
  });


  // Add event listeners AFTER creating the buttons
  document.querySelectorAll('.preview-note-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteKey = btn.dataset.key;
      const note = notesCache.get(noteKey); // Get note from cache
      if (note) {
        previewFile(note.fileURL, note.fileName); // Call preview
      } else {
        console.error("Could not find note in cache for key:", noteKey);
      }
    });
  });
}


// ---- Upload Note Functionality ----
function handleNoteUpload() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp";
  input.click();


  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;


    if (file.size > 3 * 1024 * 1024) { // 3MB limit
      showAlert("File too large (max 3MB).");
      return;
    }


    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const notesRef = ref(db, `groups/${groupId}/notes`);
        const newNoteRef = push(notesRef);
        await set(newNoteRef, {
          fileName: file.name,
          fileURL: reader.result, // store as base64 data URL
          uploadedAt: Date.now(),
        });
        showAlert("Note uploaded successfully!");
        // Note: onValue in loadNotes should automatically refresh the list
      } catch (err) {
        console.error("Upload note error:", err);
        showAlert("Failed to upload note.");
      }
    };
    reader.onerror = () => {
      showAlert("Failed to read file. Please try again.");
    };
    reader.readAsDataURL(file);
  };
}



/* ------------------ MODAL LOGIC ------------------ */


// ---- File Preview Modal Function ----
// This is now a globally accessible function
window.previewFile = (fileUrl, fileName) => {
  if (!previewModal || !previewContainer) {
    console.error("Preview modal elements not found");
    return;
  }


  const lowerName = fileName.toLowerCase();
  previewContainer.innerHTML = ""; // clear old content


  // Images
  if (lowerName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    previewContainer.innerHTML = `<img src="${fileUrl}" alt="${fileName}">`;
  }


  // PDFs
  else if (lowerName.endsWith(".pdf")) {
    previewContainer.innerHTML = `<embed src="${fileUrl}" type="application/pdf" />`;
  }


  // Word, Excel, PowerPoint (Fallback to download)
  else if (lowerName.match(/\.(docx?|pptx?|xlsx?)$/)) {
    // As noted, browser cannot render these in an iframe from a blob/data URL
    // and Office viewer cannot access local data. Fallback to download.
    previewContainer.innerHTML = `<p>Preview not available for Office documents.</p>
      <a href="${fileUrl}" download="${fileName}" class="btn btn-primary">Download File</a>`;
  }


  // Text files
  else if (lowerName.endsWith(".txt")) {
    fetch(fileUrl) // fetch on a data: URL works
      .then(res => res.text())
      .then(text => {
        previewContainer.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
      })
      .catch(() => {
        previewContainer.innerHTML = `<p>Unable to preview text file.</p>
        <a href="${fileUrl}" download="${fileName}" class="btn btn-primary">Download File</a>`;
      });
  }


  // Fallback
  else {
    previewContainer.innerHTML = `<p>No preview available for this file type.</p>
      <a href="${fileUrl}" download="${fileName}" class="btn btn-primary">Download</a>`;
  }


  // Show the modal by adding the class
  previewModal.classList.add('modal-show');
};


// ---- File Preview Close Logic ----
function closePreviewModal() {
  if (!previewModal) return;
  // Hide the modal by removing the class
  previewModal.classList.remove('modal-show');
  previewContainer.innerHTML = ""; // Clear content on closee
}
