// ========== CONFIG ==========
const SUPABASE_URL = 'https://nowoihksodgeuyzjdnlu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0l1GruK7Tccric55r4YlKg_5wBlnXFF';
const CORRECT_PASSWORD = '1904';

console.log('app.js loaded successfully');

// Changed name to avoid "already been declared" error
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
function tryUnlock() {
  const typedPassword = passwordInput.value.trim();
  console.log('Typed:', typedPassword, '| Correct:', CORRECT_PASSWORD);

  if (typedPassword === CORRECT_PASSWORD) {
    console.log('Password correct!');
    showNotesScreen();
  } else {
    errorMsg.textContent = 'Wrong password';
    passwordInput.value = '';
    passwordInput.focus();
  }
}

unlockBtn.addEventListener('click', tryUnlock);
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') tryUnlock();
});

// ========== LOAD NOTES ==========
async function loadNotes() {
  notesList.innerHTML = '<p class="empty">Loading notes...</p>';

  const { data, error } = await supabaseClient
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load error:', error);
    notesList.innerHTML = `<p class="empty">Failed to load notes<br><small>${error.message}</small></p>`;
    return;
  }

  if (!data || data.length === 0) {
    notesList.innerHTML = '<p class="empty">No notes yet. Add the first one!</p>';
    return;
  }

  notesList.innerHTML = data.map(note => `
    <div class="note" data-id="${note.id}">
      <div class="note-header">
        <span class="author-badge ${note.author === 'Him' ? 'him' : 'you'}">
          ${note.author || 'Someone'}
        </span>
        <small>${new Date(note.created_at).toLocaleString()}</small>
      </div>
      <p class="note-text">${escapeHtml(note.content)}</p>
      <div class="note-actions">
        <button class="edit-btn" data-id="${note.id}">Edit</button>
        <button class="delete-btn" data-id="${note.id}">Delete</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id, data));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteNote(btn.dataset.id));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== ADD NOTE ==========
document.getElementById('add-note-btn').addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Add a note';
  noteContent.value = '';
  authorSelect.value = 'You';
  modal.classList.remove('hidden');
  noteContent.focus();
});

// ========== EDIT ==========
function openEdit(id, allNotes) {
  const note = allNotes.find(n => n.id === id);
  if (!note) return;

  editingId = id;
  modalTitle.textContent = 'Edit note';
  noteContent.value = note.content;
  authorSelect.value = note.author || 'You';
  modal.classList.remove('hidden');
  noteContent.focus();
}

// ========== CANCEL ==========
document.getElementById('cancel-btn').addEventListener('click', () => {
  modal.classList.add('hidden');
  noteContent.value = '';
  editingId = null;
});

// ========== SAVE ==========
document.getElementById('save-btn').addEventListener('click', async () => {
  const content = noteContent.value.trim();
  const author = authorSelect.value;

  if (!content) {
    alert('Please write something 💕');
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingId) {
      const { error } = await supabaseClient
        .from('notes')
        .update({ content, author })
        .eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from('notes')
        .insert([{ content, author }]);
      if (error) throw error;
    }

    modal.classList.add('hidden');
    noteContent.value = '';
    editingId = null;
    loadNotes();
  } catch (error) {
    console.error(error);
    alert('Failed to save: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

// ========== DELETE ==========
async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;

  const { error } = await supabaseClient
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Failed to delete: ' + error.message);
    return;
  }

  loadNotes();
}