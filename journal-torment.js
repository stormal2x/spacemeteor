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

    // Check localStorage with user-specific key
    const storageKey = `torment_username_${user.id}`;
    currentUsername = localStorage.getItem(storageKey);

    if (!currentUsername) {
        // Show custom modal
        return new Promise((resolve) => {
            document.getElementById('usernameSetupModal').style.display = 'flex';
            window._usernameResolve = resolve;
        });
    }
}

async function saveUsername() {
    const input = document.getElementById('usernameInput');
    const username = input.value.trim();

    if (!username) {
        showToast('Please enter a username', 'error');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showToast('You must be logged in', 'error');
        return;
    }

    currentUsername = username;
    localStorage.setItem(`torment_username_${user.id}`, currentUsername);
    document.getElementById('usernameSetupModal').style.display = 'none';
    showToast(`Welcome, ${currentUsername}!`, 'success');

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
            torment_comments (id, username, content, created_at, screenshot_url)
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

    // Track which comment sections are open before re-rendering
    const openCommentSections = [];
    tormentPosts.forEach(post => {
        const commentsDiv = document.getElementById(`comments-${post.id}`);
        if (commentsDiv && commentsDiv.style.display !== 'none') {
            openCommentSections.push(post.id);
        }
    });

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    feed.innerHTML = tormentPosts.map(post => createPostCard(post, userId)).join('');

    // Restore open comment sections
    openCommentSections.forEach(postId => {
        const commentsDiv = document.getElementById(`comments-${postId}`);
        if (commentsDiv) {
            commentsDiv.style.display = 'block';
            commentsDiv.style.maxHeight = '2000px';
            commentsDiv.style.opacity = '1';
            commentsDiv.style.marginTop = '15px';
            commentsDiv.style.paddingTop = '15px';
        }
    });
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
                <button onclick="toggleLike(${post.id})" id="like-btn-${post.id}" style="background: none; border: none; cursor: pointer; color: ${hasLiked ? 'var(--primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; gap: 5px; transition: transform 0.2s ease;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${hasLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="transition: all 0.3s ease;">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span id="like-count-${post.id}">${likeCount}</span>
                </button>
                <button onclick="toggleComments(${post.id})" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; transition: color 0.2s ease;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    ${commentCount}
                </button>
            </div>
            <div id="comments-${post.id}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border); overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.3s ease, padding-top 0.3s ease;">
                ${(post.torment_comments || []).map(comment => {
        const isCommentOwner = comment.user_id === userId;
        const deleteCommentBtn = isCommentOwner ? `
                        <button onclick="deleteComment(${post.id}, ${comment.id})" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 2px; margin-left: auto;" title="Delete Comment">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : '';

        return `
                        <div style="margin-bottom: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="font-weight: 600; font-size: 13px;">${comment.username}</div>
                                ${deleteCommentBtn}
                            </div>
                            <div style="font-size: 14px; margin-top: 5px;">${comment.content}</div>
                            ${comment.screenshot_url ? `<img src="${comment.screenshot_url}" style="max-width: 200px; border-radius: 6px; margin-top: 10px; cursor: pointer;" onclick="openImageModal('${comment.screenshot_url}')" />` : ''}
                        </div>
                    `;
    }).join('')}
                
                <!-- Comment Input Area -->
                <div style="margin-top: 10px;">
                    <!-- Image Preview -->
                    <div id="comment-preview-${post.id}" style="display: none; margin-bottom: 10px; position: relative; width: fit-content;">
                        <img id="comment-preview-img-${post.id}" style="max-height: 100px; border-radius: 6px; border: 1px solid var(--border);" />
                        <button onclick="removeCommentImage(${post.id})" style="position: absolute; top: -8px; right: -8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px;">&times;</button>
                    </div>
                    
                    <!-- Text Input -->
                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." style="width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-primary); font-size: 14px; margin-bottom: 10px; box-sizing: border-box;" />
                    
                    <!-- Buttons Row -->
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="file" id="comment-file-${post.id}" accept="image/*" style="display: none;" onchange="previewCommentImage(${post.id}, event)" />
                        <label for="comment-file-${post.id}" style="cursor: pointer; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-tertiary); color: var(--text-secondary); display: flex; align-items: center; gap: 6px; font-size: 14px; transition: var(--transition);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                            </svg>
                            <span>Image</span>
                        </label>
                        <button onclick="addComment(${post.id})" class="btn-primary" style="padding: 8px 16px; font-size: 14px;">Post</button>
                    </div>
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

    const { error } = await supabase
        .from('torment_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

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

    const postData = {
        user_id: user.id,
        username: currentUsername,
        content: content
    };

    if (screenshotUrl) {
        postData.screenshot_url = screenshotUrl;
    }

    const { error } = await supabase
        .from('torment_posts')
        .insert([postData]);

    if (error) {
        console.error('Error creating post:', error);
        showToast(`Failed to create post: ${error.message}`, 'error');
    } else {
        showToast('Post created!', 'success');
        closeCreatePostModal();
        await fetchTormentPosts();
        renderTormentFeed();
    }
}

let likeInProgress = {};

async function toggleLike(postId) {
    // Prevent spam clicks
    if (likeInProgress[postId]) return;
    likeInProgress[postId] = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        likeInProgress[postId] = false;
        return;
    }

    const post = tormentPosts.find(p => p.id === postId);
    const hasLiked = post.torment_likes?.some(like => like.user_id === user.id);

    // Optimistic UI update
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likeCountSpan = document.getElementById(`like-count-${postId}`);
    const svg = likeBtn?.querySelector('svg');

    if (!likeBtn || !likeCountSpan || !svg) {
        likeInProgress[postId] = false;
        return;
    }

    if (hasLiked) {
        // Unlike animation
        likeBtn.style.color = 'var(--text-secondary)';
        svg.setAttribute('fill', 'none');
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
    } else {
        // Like animation
        likeBtn.style.color = 'var(--primary)';
        svg.setAttribute('fill', 'currentColor');
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;

        // Bounce animation
        likeBtn.style.transform = 'scale(1.3)';
        setTimeout(() => {
            likeBtn.style.transform = 'scale(1)';
        }, 200);
    }

    // Actual database update
    if (hasLiked) {
        await supabase
            .from('torment_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
    } else {
        await supabase
            .from('torment_likes')
            .insert([{ post_id: postId, user_id: user.id }]);
    }

    // Refresh data in background
    await fetchTormentPosts();
    likeInProgress[postId] = false;
}

function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    const isVisible = commentsDiv.style.display !== 'none';

    if (isVisible) {
        // Close animation
        commentsDiv.style.maxHeight = '0';
        commentsDiv.style.opacity = '0';
        commentsDiv.style.marginTop = '0';
        commentsDiv.style.paddingTop = '0';
        setTimeout(() => {
            commentsDiv.style.display = 'none';
        }, 300);
    } else {
        // Open animation
        commentsDiv.style.display = 'block';
        setTimeout(() => {
            commentsDiv.style.maxHeight = '2000px';
            commentsDiv.style.opacity = '1';
            commentsDiv.style.marginTop = '15px';
            commentsDiv.style.paddingTop = '15px';
        }, 10);
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    const fileInput = document.getElementById(`comment-file-${postId}`);
    const file = fileInput?.files[0];

    if (!content && !file) return;

    if (content.length > 280) {
        showToast('Comment is too long (max 280 characters)', 'error');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let screenshotUrl = null;

    if (file) {
        const fileName = `comments/${user.id}/${Date.now()}_${file.name}`;
        const { data, error: uploadError } = await supabase.storage
            .from('trade-screenshots')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading comment image:', uploadError);
            showToast('Failed to upload image', 'error');
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('trade-screenshots')
            .getPublicUrl(fileName);

        screenshotUrl = publicUrl;
    }

    const commentData = {
        post_id: postId,
        user_id: user.id,
        username: currentUsername,
        content: content
    };

    if (screenshotUrl) {
        commentData.screenshot_url = screenshotUrl;
    }

    const { error } = await supabase
        .from('torment_comments')
        .insert([commentData]);

    if (error) {
        showToast('Failed to add comment', 'error');
    } else {
        input.value = '';
        if (fileInput) fileInput.value = '';
        removeCommentImage(postId); // Clear preview

        await fetchTormentPosts();
        renderTormentFeed();

        // Keep comments section open after posting
        const commentsDiv = document.getElementById(`comments-${postId}`);
        if (commentsDiv) {
            commentsDiv.style.display = 'block';
            commentsDiv.style.maxHeight = '2000px';
            commentsDiv.style.opacity = '1';
            commentsDiv.style.marginTop = '15px';
            commentsDiv.style.paddingTop = '15px';
        }
    }
}

function previewCommentImage(postId, event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById(`comment-preview-img-${postId}`).src = e.target.result;
        document.getElementById(`comment-preview-${postId}`).style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeCommentImage(postId) {
    document.getElementById(`comment-preview-${postId}`).style.display = 'none';
    document.getElementById(`comment-file-${postId}`).value = '';
}

async function deleteComment(postId, commentId) {
    const confirmed = await showConfirmModal(
        'Delete Comment?',
        'Are you sure you want to delete this comment?'
    );

    if (!confirmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('torment_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure ownership

    if (error) {
        console.error('Error deleting comment:', error);
        showToast('Failed to delete comment', 'error');
    } else {
        showToast('Comment deleted', 'success');
        await fetchTormentPosts();
        renderTormentFeed();

        // Keep the comment section open
        const commentsDiv = document.getElementById(`comments-${postId}`);
        if (commentsDiv) {
            commentsDiv.style.display = 'block';
            commentsDiv.style.maxHeight = '2000px';
            commentsDiv.style.opacity = '1';
            commentsDiv.style.marginTop = '15px';
            commentsDiv.style.paddingTop = '15px';
        }
    }
}
