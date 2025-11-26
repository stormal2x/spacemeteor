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
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check localStorage first
    currentUsername = localStorage.getItem('torment_username');

    if (!currentUsername) {
        // Show custom modal instead of prompt
        return new Promise((resolve) => {
            document.getElementById('usernameSetupModal').style.display = 'flex';

            // Store resolve function globally so saveUsername can call it
            window._usernameResolve = resolve;
        });
    }
}

function saveUsername() {
    const input = document.getElementById('usernameInput');
    const username = input.value.trim();

    if (!username) {
        showToast('Please enter a username', 'error');
        return;
    }

    currentUsername = username;
    localStorage.setItem('torment_username', currentUsername);
    document.getElementById('usernameSetupModal').style.display = 'none';
    showToast(`Welcome, ${currentUsername}!`, 'success');

    // Resolve the promise if it exists
    if (window._usernameResolve) {
        window._usernameResolve();
        window._usernameResolve = null;
    }
}

async function fetchTormentPosts() {
    if (!supabase) return;

    const { data, error } = await supabase
        .from('torment_posts')
        .select(`
            *,
            torment_likes (id, user_id),
            torment_comments (id, username, content, created_at)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching posts:', error);
        showToast('Failed to load posts', 'error');
    } else {
        tormentPosts = data || [];
    }
}

async function renderTormentFeed() {
    const feed = document.getElementById('tormentFeed');
    if (!feed) return;

    if (tormentPosts.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 20px; opacity: 0.3;">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <p>No posts yet. Be the first to share!</p>
            </div>
        `;
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    feed.innerHTML = tormentPosts.map(post => createPostCard(post, userId)).join('');
}

function createPostCard(post, userId) {
    const likeCount = post.torment_likes?.length || 0;
    const commentCount = post.torment_comments?.length || 0;
    const hasLiked = post.torment_likes?.some(like => like.user_id === userId) || false;
    const timeAgo = getTimeAgo(new Date(post.created_at));

    const screenshotHtml = post.screenshot_url ? `
        <img src="${post.screenshot_url}" style="max-width: 100%; border-radius: 8px; margin-bottom: 15px; cursor: pointer;" onclick="openImageModal('${post.screenshot_url}')" />
    ` : '';

    const deleteButtonHtml = post.user_id === userId ? `
        <button onclick="deleteTormentPost(${post.id})" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); margin-left: auto; padding: 5px;" title="Delete Post">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
    ` : '';

    return `
        <div class="torment-post-card" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">
                    ${post.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style="font-weight: 600;">${post.username}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${timeAgo}</div>
                </div>
                ${deleteButtonHtml}
            </div>
            <div style="margin-bottom: 15px; line-height: 1.6;">${post.content}</div>
            ${screenshotHtml}
            <div style="display: flex; gap: 20px; color: var(--text-secondary); font-size: 14px; padding-top: 10px; border-top: 1px solid var(--border);">
                <button onclick="toggleLike(${post.id})" style="background: none; border: none; cursor: pointer; color: ${hasLiked ? 'var(--primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; gap: 5px;">
                    ${hasLiked ? '❤️' : '🤍'} ${likeCount}
                </button>
                <button onclick="toggleComments(${post.id})" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                    💬 ${commentCount}
                </button>
                <span>👁️ ${post.view_count}</span>
            </div>
            <div id="comments-${post.id}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);">
                ${(post.torment_comments || []).map(comment => `
                    <div style="margin-bottom: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="font-weight: 600; font-size: 13px;">${comment.username}</div>
                        <div style="font-size: 14px; margin-top: 5px;">${comment.content}</div>
                    </div>
                `).join('')}
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-tertiary);" />
                    <button onclick="addComment(${post.id})" class="btn-primary" style="padding: 8px 16px;">Post</button>
                </div>
            </div>
        </div>
    `;
}

let confirmResolve = null;

function showConfirmModal(title, message, actionText = 'Delete') {
    return new Promise((resolve) => {
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;

        const confirmBtn = document.getElementById('confirmModalBtn');
        confirmBtn.textContent = actionText;

        document.getElementById('confirmationModal').style.display = 'flex';
        confirmResolve = resolve;
    });
}

function closeConfirmModal(confirmed) {
    document.getElementById('confirmationModal').style.display = 'none';
    if (confirmResolve) {
        confirmResolve(confirmed);
        confirmResolve = null;
    }
}

async function deleteTormentPost(postId) {
    const confirmed = await showConfirmModal(
        'Delete Post?',
        'Are you sure you want to delete this post? This action cannot be undone.'
    );

    if (!confirmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete likes and comments first (handled by cascade usually, but good to be safe if not set up)
    // Actually, let's rely on RLS and Cascade. 
    // But since we didn't set up CASCADE in the SQL provided earlier (or maybe we did implicitly), 
    // let's just try deleting the post. The RLS policy should allow it if user is owner.

    const { error } = await supabase
        .from('torment_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Double check ownership

    if (error) {
        console.error('Error deleting post:', error);
        showToast('Failed to delete post', 'error');
    } else {
        showToast('Post deleted', 'success');
        await fetchTormentPosts();
        renderTormentFeed();
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'Just now';
}

function openCreatePostModal() {
    document.getElementById('createPostModal').style.display = 'flex';
    document.getElementById('postContent').value = '';
    document.getElementById('charCount').textContent = '0 / 280';
    postScreenshotFile = null;
    document.getElementById('postScreenshotPreview').style.display = 'none';

    // Add char counter
    const textarea = document.getElementById('postContent');
    textarea.oninput = function () {
        const count = this.value.length;
        document.getElementById('charCount').textContent = `${count} / 280`;
        document.getElementById('charCount').style.color = count > 280 ? 'var(--error)' : 'var(--text-secondary)';
    };
}

function closeCreatePostModal() {
    document.getElementById('createPostModal').style.display = 'none';
}

function previewPostScreenshot(event) {
    const file = event.target.files[0];
    if (!file) return;

    postScreenshotFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('postPreviewImage').src = e.target.result;
        document.getElementById('postScreenshotPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removePostScreenshot() {
    postScreenshotFile = null;
    document.getElementById('postScreenshotPreview').style.display = 'none';
    document.getElementById('postScreenshotInput').value = '';
}

async function createTormentPost() {
    const content = document.getElementById('postContent').value.trim();

    if (!content) {
        showToast('Please write something', 'error');
        return;
    }

    if (content.length > 280) {
        showToast('Post is too long (max 280 characters)', 'error');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let screenshotUrl = null;

    // Upload screenshot if exists
    if (postScreenshotFile) {
        const fileName = `torment/${user.id}/${Date.now()}_${postScreenshotFile.name}`;
        const { data, error: uploadError } = await supabase.storage
            .from('trade-screenshots')
            .upload(fileName, postScreenshotFile);

        if (uploadError) {
            console.error('Error uploading screenshot:', uploadError);
            showToast('Failed to upload screenshot', 'error');
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('trade-screenshots')
            .getPublicUrl(fileName);

        screenshotUrl = publicUrl;
    }

    // Create post object, only include screenshot_url if it exists
    const postData = {
        user_id: user.id,
        username: currentUsername,
        content: content
    };

    // Only add screenshot_url if we have one
    if (screenshotUrl) {
        postData.screenshot_url = screenshotUrl;
    }

    const { error } = await supabase
        .from('torment_posts')
        .insert([postData]);

    if (error) {
        console.error('Error creating post:', error);
        console.error('Post data:', postData);
        showToast(`Failed to create post: ${error.message}`, 'error');
    } else {
        showToast('Post created!', 'success');
        closeCreatePostModal();
        await fetchTormentPosts();
        renderTormentFeed();
    }
}

async function toggleLike(postId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = tormentPosts.find(p => p.id === postId);
    const hasLiked = post.torment_likes?.some(like => like.user_id === user.id);

    if (hasLiked) {
        // Unlike
        await supabase
            .from('torment_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
    } else {
        // Like
        await supabase
            .from('torment_likes')
            .insert([{ post_id: postId, user_id: user.id }]);
    }

    await fetchTormentPosts();
    renderTormentFeed();
}

function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    commentsDiv.style.display = commentsDiv.style.display === 'none' ? 'block' : 'none';

    // Increment view count when opening
    if (commentsDiv.style.display === 'block') {
        incrementViewCount(postId);
    }
}

async function incrementViewCount(postId) {
    const post = tormentPosts.find(p => p.id === postId);
    if (!post) return;

    await supabase
        .from('torment_posts')
        .update({ view_count: post.view_count + 1 })
        .eq('id', postId);

    // Update local state
    post.view_count += 1;
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();

    if (!content) return;

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
