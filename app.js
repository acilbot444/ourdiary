// ========== CONFIG ==========

const SUPABASE_URL = 'https://nowoihksodgeuyzjdnlu.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_0l1GruK7Tccric55r4YlKg_5wBlnXFF';

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

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
const moodSelect = document.getElementById('mood');
const modalTitle = document.getElementById('modal-title');
const unlockBtn = document.getElementById('unlock-btn');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');
const removeImageBtn = document.getElementById('remove-image-btn');

let editingId = null;
let selectedImageFile = null;
let currentImagePath = null;
let removeCurrentImage = false;
let previewObjectUrl = null;
// Password stays only in memory
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

function updateLockDate() {

  const dateEl =
    document.getElementById('lock-date');

  if (!dateEl) return;

  const now = new Date();

  dateEl.textContent =
    now.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
}

updateLockDate();

setInterval(
  updateLockDate,
  60000
);


// ========== SHOW / HIDE SCREENS ==========

function showLockScreen() {
  lockScreen.classList.remove('hidden');
  notesScreen.classList.add('hidden');

  passwordInput.value = '';
  errorMsg.textContent = '';

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

unlockBtn.addEventListener('click', tryUnlock);

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    tryUnlock();
  }
});


// ========== LOGOUT / LOCK ==========

const logoutBtn = document.getElementById('logout');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {

    if (modal) {
      modal.classList.add('hidden');
    }

    editingId = null;

    currentPassword = '';

    showLockScreen();
  });
}


// ========== NOTES API HELPER ==========

async function callNotesApi(action, payload = {}) {

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

  if (response.status === 401) {
    alert('Session expired or incorrect password.');

    showLockScreen();

    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
      `Server error (${response.status})`
    );
  }

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

    if (!data || data.length === 0) {

      notesList.innerHTML =
        '<p class="empty">No notes yet. Add the first one!</p>';

      return;
    }

    notesList.innerHTML = data.map(note => `

      <div class="note" data-id="${note.id}">

        <div class="note-header">

          <div class="note-left-meta">

          <span class="author-badge ${
           note.author === 'Him' ? 'him' : 'you'
          }">
            ${escapeHtml(note.author || 'Someone')}
          </span>

  ${
    note.mood
      ? `<span class="mood-badge">
          ${getMoodEmoji(note.mood)}
          ${escapeHtml(note.mood)}
        </span>`
      : ''
  }

</div>

          <div class="note-top-right">

            <div class="note-meta">

              ${
                note.pinned
                  ? '<span class="pinned-label">📌 Pinned</span>'
                  : ''
              }

              <small>
                ${new Date(note.created_at).toLocaleString()}
              </small>

            </div>

            <div class="note-menu-wrapper">

              <button
                class="menu-btn"
                data-id="${note.id}"
                aria-label="Note menu">
                ⋮
              </button>

              <div
                class="note-menu hidden"
                data-menu-id="${note.id}">

                <button
                  class="menu-pin-btn"
                  data-id="${note.id}"
                  data-pinned="${note.pinned}">
                  ${note.pinned ? '📌 Unpin' : '📌 Pin'}
                </button>

                <button
                  class="menu-edit-btn"
                  data-id="${note.id}">
                  Edit
                </button>

                <button
                  class="menu-delete-btn"
                  data-id="${note.id}">
                  Delete
                </button>

              </div>

            </div>

          </div>

        </div>

        <p class="note-text">${linkifyText(note.content)}</p>
        ${
         note.image_url
        ? `
        <img
        class="note-image"
        src="${note.image_url}"
        alt="Note attachment"
        loading="lazy"
      >
    `
    : ''
}

      </div>

    `).join('');


    // ========== NOTE MENUS ==========

    document.querySelectorAll('.menu-btn').forEach(btn => {

      btn.addEventListener('click', (e) => {

        e.stopPropagation();

        const id = btn.dataset.id;

        const menu = document.querySelector(
          `[data-menu-id="${id}"]`
        );

        // Close other menus
        document.querySelectorAll('.note-menu').forEach(otherMenu => {

          if (otherMenu !== menu) {
            otherMenu.classList.add('hidden');
          }

        });

        menu.classList.toggle('hidden');

      });

    });


    // ========== MENU PIN ==========

    document.querySelectorAll('.menu-pin-btn').forEach(btn => {

      btn.addEventListener('click', async (e) => {

        e.stopPropagation();

        const id = btn.dataset.id;

        const currentlyPinned =
          btn.dataset.pinned === 'true';

        try {

          await callNotesApi('pin', {
            id: id,
            pinned: !currentlyPinned
          });

          await loadNotes();

        } catch (error) {

          console.error('Pin error:', error);

          alert(
            'Failed to update pin: ' +
            error.message
          );

        }

      });

    });


    // ========== MENU EDIT ==========

    document.querySelectorAll('.menu-edit-btn').forEach(btn => {

      btn.addEventListener('click', (e) => {

        e.stopPropagation();

        openEdit(
          btn.dataset.id,
          data
        );

      });

    });


    // ========== MENU DELETE ==========

    document.querySelectorAll('.menu-delete-btn').forEach(btn => {

      btn.addEventListener('click', (e) => {

        e.stopPropagation();

        deleteNote(
          btn.dataset.id
        );

      });

    });


  } catch (error) {

    console.error(
      'Load error:',
      error
    );

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

document.addEventListener('click', () => {

  document.querySelectorAll('.note-menu').forEach(menu => {

    menu.classList.add('hidden');

  });

});


// ========== ESCAPE HTML ==========

function escapeHtml(text) {

  const div =
    document.createElement('div');

  div.textContent =
    text ?? '';

  return div.innerHTML;
}

function linkifyText(text) {
  const escaped = escapeHtml(text);

  const urlRegex = /(https?:\/\/[^\s<]+)/g;

  return escaped.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function getMoodEmoji(mood) {

  const moods = {
    Happy: '😊',
    Loved: '🥰',
    Stressed: '😣',
    Mad: '😠',
    Sad: '😢',
    Annoyed: '😒',
    Proud: '🥹',
    Sleepy: '😴'
  };

  return moods[mood] || '';
}

// ========== AUTO-GROW TEXTAREA ==========

function autoGrowTextarea() {

  noteContent.style.height = 'auto';

  const maxHeight =
    window.innerHeight * 0.5;

  const newHeight =
    Math.min(
      noteContent.scrollHeight,
      maxHeight
    );

  noteContent.style.height =
    newHeight + 'px';

  // If note becomes very long,
  // allow scrolling inside textarea
  noteContent.style.overflowY =
    noteContent.scrollHeight > maxHeight
      ? 'auto'
      : 'hidden';
}

// Grow while typing
noteContent.addEventListener(
  'input',
  autoGrowTextarea
);

// ========== IMAGE PREVIEW ==========

function clearPreviewObjectUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}

function resetImageState() {
  clearPreviewObjectUrl();

  selectedImageFile = null;
  currentImagePath = null;
  removeCurrentImage = false;

  if (imageInput) {
    imageInput.value = '';
  }

  if (imagePreview) {
    imagePreview.removeAttribute('src');
  }

  if (imagePreviewContainer) {
    imagePreviewContainer.classList.add('hidden');
  }
}

function showImagePreview(src) {
  if (!imagePreview || !imagePreviewContainer) {
    return;
  }

  imagePreview.src = src;
  imagePreviewContainer.classList.remove('hidden');
}


// Choose image
if (imageInput) {
  imageInput.addEventListener('change', () => {

    const file = imageInput.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image.');
      imageInput.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        'The image is too large. Please choose an image smaller than 5 MB.'
      );

      imageInput.value = '';
      return;
    }

    clearPreviewObjectUrl();

    selectedImageFile = file;
    removeCurrentImage = false;

    previewObjectUrl =
      URL.createObjectURL(file);

    showImagePreview(previewObjectUrl);
  });
}


// Remove image
if (removeImageBtn) {
  removeImageBtn.addEventListener('click', () => {

    clearPreviewObjectUrl();

    selectedImageFile = null;

    if (imageInput) {
      imageInput.value = '';
    }

    if (currentImagePath) {
      removeCurrentImage = true;
    }

    if (imagePreview) {
      imagePreview.removeAttribute('src');
    }

    if (imagePreviewContainer) {
      imagePreviewContainer.classList.add('hidden');
    }
  });
}

// ========== ADD NOTE ==========

const addNoteBtn =
  document.getElementById('add-note-btn');

if (addNoteBtn) {

  addNoteBtn.addEventListener('click', () => {

    editingId = null;

    modalTitle.textContent =
      'Add a note';

    noteContent.value = '';
    authorSelect.value = 'You';
    moodSelect.value = '';
    resetImageState();
    modal.classList.remove('hidden');

    //Reset textarea height
    noteContent.style.height = 'auto';
    noteContent.style.overflowY = 'hidden';

    autoGrowTextarea();

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

  modalTitle.textContent =
    'Edit note';

  noteContent.value =
    note.content || '';

  authorSelect.value =
    note.author || 'You';
  moodSelect.value =
  note.mood || '';
  resetImageState();
currentImagePath =
  note.image_path || null;
removeCurrentImage = false;
if (note.image_url) {
  showImagePreview(
    note.image_url
  );
}
  modal.classList.remove('hidden');

  // Resize according to existing note
  noteContent.style.height = 'auto';
  noteContent.style.overflowY = 'hidden';

  autoGrowTextarea();

  noteContent.focus();
}

// ========== CANCEL ==========

const cancelBtn =
  document.getElementById('cancel-btn');

if (cancelBtn) {

  cancelBtn.addEventListener('click', () => {

    modal.classList.add('hidden');

    noteContent.value = '';

    editingId = null;

  });
}


// ========== SAVE NOTE ==========

const saveBtn =
  document.getElementById('save-btn');

if (saveBtn) {

  saveBtn.addEventListener(
    'click',
    async () => {

      const content =
        noteContent.value.trim();
      const author =
        authorSelect.value;
      const mood =
        moodSelect.value;


      if (!content) {

        alert(
          'Please write something 💕'
        );

        return;
      }


      saveBtn.disabled = true;

      saveBtn.textContent =
        'Saving...';


      try {
let imagePath =
    currentImagePath;

  // Upload new image if selected
  if (selectedImageFile) {

    imagePath =
      await uploadSelectedImage();

  }

  // User explicitly removed image
  else if (removeCurrentImage) {

    imagePath = null;

  }
        // EDIT
        if (editingId) {

          await callNotesApi(
          'edit',
            {
            id: editingId,
            content: content,
            author: author,
            mood: mood,
            image_path: imagePath
          }
          );

        }

        // ADD
        else {

          await callNotesApi(
            'add',
            {
              content: content,
              author: author,
              mood: mood,
              image_path: imagePath
            }
          );

        }

        modal.classList.add('hidden');

        noteContent.value = '';

        editingId = null;

        await loadNotes();


      } catch (error) {

        console.error(
          'Save error:',
          error
        );

        alert(
          'Failed to save: ' +
          error.message
        );

      } finally {

        saveBtn.disabled = false;

        saveBtn.textContent =
          'Save';

      }

    }
  );
}


// ========== DELETE NOTE ==========

async function deleteNote(id) {

  if (!confirm('Delete this note?')) {
    return;
  }

  try {

    await callNotesApi(
      'delete',
      {
        id: id
      }
    );

    await loadNotes();

  } catch (error) {

    console.error(
      'Delete error:',
      error
    );

    alert(
      'Failed to delete: ' +
      error.message
    );
  }
}

// ========== UPLOAD IMAGE ==========

async function uploadSelectedImage() {

  if (!selectedImageFile) {
    return null;
  }


  // Ask notes-api for temporary
  // upload permission
  const uploadInfo =
    await callNotesApi(
      'create-image-upload',
      {
        file_name:
          selectedImageFile.name,

        file_type:
          selectedImageFile.type,

        file_size:
          selectedImageFile.size
      }
    );


  if (
    !uploadInfo?.path ||
    !uploadInfo?.token
  ) {
    throw new Error(
      'Could not prepare image upload.'
    );
  }


  const { error } =
    await supabaseClient
      .storage
      .from('note-images')
      .uploadToSignedUrl(
        uploadInfo.path,
        uploadInfo.token,
        selectedImageFile,
        {
          contentType:
            selectedImageFile.type
        }
      );


  if (error) {
    throw error;
  }


  return uploadInfo.path;
}
