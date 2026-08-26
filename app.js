// ========== CONFIG ==========
const SUPABASE_URL =
  'https://nowoihksodgeuyzjdnlu.supabase.co';
const SUPABASE_ANON_KEY =
  'sb_publishable_0l1GruK7Tccric55r4YlKg_5wBlnXFF';
const CHECK_PASSWORD_URL =
  `${SUPABASE_URL}/functions/v1/checkpw`;
const NOTES_API_URL =
  `${SUPABASE_URL}/functions/v1/notes-api`;
const IMAGE_BUCKET =
  'note-images';
const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;
const VAPID_PUBLIC_KEY =
  'BHJcHOXBXnkpFhm_sV9GZRcWCYAs8wZDChRFeLTlgcQA9m58mu6gwSVnIcAumjlbhKD3q2zm2XJZnAIeyKtr2W0';
const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

// ========== ELEMENTS ==========
const lockScreen =
  document.getElementById('lock-screen');
const notesScreen =
  document.getElementById('notes-screen');
const passwordInput =
  document.getElementById('password');
const errorMsg =
  document.getElementById('error');
const notesList =
  document.getElementById('notes-list');
const modal =
  document.getElementById('modal');
const modalTitle =
  document.getElementById('modal-title');
const noteContent =
  document.getElementById('note-content');
const authorSelect =
  document.getElementById('author');
const moodSelect =
  document.getElementById('mood');
const unlockBtn =
  document.getElementById('unlock-btn');
const logoutBtn =
  document.getElementById('logout');
const addNoteBtn =
  document.getElementById('add-note-btn');
const cancelBtn =
  document.getElementById('cancel-btn');
const saveBtn =
  document.getElementById('save-btn');
const imageInput =
  document.getElementById('image-input');
const imagePreview =
  document.getElementById('image-preview');
const imagePreviewContainer =
document.getElementById('image-preview-container');
const removeImageBtn =
  document.getElementById('remove-image-btn');
const imageLightbox =
  document.getElementById('image-lightbox');
const lightboxImage =
  document.getElementById('lightbox-image');
const lightboxClose =
  document.getElementById('lightbox-close');

  // ========== NOTIFICATION ELEMENTS ==========

const notificationBtn =
  document.getElementById('notification-btn');

const notificationModal =
  document.getElementById('notification-modal');

const deviceOwnerSelect =
  document.getElementById('device-owner');

const enableNotificationsBtn =
  document.getElementById('enable-notifications-btn');

const notificationCancelBtn =
  document.getElementById('notification-cancel-btn');

// ========== STATE ==========
let currentPassword = '';
let editingId = null;
let selectedImageFile = null;
let currentImagePath = null;
let removeCurrentImage = false;
let previewObjectUrl = null;

// ========== CLOCK ==========
function updateTime() {
  const timeEl =
    document.getElementById('time');
  if (!timeEl) {
    return;
  }
  const now = new Date();
  timeEl.textContent =
    now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
}

function updateLockDate() {
  const dateEl =
    document.getElementById(
      'lock-date'
    );
  if (!dateEl) {
    return;
  }
  dateEl.textContent =
    new Date().toLocaleDateString(
      [],
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    );
}

updateTime();
updateLockDate();
setInterval(
  updateTime,
  1000
);
setInterval(
  updateLockDate,
  60000
);

// ========== SCREEN CONTROL ==========
function showLockScreen() {
  lockScreen.classList.remove(
    'hidden'
  );
  notesScreen.classList.add(
    'hidden'
  );
  passwordInput.value = '';
  errorMsg.textContent = '';
  currentPassword = '';
  closeNoteModal();
  passwordInput.focus();
}
function showNotesScreen() {
  lockScreen.classList.add(
    'hidden'
  );
  notesScreen.classList.remove(
    'hidden'
  );
  loadNotes();
}

// Always begin locked
showLockScreen();

// ========== PASSWORD UNLOCK ==========
async function tryUnlock() {
  const typedPassword =
    passwordInput.value.trim();
  if (!typedPassword) {
    errorMsg.textContent =
      'Please enter the password';
    return;
  }
  unlockBtn.disabled = true;
  unlockBtn.textContent =
    'Checking...';
  errorMsg.textContent = '';
  try {
    const response = await fetch(
      CHECK_PASSWORD_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          apikey:
            SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          password:
            typedPassword
        })
      }
    );
    const result =
      await response.json();
    if (!response.ok) {
      throw new Error(
        result?.message ||
        `Server error (${response.status})`
      );
    }

    if (result.success) {
      currentPassword =
        typedPassword;
      showNotesScreen();
      return;
    }

    errorMsg.textContent =
      'Wrong password';
    passwordInput.value = '';
    passwordInput.focus();
  } catch (error) {
    console.error(
      'Unlock error:',
      error
    );
    errorMsg.textContent =
      'Connection error. Please try again.';
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.textContent =
      'Unlock';
  }
}

unlockBtn.addEventListener(
  'click',
  tryUnlock
);
passwordInput.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter') {
      tryUnlock();
    }
  }
);

// ========== LOGOUT ==========
if (logoutBtn) {
  logoutBtn.addEventListener(
    'click',
    showLockScreen
  );
}

// ========== NOTES API ==========
async function callNotesApi(
  action,
  payload = {}
) {
  if (!currentPassword) {
    showLockScreen();
    throw new Error(
      'You are not unlocked.'
    );
  }

  const response = await fetch(
    NOTES_API_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
        apikey:
          SUPABASE_ANON_KEY
      },

      body: JSON.stringify({
        password:
          currentPassword,
        action,
        ...payload
      })
    }
  );

  let result;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      'Invalid server response.'
    );
  }

  if (response.status === 401) {
    showLockScreen();
    throw new Error(
      'Session expired or incorrect password.'
    );
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
    const notes =
      await callNotesApi('load');
    if (
      !notes ||
      notes.length === 0
    ) {
      notesList.innerHTML =
        '<p class="empty">No notes yet. Add the first one!</p>';

      return;
    }

    renderNotes(notes);
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

// ========== RENDER NOTES ==========
function renderNotes(notes) {
  notesList.innerHTML =
    notes
      .map(renderNote)
      .join('');
  bindNoteMenuEvents(notes);
  bindNoteImageEvents();
}

function renderNote(note) {
  const authorClass =
    note.author === 'Him'
      ? 'him'
      : 'you';
  const moodHtml =
    note.mood
      ? `
        <span class="mood-badge">
          ${getMoodEmoji(note.mood)}
          ${escapeHtml(note.mood)}
        </span>
      `
      : '';
  const pinnedHtml =
    note.pinned
      ? `
        <span class="pinned-label">
          📌 Pinned
        </span>
      `
      : '';

  const imageHtml =
    note.image_url
      ? `
        <img
          class="note-image"
          src="${escapeHtml(note.image_url)}"
          alt="Note attachment"
          loading="lazy"
          data-full-image="${escapeHtml(note.image_url)}"
          tabindex="0"
          role="button"
          aria-label="Open image"
        >
      `
      : '';

  return `
    <div
      class="note"
      data-id="${escapeHtml(note.id)}"
    >
      <div class="note-header">
        <div class="note-left-meta">
          <span
            class="author-badge ${authorClass}">
            ${escapeHtml(
              note.author ||
              'Someone'
            )}
          </span>
          ${moodHtml}
        </div>

        <div class="note-top-right">
          <div class="note-meta">
            ${pinnedHtml}
            <small>
              ${formatNoteDate(
                note.created_at
              )}
            </small>
          </div>
          <div class="note-menu-wrapper">
            <button
              type="button"
              class="menu-btn"
              data-id="${escapeHtml(note.id)}"
              aria-label="Note menu">
              ⋮
            </button>
            <div
              class="note-menu hidden"
              data-menu-id="${escapeHtml(note.id)}">
              <button
                type="button"
                class="menu-pin-btn"
                data-id="${escapeHtml(note.id)}"
                data-pinned="${note.pinned}">
                ${
                  note.pinned
                    ? '📌 Unpin'
                    : '📌 Pin'
                }
              </button>

              <button
                type="button"
                class="menu-edit-btn"
                data-id="${escapeHtml(note.id)}">
                Edit
              </button>

              <button
                type="button"
                class="menu-delete-btn"
                data-id="${escapeHtml(note.id)}">
                Delete
              </button>

            </div>
          </div>
        </div>
      </div>

      <p class="note-text">${linkifyText(
        note.content
      )}</p>
      ${imageHtml}
    </div>
  `;
}

// ========== NOTE MENU EVENTS ==========
function bindNoteMenuEvents(notes) {
  document
    .querySelectorAll('.menu-btn')
    .forEach((button) => {
      button.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
          const id =
            button.dataset.id;
          const menu =
            document.querySelector(
              `[data-menu-id="${id}"]`
            );
          closeAllNoteMenus(menu);
          if (menu) {
            menu.classList.toggle(
              'hidden'
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      '.menu-pin-btn'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        async (event) => {
          event.stopPropagation();
          const id =
            button.dataset.id;
          const currentlyPinned =
            button.dataset.pinned ===
            'true';
          try {
            await callNotesApi(
              'pin',
              {
                id,
                pinned:
                  !currentlyPinned
              }
            );
            await loadNotes();
          } catch (error) {
            console.error(
              'Pin error:',
              error
            );
            alert(
              'Failed to update pin: ' +
              error.message
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      '.menu-edit-btn'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
          openEdit(
            button.dataset.id,
            notes
          );
        }
      );
    });

  document
    .querySelectorAll(
      '.menu-delete-btn'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        (event) => {
          event.stopPropagation();
          deleteNote(
            button.dataset.id
          );
        }
      );
    });
}

function closeAllNoteMenus(
  exceptMenu = null
) {
  document
    .querySelectorAll(
      '.note-menu'
    )
    .forEach((menu) => {
     if (menu !== exceptMenu) {
        menu.classList.add(
          'hidden'
        );
      }
    });
}

document.addEventListener(
  'click',
  () => {
    closeAllNoteMenus();
  }
);

// ========== TEXT HELPERS ==========
function escapeHtml(text) {
  const div =
    document.createElement('div');
  div.textContent =
    text ?? '';
  return div.innerHTML;
}

function linkifyText(text) {
  const escaped =
    escapeHtml(text);
  const urlRegex =
    /(https?:\/\/[^\s<]+)/g;
  return escaped.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function formatNoteDate(dateString) {
  const date =
    new Date(dateString);
  const now =
    new Date();
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const noteDay =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const diffDays =
    Math.round(
      (
        today -
        noteDay
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );

  const timeText =
    date.toLocaleTimeString(
      [],
      {
        hour: 'numeric',
        minute: '2-digit'
      }
    );

  if (diffDays === 0) {
    return `Today at ${timeText}`;
  }

  if (diffDays === 1) {
    return `Yesterday at ${timeText}`;
  }

  if (
    date.getFullYear() ===
    now.getFullYear()
  ) {
    const dateText =
      date.toLocaleDateString(
        [],
        {
          day: 'numeric',
          month: 'short'
        }
      );

    return `${dateText} at ${timeText}`;
  }

  const dateText =
    date.toLocaleDateString(
      [],
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }
    );

  return `${dateText} at ${timeText}`;
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
  noteContent.style.height =
    'auto';

  const maxHeight =
    window.innerHeight * 0.5;

  const newHeight =
    Math.min(
      noteContent.scrollHeight,
      maxHeight
    );

  noteContent.style.height =
    `${newHeight}px`;

  noteContent.style.overflowY =
    noteContent.scrollHeight >
    maxHeight
      ? 'auto'
      : 'hidden';
}


noteContent.addEventListener(
  'input',
  autoGrowTextarea
);


// ========== IMAGE PREVIEW STATE ==========

function clearPreviewObjectUrl() {
  if (!previewObjectUrl) {
    return;
  }

  URL.revokeObjectURL(
    previewObjectUrl
  );

  previewObjectUrl = null;
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
    imagePreview.removeAttribute(
      'src'
    );
  }

  if (imagePreviewContainer) {
    imagePreviewContainer.classList.add(
      'hidden'
    );
  }
}


function showImagePreview(src) {
  if (
    !imagePreview ||
    !imagePreviewContainer ||
    !src
  ) {
    return;
  }

  imagePreview.src = src;

  imagePreviewContainer.classList.remove(
    'hidden'
  );
}


// ========== IMAGE PICKER ==========

if (imageInput) {
  imageInput.addEventListener(
    'change',
    () => {
      const file =
        imageInput.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        alert(
          'Please choose an image.'
        );

        imageInput.value = '';

        return;
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        alert(
          'The image is too large. Please choose an image smaller than 5 MB.'
        );

        imageInput.value = '';

        return;
      }

      clearPreviewObjectUrl();

      selectedImageFile =
        file;

      removeCurrentImage =
        false;

      previewObjectUrl =
        URL.createObjectURL(file);

      showImagePreview(
        previewObjectUrl
      );
    }
  );
}


if (removeImageBtn) {
  removeImageBtn.addEventListener(
    'click',
    () => {
      clearPreviewObjectUrl();

      selectedImageFile = null;

      if (imageInput) {
        imageInput.value = '';
      }

      if (currentImagePath) {
        removeCurrentImage = true;
      }

      if (imagePreview) {
        imagePreview.removeAttribute(
          'src'
        );
      }

      if (imagePreviewContainer) {
        imagePreviewContainer.classList.add(
          'hidden'
        );
      }
    }
  );
}


// ========== NOTE MODAL ==========

function openAddNote() {
  editingId = null;

  modalTitle.textContent =
    'Add a note';

  noteContent.value = '';

  authorSelect.value =
    'You';

  moodSelect.value = '';

  resetImageState();

  modal.classList.remove(
    'hidden'
  );

  resetTextareaHeight();

  noteContent.focus();
}


function openEdit(
  id,
  notes
) {
  const note =
    notes.find(
      (item) =>
        String(item.id) ===
        String(id)
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

  removeCurrentImage =
    false;

  if (note.image_url) {
    showImagePreview(
      note.image_url
    );
  }

  modal.classList.remove(
    'hidden'
  );

  resetTextareaHeight();

  noteContent.focus();
}


function closeNoteModal() {
  if (!modal) {
    return;
  }

  modal.classList.add(
    'hidden'
  );

  noteContent.value = '';

  editingId = null;

  resetImageState();
}


function resetTextareaHeight() {
  noteContent.style.height =
    'auto';

  noteContent.style.overflowY =
    'hidden';

  autoGrowTextarea();
}


if (addNoteBtn) {
  addNoteBtn.addEventListener(
    'click',
    openAddNote
  );
}


if (cancelBtn) {
  cancelBtn.addEventListener(
    'click',
    closeNoteModal
  );
}


// ========== SAVE NOTE ==========

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

        if (selectedImageFile) {
          imagePath =
            await uploadSelectedImage();

        } else if (
          removeCurrentImage
        ) {
          imagePath = null;
        }

        const noteData = {
          content,
          author,
          mood,
          image_path:
            imagePath
        };

        if (editingId) {
          await callNotesApi(
            'edit',
            {
              id: editingId,
              ...noteData
            }
          );

        } else {
          await callNotesApi(
            'add',
            noteData
          );
        }

        closeNoteModal();

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
        saveBtn.disabled =
          false;

        saveBtn.textContent =
          'Save';
      }
    }
  );
}


// ========== DELETE NOTE ==========

async function deleteNote(id) {
  const confirmed =
    confirm(
      'Delete this note?'
    );

  if (!confirmed) {
    return;
  }

  try {
    await callNotesApi(
      'delete',
      {
        id
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


// ========== IMAGE UPLOAD ==========

async function uploadSelectedImage() {
  if (!selectedImageFile) {
    return null;
  }

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
      .from(IMAGE_BUCKET)
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


// ========== IMAGE LIGHTBOX ==========

function bindNoteImageEvents() {
  document
    .querySelectorAll(
      '.note-image'
    )
    .forEach((image) => {

      image.addEventListener(
        'click',
        () => {
          openImageLightbox(
            image.dataset.fullImage
          );
        }
      );


      image.addEventListener(
        'keydown',
        (event) => {

          if (
            event.key !== 'Enter' &&
            event.key !== ' '
          ) {
            return;
          }

          event.preventDefault();

          openImageLightbox(
            image.dataset.fullImage
          );
        }
      );
    });
}


function openImageLightbox(src) {
  if (
    !imageLightbox ||
    !lightboxImage ||
    !src
  ) {
    return;
  }

  lightboxImage.src = src;

  imageLightbox.classList.remove(
    'hidden'
  );

  document.body.style.overflow =
    'hidden';
}


function closeImageLightbox() {
  if (
    !imageLightbox ||
    !lightboxImage
  ) {
    return;
  }

  imageLightbox.classList.add(
    'hidden'
  );

  lightboxImage.removeAttribute(
    'src'
  );

  document.body.style.overflow =
    '';
}


if (lightboxClose) {
  lightboxClose.addEventListener(
    'click',
    closeImageLightbox
  );
}


if (imageLightbox) {
  imageLightbox.addEventListener(
    'click',
    (event) => {

      if (
        event.target ===
        imageLightbox
      ) {
        closeImageLightbox();
      }
    }
  );
}


// ========== KEYBOARD SHORTCUTS ==========

document.addEventListener(
  'keydown',
  (event) => {

    if (event.key !== 'Escape') {
      return;
    }

    if (
      imageLightbox &&
      !imageLightbox.classList.contains(
        'hidden'
      )
    ) {
      closeImageLightbox();

      return;
    }

    if (
      modal &&
      !modal.classList.contains(
        'hidden'
      )
    ) {
      closeNoteModal();
    }
  }
);

// ========== PUSH NOTIFICATIONS ==========

function urlBase64ToUint8Array(base64String) {
  const padding =
    '='.repeat(
      (4 - base64String.length % 4) % 4
    );

  const base64 =
    (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      (character) =>
        character.charCodeAt(0)
    )
  );
}


// ========== REGISTER SERVICE WORKER ==========

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'Service workers are not supported on this browser.'
    );
  }

  const registration =
    await navigator.serviceWorker.register(
      './service-worker.js'
    );

  await navigator.serviceWorker.ready;

  return registration;
}


// ========== ENABLE NOTIFICATIONS ==========

async function enablePushNotifications() {
  if (!deviceOwnerSelect) {
    return;
  }

  if (
    !('Notification' in window) ||
    !('PushManager' in window)
  ) {
    alert(
      'Push notifications are not supported on this browser.'
    );

    return;
  }

  const owner =
    deviceOwnerSelect.value;

  enableNotificationsBtn.disabled =
    true;

  enableNotificationsBtn.textContent =
    'Enabling...';

  try {
    const permission =
      await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error(
        'Notification permission was not granted.'
      );
    }

    const registration =
      await registerServiceWorker();

    let subscription =
      await registration
        .pushManager
        .getSubscription();

    if (!subscription) {
      subscription =
        await registration
          .pushManager
          .subscribe({
            userVisibleOnly: true,

            applicationServerKey:
              urlBase64ToUint8Array(
                VAPID_PUBLIC_KEY
              )
          });
    }

    const subscriptionJson =
      subscription.toJSON();

    if (
      !subscriptionJson.endpoint ||
      !subscriptionJson.keys?.p256dh ||
      !subscriptionJson.keys?.auth
    ) {
      throw new Error(
        'Invalid push subscription.'
      );
    }

    await callNotesApi(
      'save-push-subscription',
      {
        owner,

        subscription: {
          endpoint:
            subscriptionJson.endpoint,

          keys: {
            p256dh:
              subscriptionJson
                .keys
                .p256dh,

            auth:
              subscriptionJson
                .keys
                .auth
          }
        }
      }
    );

    notificationModal.classList.add(
      'hidden'
    );

    alert(
      `Notifications enabled for ${owner} 🔔`
    );

  } catch (error) {
    console.error(
      'Notification setup error:',
      error
    );

    alert(
      'Could not enable notifications: ' +
      error.message
    );

  } finally {
    enableNotificationsBtn.disabled =
      false;

    enableNotificationsBtn.textContent =
      'Enable';
  }
}


// ========== NOTIFICATION BUTTON ==========

if (notificationBtn) {
  notificationBtn.addEventListener(
    'click',
    () => {
      notificationModal.classList.remove(
        'hidden'
      );
    }
  );
}


// ========== NOTIFICATION CANCEL ==========

if (notificationCancelBtn) {
  notificationCancelBtn.addEventListener(
    'click',
    () => {
      notificationModal.classList.add(
        'hidden'
      );
    }
  );
}


// ========== ENABLE BUTTON ==========

if (enableNotificationsBtn) {
  enableNotificationsBtn.addEventListener(
    'click',
    enablePushNotifications
  );
}


// ========== REGISTER WORKER ON LOAD ==========

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    './service-worker.js'
  ).catch((error) => {
    console.error(
      'Service worker registration error:',
      error
    );
  });
}
