// ===================================================================
// PERSONAL JOURNAL FUNCTIONS
// ===================================================================

let journalEntries = [];
let selectedJournalDate = null;
let currentJournalMonth = new Date();

async function loadPersonalJournal() {
    await fetchJournalEntries();
    renderJournalCalendar();
}

async function fetchJournalEntries() {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

    if (error) {
        console.error('Error fetching journal entries:', error);
        showToast('Failed to load journal entries', 'error');
    } else {
        journalEntries = data || [];
    }
}

function renderJournalCalendar() {
    const container = document.getElementById('journalCalendar');
    if (!container) return;

    const year = currentJournalMonth.getFullYear();
    const month = currentJournalMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <button onclick="previousJournalMonth()" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
            <h4>${currentJournalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
            <button onclick="nextJournalMonth()" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center;">
    `;

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        html += `<div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">${day}</div>`;
    });

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        html += `<div style="padding: 10px;"></div>`;
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const hasEntry = journalEntries.some(entry => entry.entry_date === dateStr);
        const isSelected = selectedJournalDate === dateStr;

        html += `
            <div onclick="selectJournalDate('${dateStr}')" 
                 style="padding: 10px; border-radius: 8px; cursor: pointer; 
                        background: ${isSelected ? 'var(--primary)' : (hasEntry ? 'var(--primary-alpha)' : 'transparent')};
                        ${isSelected ? 'color: white;' : ''}
                        border: 2px solid ${hasEntry ? 'var(--primary)' : 'transparent'};">
                ${day}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function previousJournalMonth() {
    currentJournalMonth = new Date(currentJournalMonth.getFullYear(), currentJournalMonth.getMonth() - 1);
    renderJournalCalendar();
}

function nextJournalMonth() {
    currentJournalMonth = new Date(currentJournalMonth.getFullYear(), currentJournalMonth.getMonth() + 1);
    renderJournalCalendar();
}

function selectJournalDate(dateStr) {
    selectedJournalDate = dateStr;
    renderJournalCalendar();
    loadJournalEntry(dateStr);
}

function loadJournalEntry(dateStr) {
    const entry = journalEntries.find(e => e.entry_date === dateStr);

    document.getElementById('journalPlaceholder').style.display = 'none';
    document.getElementById('journalEditor').style.display = 'block';

    const titleEl = document.getElementById('journalTitleInput');
    const contentEl = document.getElementById('journalContentInput');
    const deleteBtn = document.getElementById('deleteEntryBtn');

    if (entry) {
        titleEl.value = entry.title;
        contentEl.value = entry.content;
        deleteBtn.style.display = 'block';
        document.getElementById('journalEditorTitle').textContent = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else {
        titleEl.value = '';
        contentEl.value = '';
        deleteBtn.style.display = 'none';
        document.getElementById('journalEditorTitle').textContent = 'New Entry - ' + new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
}

async function saveJournalEntry() {
    if (!selectedJournalDate) return;

    const title = document.getElementById('journalTitleInput').value.trim();
    const content = document.getElementById('journalContentInput').value.trim();

    if (!title || !content) {
        showToast('Please fill in both title and content', 'error');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existingEntry = journalEntries.find(e => e.entry_date === selectedJournalDate);

    if (existingEntry) {
        // Update existing
        const { error } = await supabase
            .from('journal_entries')
            .update({ title, content, updated_at: new Date().toISOString() })
            .eq('id', existingEntry.id);

        if (error) {
            showToast('Failed to update entry', 'error');
        } else {
            showToast('Entry updated successfully!', 'success');
            await fetchJournalEntries();
            renderJournalCalendar();
        }
    } else {
        // Create new
        const { error } = await supabase
            .from('journal_entries')
            .insert([{ user_id: user.id, entry_date: selectedJournalDate, title, content }]);

        if (error) {
            showToast('Failed to save entry', 'error');
        } else {
            showToast('Entry saved successfully!', 'success');
            await fetchJournalEntries();
            renderJournalCalendar();
        }
    }
}

async function deleteJournalEntry() {
    if (!selectedJournalDate) return;

    const confirmed = await showConfirmModal(
        'Delete Entry?',
        'Are you sure you want to delete this journal entry?'
    );

    if (!confirmed) return;

    const entry = journalEntries.find(e => e.entry_date === selectedJournalDate);
    if (!entry) return;

    const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entry.id);

    if (error) {
        showToast('Failed to delete entry', 'error');
    } else {
        showToast('Entry deleted successfully', 'success');
        selectedJournalDate = null;
        await fetchJournalEntries();
        renderJournalCalendar();
        document.getElementById('journalPlaceholder').style.display = 'block';
        document.getElementById('journalEditor').style.display = 'none';
    }
}

// ===================================================================
// TORMENT SOCIAL FEED FUNCTIONS
// ===================================================================

let tormentPosts = [];
let currentUsername = '';
let postScreenshotFile = null;

async function loadTorment() {
    await checkAndSetUsername();
    await fetchTormentPosts();
    renderTormentFeed();
}

async function checkAndSetUsername() {

    if (content.length > 280) {
        showToast('Comment is too long (max 280 characters)', 'error');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('torment_comments')
        .insert([{ post_id: postId, user_id: user.id, username: currentUsername, content }]);

    if (error) {
        showToast('Failed to add comment', 'error');
    } else {
        input.value = '';
        await fetchTormentPosts();
        renderTormentFeed();
        // Re-open comments section
        document.getElementById(`comments-${postId}`).style.display = 'block';
    }
}
