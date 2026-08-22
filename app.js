// ========== CONFIG ==========

const SUPABASE_URL = 'https://nowoihksodgeuyzjdnlu.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_0l1GruK7Tccric55r4YlKg_5wBlnXFF';

// Edge Function URLs
const CHECK_PASSWORD_URL =
  `${SUPABASE_URL}/functions/v1/checkpw`;

const FUNCTIONS_URL =
  `${SUPABASE_URL}/functions/v1/notes-api`;

console.log('app.js loaded successfully');

// ========== ELEMENTS ==========

const lockScreen = document.getElementById('lock-screen');
const notesScreen = document.getElementById('notes-screen');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error');
const notesList = document.getElementById('notes-list');
const modal = document.getElementById('modal');
const noteContent = document.getElementById('note-content');
const authorSelect = document.getElementById('author');
const modalTitle = document.getElementById('modal-title');
const unlockBtn = document.getElementById('unlock-btn');

let editingId = null;

// Password is kept only in memory.
// It disappears when the page is refreshed or closed.
let currentPassword = '';

// ========== TIME ==========

function updateTime() {
  const timeEl = document.getElementById('time');

  if (timeEl) {
    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

updateTime();
setInterval(updateTime, 1000);

// ========== SHOW / HIDE SCREENS ==========

function showLockScreen() {
  lockScreen.classList.remove('hidden');
  notesScreen.classList.add('hidden');

  passwordInput.value = '';
  errorMsg.textContent = '';

  // Clear password from memory
  currentPassword = '';

  passwordInput.focus();
}

function showNotesScreen() {
  lockScreen.classList.add('hidden');
  notesScreen.classList.remove('hidden');

  loadNotes();
}

// Always start locked
showLockScreen();

// ========== UNLOCK ==========
async function tryUnlock() {
  const typedPassword = passwordInput.value.trim();

  if (!typedPassword) {
    errorMsg.textContent = 'Please enter the password';
    return;
  }

  unlockBtn.disabled = true;
  unlockBtn.textContent = 'Checking...';
  errorMsg.textContent = '';

  try {

    const response = await fetch(CHECK_PASSWORD_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },

      body: JSON.stringify({
        password: typedPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message || `Server error (${response.status})`
      );
    }

    if (result.success === true) {

      // Keep password in memory for notes API calls
      currentPassword = typedPassword;

      showNotesScreen();

    } else {

      errorMsg.textContent = 'Wrong password';

      passwordInput.value = '';
      passwordInput.focus();
    }

  } catch (err) {

    console.error('Unlock error:', err);

    errorMsg.textContent =
      'Connection error. Please try again.';
  }

  unlockBtn.disabled = false;
  unlockBtn.textContent = 'Unlock';
}

// Unlock button
unlockBtn.addEventListener('click', tryUnlock);

// Press Enter to unlock
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    tryUnlock();
  }
});

// ========== LOGOUT ==========
const logoutBtn = document.getElementById('logout');

if (logoutBtn) {

  logoutBtn.addEventListener('click', () => {

    // Close modal if open
    if (modal) {
      modal.classList.add('hidden');
    }

    editingId = null;

    // Clear password
    currentPassword = '';

    // Return to lock screen
    showLockScreen();
  });
}

// ========== NOTES API HELPER ==========

async function callNotesApi(action, payload = {}) {

  // Don't allow notes requests without password
  if (!currentPassword) {
    showLockScreen();
    throw new Error('You are not unlocked.');
  }

  const response = await fetch(FUNCTIONS_URL, {

    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    },

    body: JSON.stringify({

      password: currentPassword,

      action: action,

      ...payload

    })
  });

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error('Invalid server response.');
  }

  // Unauthorized
  if (response.status === 401) {

    alert('Session expired or incorrect password.');

    showLockScreen();

    throw new Error('Unauthorized');
  }

  // Other server error
  if (!response.ok) {

    throw new Error(
      result?.message ||
      `Server error (${response.status})`
    );
  }

  // API returned success:false
  if (!result.success) {

    throw new Error(
      result.message ||
      'API request failed.'
    );
  }

  return result.data;
}

// ========== LOAD NOTES ==========

async function loadNotes() {

  notesList.innerHTML =
    '<p class="empty">Loading notes...</p>';

  try {

    const data = await callNotesApi('load');

    // No notes
    if (!data || data.length === 0) {
      notesList.innerHTML =
        '<p class="empty">No notes yet. Add the first one!</p>';
      return;
    }

    // Display notes
    notesList.innerHTML = data.map(note => `
      <div class="note" data-id="${note.id}">
        <div class="note-header">
          <span class="author-badge ${
            note.author === 'Him' ? 'him' : 'you'
          }">

            ${escapeHtml(note.author || 'Someone')}

          </span>

          <small>
            ${new Date(note.created_at).toLocaleString()}
          </small>

        </div>


        <p class="note-text">
          ${escapeHtml(note.content)}
        </p>


        <div class="note-actions">

          <button
            class="edit-btn"
            data-id="${note.id}">
            Edit
          </button>

          <button
            class="delete-btn"
            data-id="${note.id}">
            Delete
          </button>

        </div>

      </div>

    `).join('');


    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {

      btn.addEventListener('click', () => {

        openEdit(btn.dataset.id, data);

      });

    });


    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {

      btn.addEventListener('click', () => {

        deleteNote(btn.dataset.id);

      });

    });


  } catch (error) {

    console.error('Load error:', error);

    notesList.innerHTML = `

      <p class="empty">

        Failed to load notes

        <br>

        <small>
          ${escapeHtml(error.message)}
        </small>

      </p>

    `;
  }
}


// ========== ESCAPE HTML ==========

function escapeHtml(text) {

  const div = document.createElement('div');

  div.textContent = text ?? '';

  return div.innerHTML;
}


// ========== ADD NOTE ==========

const addNoteBtn = document.getElementById('add-note-btn');

if (addNoteBtn) {

  addNoteBtn.addEventListener('click', () => {

    editingId = null;

    modalTitle.textContent = 'Add a note';

    noteContent.value = '';

    authorSelect.value = 'You';

    modal.classList.remove('hidden');

    noteContent.focus();

  });
}


// ========== EDIT NOTE ==========

function openEdit(id, allNotes) {

  const note = allNotes.find(
    n => String(n.id) === String(id)
  );


  if (!note) {
    return;
  }


  editingId = id;

  modalTitle.textContent = 'Edit note';

  noteContent.value = note.content || '';

  authorSelect.value =
    note.author || 'You';

  modal.classList.remove('hidden');

  noteContent.focus();
}


// ========== CANCEL ==========

const cancelBtn = document.getElementById('cancel-btn');
if (cancelBtn) {

  cancelBtn.addEventListener('click', () => {

    modal.classList.add('hidden');

    noteContent.value = '';

    editingId = null;

  });
}


// ========== SAVE NOTE ==========

const saveBtn = document.getElementById('save-btn');

if (saveBtn) {

  saveBtn.addEventListener('click', async () => {

    const content = noteContent.value.trim();

    const author = authorSelect.value;


    if (!content) {

      alert('Please write something 💕');

      return;
    }


    saveBtn.disabled = true;

    saveBtn.textContent = 'Saving...';


    try {

      // EDIT
      if (editingId) {

        await callNotesApi('edit', {

          id: editingId,

          content: content,

          author: author

        });

      }

      // ADD
      else {

        await callNotesApi('add', {

          content: content,

          author: author

        });

      }

      // Close modal
      modal.classList.add('hidden');

      noteContent.value = '';

      editingId = null;


      // Refresh notes
      await loadNotes();


    } catch (error) {

      console.error('Save error:', error);

      alert(
        'Failed to save: ' +
        error.message
      );

    } finally {

      saveBtn.disabled = false;

      saveBtn.textContent = 'Save';
    }

  });
}


// ========== DELETE NOTE ==========
async function deleteNote(id) {

  if (!confirm('Delete this note?')) {
    return;
  }


  try {

    await callNotesApi('delete', {
      id: id
    });


    await loadNotes();


  } catch (error) {

    console.error('Delete error:', error);

    alert(
      'Failed to delete: ' +
      error.message
    );
  }
}
