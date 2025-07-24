document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  initApp();
});

// Global state
let currentUser = null;
let authToken = null;

// DOM Elements
const elements = {
  // Auth elements
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  logoutBtn: document.getElementById('logout-btn'),

  // Profile elements
  profileContainer: document.getElementById('profile-container'),
  followBtn: document.getElementById('follow-btn'),
  editProfileBtn: document.getElementById('edit-profile-btn'),
  profilePictureInput: document.getElementById('profile-picture-input'),
  profilePictureForm: document.getElementById('profile-picture-form'),

  // Post elements
  postForm: document.getElementById('post-form'),
  postContent: document.getElementById('post-content'),
  postImageInput: document.getElementById('post-image-input'),
  postImagePreview: document.getElementById('post-image-preview'),
  postsContainer: document.getElementById('posts-container'),
  feedContainer: document.getElementById('feed-container'),

  // Comment elements
  commentForms: document.querySelectorAll('.comment-form'),
  commentInputs: document.querySelectorAll('.comment-input'),

  // Modal elements
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  modalClose: document.getElementById('modal-close'),

  // Navigation elements
  navLinks: document.querySelectorAll('.nav-link'),
  profileLink: document.getElementById('profile-link')
};

// Initialize the application
function initApp() {
  // Check for authenticated user
  checkAuth();

  // Set up event listeners
  setupEventListeners();

  // Load appropriate content based on route
  loadRouteContent();
}

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
    fetchCurrentUser();
  }
}

// Fetch current user data
function fetchCurrentUser() {
  fetch('/api/users/me', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Not authenticated');
    return response.json();
  })
  .then(data => {
    currentUser = data;
    updateUIForAuth();
  })
  .catch(error => {
    console.error('Authentication check failed:', error);
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    updateUIForAuth();
  });
}

// Set up event listeners
function setupEventListeners() {
  // Auth forms
  if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', handleLogin);
  }
  if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', handleRegister);
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', handleLogout);
  }

  // Profile interactions
  if (elements.followBtn) {
    elements.followBtn.addEventListener('click', toggleFollow);
  }
  if (elements.editProfileBtn) {
    elements.editProfileBtn.addEventListener('click', showEditProfileModal);
  }
  if (elements.profilePictureInput) {
    elements.profilePictureInput.addEventListener('change', handleProfilePictureChange);
  }
  if (elements.profilePictureForm) {
    elements.profilePictureForm.addEventListener('submit', uploadProfilePicture);
  }

  // Post interactions
  if (elements.postForm) {
    elements.postForm.addEventListener('submit', createPost);
  }
  if (elements.postImageInput) {
    elements.postImageInput.addEventListener('change', previewPostImages);
  }

  // Comment interactions
  elements.commentForms.forEach(form => {
    form.addEventListener('submit', addComment);
  });
  elements.commentInputs.forEach(input => {
    input.addEventListener('keypress', handleCommentKeypress);
  });

  // Modal interactions
  if (elements.modalClose) {
    elements.modalClose.addEventListener('click', closeModal);
  }
  if (elements.modalOverlay) {
    elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.modalOverlay) {
        closeModal();
      }
    });
  }

  // Navigation
  elements.navLinks.forEach(link => {
    link.addEventListener('click', handleNavigation);
  });

  // Window popstate for back/forward navigation
  window.addEventListener('popstate', loadRouteContent);
}

// Load content based on current route
function loadRouteContent() {
  const path = window.location.pathname;
  
  // Clear previous content
  document.querySelectorAll('.page-content').forEach(el => {
    el.style.display = 'none';
  });

  // Show appropriate content based on route
  if (path === '/' || path === '/index.html') {
    loadFeed();
    document.getElementById('feed-page').style.display = 'block';
  } else if (path === '/login.html') {
    document.getElementById('login-page').style.display = 'block';
  } else if (path === '/register.html') {
    document.getElementById('register-page').style.display = 'block';
  } else if (path.startsWith('/profile.html')) {
    const username = new URLSearchParams(window.location.search).get('username');
    loadProfile(username || currentUser?.username);
    document.getElementById('profile-page').style.display = 'block';
  } else if (path.startsWith('/post.html')) {
    const postId = new URLSearchParams(window.location.search).get('id');
    loadPost(postId);
    document.getElementById('post-page').style.display = 'block';
  }
}

// Handle navigation
function handleNavigation(e) {
  e.preventDefault();
  const href = e.currentTarget.getAttribute('href');
  window.history.pushState({}, '', href);
  loadRouteContent();
}

// Update UI based on authentication state
function updateUIForAuth() {
  const authElements = document.querySelectorAll('.auth-only');
  const unauthElements = document.querySelectorAll('.unauth-only');

  if (currentUser) {
    // User is authenticated
    authElements.forEach(el => el.style.display = 'block');
    unauthElements.forEach(el => el.style.display = 'none');

    // Update profile link
    if (elements.profileLink) {
      elements.profileLink.href = `/profile.html?username=${currentUser.username}`;
      const profilePic = elements.profileLink.querySelector('.profile-pic');
      if (profilePic) {
        profilePic.src = currentUser.profilePicture || '/images/default-profile.png';
      }
    }
  } else {
    // User is not authenticated
    authElements.forEach(el => el.style.display = 'none');
    unauthElements.forEach(el => el.style.display = 'block');

    // Redirect to login if on protected page
    const protectedPages = ['/profile.html', '/post.html'];
    if (protectedPages.some(page => window.location.pathname.includes(page))) {
      window.location.href = '/login.html';
    }
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Show modal
function showModal(content) {
  elements.modalContent.innerHTML = content;
  elements.modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
  elements.modalOverlay.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Handle login
function handleLogin(e) {
  e.preventDefault();
  const formData = new FormData(elements.loginForm);
  const data = {
    username: formData.get('username'),
    password: formData.get('password')
  };

  fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  })
  .then(data => {
    localStorage.setItem('authToken', data.token);
    authToken = data.token;
    currentUser = data.user;
    updateUIForAuth();
    showNotification('Logged in successfully');
    window.location.href = '/';
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Handle register
function handleRegister(e) {
  e.preventDefault();
  const formData = new FormData(elements.registerForm);
  const data = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName')
  };

  fetch('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  })
  .then(data => {
    localStorage.setItem('authToken', data.token);
    authToken = data.token;
    currentUser = data.user;
    updateUIForAuth();
    showNotification('Registered successfully');
    window.location.href = '/';
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Handle logout
function handleLogout() {
  fetch('/api/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(() => {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    updateUIForAuth();
    showNotification('Logged out successfully');
    window.location.href = '/login.html';
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Load user profile
function loadProfile(username) {
  if (!username) return;

  fetch(`/api/users/${username}`)
  .then(response => {
    if (!response.ok) throw new Error('Profile not found');
    return response.json();
  })
  .then(profile => {
    renderProfile(profile);
    loadUserPosts(profile.username);
  })
  .catch(error => {
    showNotification(error.message, 'error');
    window.location.href = '/';
  });
}

// Render profile
function renderProfile(profile) {
  const profileHeader = document.getElementById('profile-header');
  if (!profileHeader) return;

  profileHeader.innerHTML = `
    <div class="cover-photo" style="background-image: url('${profile.coverPhoto || '/images/default-cover.jpg'}')"></div>
    <div class="profile-info">
      <img src="${profile.profilePicture || '/images/default-profile.png'}" alt="${profile.username}" class="profile-pic-large">
      <div class="profile-details">
        <h1 class="profile-name">${profile.firstName} ${profile.lastName}</h1>
        <p class="profile-username">@${profile.username}</p>
        <p class="profile-bio">${profile.bio || 'No bio yet'}</p>
        
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-count">${profile.postCount || 0}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-item" id="followers-stat" style="cursor: pointer;">
            <span class="stat-count">${profile.followerCount || 0}</span>
            <span class="stat-label">Followers</span>
          </div>
          <div class="stat-item" id="following-stat" style="cursor: pointer;">
            <span class="stat-count">${profile.followingCount || 0}</span>
            <span class="stat-label">Following</span>
          </div>
        </div>
        
        ${currentUser && currentUser.username === profile.username ? `
          <div class="profile-actions">
            <button id="edit-profile-btn" class="btn btn-outline">Edit Profile</button>
            <form id="profile-picture-form" enctype="multipart/form-data" style="display: none;">
              <input type="file" id="profile-picture-input" name="profilePicture" accept="image/*">
            </form>
          </div>
        ` : `
          <button id="follow-btn" class="btn ${profile.isFollowing ? 'btn-outline' : 'btn-primary'}">
            ${profile.isFollowing ? 'Following' : 'Follow'}
          </button>
        `}
      </div>
    </div>
    
    <div class="profile-tabs">
      <div class="tab active" data-tab="posts">Posts</div>
      <div class="tab" data-tab="about">About</div>
    </div>
  `;

  // Add event listeners for the new elements
  if (currentUser && currentUser.username === profile.username) {
    document.getElementById('edit-profile-btn').addEventListener('click', showEditProfileModal);
    document.getElementById('profile-picture-input').addEventListener('change', handleProfilePictureChange);
  } else {
    document.getElementById('follow-btn').addEventListener('click', toggleFollow);
  }

  // Add event listeners for followers/following stats
  document.getElementById('followers-stat').addEventListener('click', () => showFollowersModal(profile.username));
  document.getElementById('following-stat').addEventListener('click', () => showFollowingModal(profile.username));

  // Add tab switching functionality
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Here you would switch between posts and about content
      // For now, we'll just show posts by default
    });
  });
}

// Show edit profile modal
function showEditProfileModal() {
  fetch(`/api/users/${currentUser.username}`)
  .then(response => response.json())
  .then(profile => {
    const modalContent = `
      <div class="modal-header">
        <h3 class="modal-title">Edit Profile</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <form id="edit-profile-form">
          <div class="form-group">
            <label for="edit-firstName">First Name</label>
            <input type="text" id="edit-firstName" name="firstName" value="${profile.firstName || ''}">
          </div>
          <div class="form-group">
            <label for="edit-lastName">Last Name</label>
            <input type="text" id="edit-lastName" name="lastName" value="${profile.lastName || ''}">
          </div>
          <div class="form-group">
            <label for="edit-bio">Bio</label>
            <textarea id="edit-bio" name="bio" rows="3">${profile.bio || ''}</textarea>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;

    showModal(modalContent);

    document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      updateProfile();
    });
  });
}

// Update profile
function updateProfile() {
  const formData = {
    firstName: document.getElementById('edit-firstName').value,
    lastName: document.getElementById('edit-lastName').value,
    bio: document.getElementById('edit-bio').value
  };

  fetch(`/api/users/${currentUser.username}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(formData)
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  })
  .then(updatedProfile => {
    currentUser = { ...currentUser, ...updatedProfile };
    closeModal();
    loadProfile(currentUser.username);
    showNotification('Profile updated successfully');
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Handle profile picture change
function handleProfilePictureChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('profilePicture', file);

  fetch(`/api/users/${currentUser.username}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to upload profile picture');
    return response.json();
  })
  .then(data => {
    currentUser.profilePicture = data.profilePicture;
    updateUIForAuth();
    loadProfile(currentUser.username);
    showNotification('Profile picture updated successfully');
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Toggle follow/unfollow
function toggleFollow() {
  const username = new URLSearchParams(window.location.search).get('username');
  const isFollowing = document.getElementById('follow-btn').textContent.trim() === 'Following';
  
  const endpoint = isFollowing ? 'unfollow' : 'follow';
  
  fetch(`/api/users/${username}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) throw new Error(`Failed to ${endpoint} user`);
    return response.json();
  })
  .then(() => {
    loadProfile(username);
    showNotification(`Successfully ${isFollowing ? 'unfollowed' : 'followed'} user`);
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Show followers modal
function showFollowersModal(username) {
  fetch(`/api/users/${username}/followers`)
  .then(response => response.json())
  .then(followers => {
    const modalContent = `
      <div class="modal-header">
        <h3 class="modal-title">Followers</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="follow-list">
          ${followers.length > 0 ? followers.map(follower => `
            <div class="follow-item">
              <img src="${follower.profilePicture || '/images/default-profile.png'}" alt="${follower.username}" class="follow-pic">
              <div class="follow-info">
                <div class="follow-name">${follower.firstName} ${follower.lastName}</div>
                <div class="follow-username">@${follower.username}</div>
              </div>
              ${currentUser && currentUser.username !== follower.username ? `
                <button class="follow-btn ${follower.isFollowing ? 'btn-outline' : 'btn-primary'}" 
                        data-username="${follower.username}">
                  ${follower.isFollowing ? 'Following' : 'Follow'}
                </button>
              ` : ''}
            </div>
          `).join('') : `
            <div class="empty-state">
              <div class="empty-text">No followers yet</div>
            </div>
          `}
        </div>
      </div>
    `;

    showModal(modalContent);

    // Add event listeners to follow buttons in modal
    document.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const followerUsername = e.target.getAttribute('data-username');
        const isFollowing = e.target.textContent.trim() === 'Following';
        
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        
        fetch(`/api/users/${followerUsername}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to ${endpoint} user`);
          showFollowersModal(username);
          showNotification(`Successfully ${isFollowing ? 'unfollowed' : 'followed'} user`);
        })
        .catch(error => {
          showNotification(error.message, 'error');
        });
      });
    });
  });
}

// Show following modal
function showFollowingModal(username) {
  fetch(`/api/users/${username}/following`)
  .then(response => response.json())
  .then(following => {
    const modalContent = `
      <div class="modal-header">
        <h3 class="modal-title">Following</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="follow-list">
          ${following.length > 0 ? following.map(user => `
            <div class="follow-item">
              <img src="${user.profilePicture || '/images/default-profile.png'}" alt="${user.username}" class="follow-pic">
              <div class="follow-info">
                <div class="follow-name">${user.firstName} ${user.lastName}</div>
                <div class="follow-username">@${user.username}</div>
              </div>
              ${currentUser && currentUser.username !== user.username ? `
                <button class="follow-btn ${user.isFollowing ? 'btn-outline' : 'btn-primary'}" 
                        data-username="${user.username}">
                  ${user.isFollowing ? 'Following' : 'Follow'}
                </button>
              ` : ''}
            </div>
          `).join('') : `
            <div class="empty-state">
              <div class="empty-text">Not following anyone yet</div>
            </div>
          `}
        </div>
      </div>
    `;

    showModal(modalContent);

    // Add event listeners to follow buttons in modal
    document.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const followingUsername = e.target.getAttribute('data-username');
        const isFollowing = e.target.textContent.trim() === 'Following';
        
        const endpoint = isFollowing ? 'unfollow' : 'follow';
        
        fetch(`/api/users/${followingUsername}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to ${endpoint} user`);
          showFollowingModal(username);
          showNotification(`Successfully ${isFollowing ? 'unfollowed' : 'followed'} user`);
        })
        .catch(error => {
          showNotification(error.message, 'error');
        });
      });
    });
  });
}

// Load user posts
function loadUserPosts(username) {
  fetch(`/api/users/${username}/posts`)
  .then(response => response.json())
  .then(posts => {
    renderPosts(posts, 'profile-posts-container');
  })
  .catch(error => {
    console.error('Error loading user posts:', error);
  });
}

// Load feed posts
function loadFeed() {
  if (!currentUser) return;

  fetch('/api/feed', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => response.json())
  .then(posts => {
    renderPosts(posts, 'feed-container');
  })
  .catch(error => {
    console.error('Error loading feed:', error);
  });
}

// Load single post
function loadPost(postId) {
  fetch(`/api/posts/${postId}`)
  .then(response => response.json())
  .then(post => {
    renderPostDetail(post);
  })
  .catch(error => {
    console.error('Error loading post:', error);
    showNotification('Post not found', 'error');
    window.location.href = '/';
  });
}

// Render posts
function renderPosts(posts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No posts to show</div>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="post-card fade-in" data-post-id="${post._id}">
      <div class="post-header">
        <img src="${post.author.profilePicture || '/images/default-profile.png'}" 
             alt="${post.author.username}" class="post-author-pic">
        <div class="post-author-info">
          <div class="post-author-name">${post.author.firstName} ${post.author.lastName}</div>
          <div class="post-time">${formatDate(post.createdAt)}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      ${post.images && post.images.length > 0 ? `
        <img src="${post.images[0]}" alt="Post image" class="post-image">
      ` : ''}
      <div class="post-actions">
        <div class="post-action ${post.isLiked ? 'liked' : ''}" data-action="like">
          <span class="action-icon">👍</span>
          <span class="action-count">${post.likeCount || 0}</span>
        </div>
        <div class="post-action" data-action="comment">
          <span class="action-icon">💬</span>
          <span class="action-count">${post.commentCount || 0}</span>
        </div>
        <div class="post-action" data-action="share">
          <span class="action-icon">↗️</span>
        </div>
      </div>
      <div class="comment-section">
        <div class="comment-input">
          <img src="${currentUser.profilePicture || '/images/default-profile.png'}" 
               alt="${currentUser.username}" class="comment-author-pic">
          <input type="text" class="comment-input" placeholder="Write a comment...">
        </div>
      </div>
    </div>
  `).join('');

  // Add event listeners to post actions
  document.querySelectorAll('.post-action').forEach(action => {
    action.addEventListener('click', handlePostAction);
  });

  // Add event listeners to comment inputs
  document.querySelectorAll('.comment-input input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        const postId = e.target.closest('.post-card').getAttribute('data-post-id');
        addCommentToPost(postId, e.target.value.trim());
        e.target.value = '';
      }
    });
  });
}

// Render single post detail
function renderPostDetail(post) {
  const container = document.getElementById('post-detail-container');
  if (!container) return;

  container.innerHTML = `
    <div class="post-card fade-in">
      <div class="post-header">
        <img src="${post.author.profilePicture || '/images/default-profile.png'}" 
             alt="${post.author.username}" class="post-author-pic">
        <div class="post-author-info">
          <div class="post-author-name">${post.author.firstName} ${post.author.lastName}</div>
          <div class="post-time">${formatDate(post.createdAt)}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      ${post.images && post.images.length > 0 ? `
        <img src="${post.images[0]}" alt="Post image" class="post-image">
      ` : ''}
      <div class="post-actions">
        <div class="post-action ${post.isLiked ? 'liked' : ''}" data-action="like">
          <span class="action-icon">👍</span>
          <span class="action-count">${post.likeCount || 0}</span>
        </div>
        <div class="post-action" data-action="comment">
          <span class="action-icon">💬</span>
          <span class="action-count">${post.commentCount || 0}</span>
        </div>
        <div class="post-action" data-action="share">
          <span class="action-icon">↗️</span>
        </div>
      </div>
      <div class="comment-section">
        <div class="comment-input">
          <img src="${currentUser.profilePicture || '/images/default-profile.png'}" 
               alt="${currentUser.username}" class="comment-author-pic">
          <input type="text" class="comment-input" placeholder="Write a comment...">
        </div>
        <div class="comment-list" id="post-comments">
          ${post.comments.map(comment => renderComment(comment)).join('')}
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  document.querySelectorAll('.post-action').forEach(action => {
    action.addEventListener('click', handlePostAction);
  });

  document.querySelector('.comment-input input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      addCommentToPost(post._id, e.target.value.trim());
      e.target.value = '';
    }
  });

  // Add event listeners to reply buttons
  document.querySelectorAll('.comment-action.reply').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const commentId = e.target.closest('.comment-item').getAttribute('data-comment-id');
      showReplyInput(commentId, post._id);
    });
  });
}

// Render comment
function renderComment(comment) {
  return `
    <div class="comment-item" data-comment-id="${comment._id}">
      <img src="${comment.author.profilePicture || '/images/default-profile.png'}" 
           alt="${comment.author.username}" class="comment-author-pic">
      <div class="comment-content">
        <div class="comment-author-name">${comment.author.firstName} ${comment.author.lastName}</div>
        <div class="comment-text">${comment.content}</div>
        <div class="comment-actions">
          <span class="comment-action like">Like</span>
          <span class="comment-action reply">Reply</span>
          <span class="comment-action time">${formatDate(comment.createdAt)}</span>
          ${comment.author._id === currentUser._id ? `
            <span class="comment-action delete">Delete</span>
          ` : ''}
        </div>
      </div>
    </div>
    ${comment.replies && comment.replies.length > 0 ? `
      <div class="reply-list">
        ${comment.replies.map(reply => renderComment(reply)).join('')}
      </div>
    ` : ''}
  `;
}

// Show reply input
function showReplyInput(commentId, postId) {
  const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
  if (!commentItem) return;

  const existingReplyInput = commentItem.querySelector('.reply-input');
  if (existingReplyInput) {
    existingReplyInput.remove();
    return;
  }

  const replyInput = document.createElement('div');
  replyInput.className = 'reply-input';
  replyInput.innerHTML = `
    <div class="comment-input" style="margin-left: 42px; margin-top: 10px;">
      <img src="${currentUser.profilePicture || '/images/default-profile.png'}" 
           alt="${currentUser.username}" class="comment-author-pic">
      <input type="text" placeholder="Write a reply..." data-post-id="${postId}" data-parent-id="${commentId}">
    </div>
  `;

  const replyList = commentItem.nextElementSibling;
  if (replyList && replyList.classList.contains('reply-list')) {
    replyList.prepend(replyInput);
  } else {
    const newReplyList = document.createElement('div');
    newReplyList.className = 'reply-list';
    newReplyList.appendChild(replyInput);
    commentItem.parentNode.insertBefore(newReplyList, commentItem.nextSibling);
  }

  replyInput.querySelector('input').focus();
  replyInput.querySelector('input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      addCommentToPost(
        e.target.getAttribute('data-post-id'),
        e.target.value.trim(),
        e.target.getAttribute('data-parent-id')
      );
      e.target.value = '';
      replyInput.remove();
    }
  });
}

// Handle post action (like, comment, share)
function handlePostAction(e) {
  const action = e.currentTarget.getAttribute('data-action');
  const postId = e.currentTarget.closest('.post-card').getAttribute('data-post-id');
  
  if (action === 'like') {
    toggleLikePost(postId, e.currentTarget);
  } else if (action === 'comment') {
    e.currentTarget.closest('.post-card').querySelector('.comment-input input').focus();
  } else if (action === 'share') {
    sharePost(postId);
  }
}

// Toggle like on post
function toggleLikePost(postId, likeElement) {
  const isLiked = likeElement.classList.contains('liked');
  const endpoint = isLiked ? 'unlike' : 'like';
  
  fetch(`/api/posts/${postId}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(response => {
    if (!response.ok) throw new Error(`Failed to ${endpoint} post`);
    return response.json();
  })
  .then(() => {
    const countElement = likeElement.querySelector('.action-count');
    let count = parseInt(countElement.textContent) || 0;
    count = isLiked ? count - 1 : count + 1;
    countElement.textContent = count;
    
    likeElement.classList.toggle('liked');
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Share post
function sharePost(postId) {
  // In a real app, this would open a share dialog
  // For now, we'll just copy the post URL to clipboard
  const postUrl = `${window.location.origin}/post.html?id=${postId}`;
  navigator.clipboard.writeText(postUrl)
    .then(() => {
      showNotification('Post link copied to clipboard');
    })
    .catch(() => {
      showNotification('Failed to copy post link', 'error');
    });
}

// Add comment to post
function addCommentToPost(postId, content, parentCommentId = null) {
  fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      content,
      parentCommentId
    })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  })
  .then(comment => {
    // If we're on the post detail page, add the comment to the list
    if (window.location.pathname.includes('/post.html')) {
      const commentsContainer = document.getElementById('post-comments');
      if (parentCommentId) {
        // Find the parent comment and add the reply
        const parentComment = document.querySelector(`.comment-item[data-comment-id="${parentCommentId}"]`);
        if (parentComment) {
          let replyList = parentComment.nextElementSibling;
          if (!replyList || !replyList.classList.contains('reply-list')) {
            replyList = document.createElement('div');
            replyList.className = 'reply-list';
            parentComment.parentNode.insertBefore(replyList, parentComment.nextSibling);
          }
          replyList.insertAdjacentHTML('beforeend', renderComment(comment));
        }
      } else {
        commentsContainer.insertAdjacentHTML('afterbegin', renderComment(comment));
      }
    } else {
      // On other pages, just update the comment count
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        const commentCountElement = postCard.querySelector('.post-action[data-action="comment"] .action-count');
        let count = parseInt(commentCountElement.textContent) || 0;
        commentCountElement.textContent = count + 1;
      }
    }
    
    showNotification('Comment added');
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Create post
function createPost(e) {
  e.preventDefault();
  const content = elements.postContent.value.trim();
  if (!content) return;

  const formData = new FormData();
  formData.append('content', content);

  // Add images if any
  if (elements.postImageInput.files.length > 0) {
    for (let i = 0; i < elements.postImageInput.files.length; i++) {
      formData.append('images', elements.postImageInput.files[i]);
    }
  }

  fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  })
  .then(post => {
    elements.postContent.value = '';
    elements.postImagePreview.innerHTML = '';
    elements.postImageInput.value = '';
    
    // Prepend the new post to the feed
    if (elements.feedContainer) {
      const postsContainer = elements.feedContainer;
      if (postsContainer.querySelector('.empty-state')) {
        postsContainer.innerHTML = '';
      }
      postsContainer.insertAdjacentHTML('afterbegin', `
        <div class="post-card fade-in" data-post-id="${post._id}">
          ${renderPostContent(post)}
        </div>
      `);
    }
    
    showNotification('Post created successfully');
  })
  .catch(error => {
    showNotification(error.message, 'error');
  });
}

// Preview post images
function previewPostImages() {
  elements.postImagePreview.innerHTML = '';
  if (elements.postImageInput.files.length === 0) return;

  for (let i = 0; i < elements.postImageInput.files.length; i++) {
    const file = elements.postImageInput.files[i];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'preview-image';
      imgContainer.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="remove-image" data-index="${i}">&times;</button>
      `;
      elements.postImagePreview.appendChild(imgContainer);
      
      // Add event listener to remove button
      imgContainer.querySelector('.remove-image').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeImageFromPreview(i);
      });
    };
    
    reader.readAsDataURL(file);
  }
}

// Remove image from preview
function removeImageFromPreview(index) {
  const dt = new DataTransfer();
  const files = elements.postImageInput.files;
  
  for (let i = 0; i < files.length; i++) {
    if (i !== index) {
      dt.items.add(files[i]);
    }
  }
  
  elements.postImageInput.files = dt.files;
  previewPostImages();
}

// Handle comment keypress
function handleCommentKeypress(e) {
  if (e.key === 'Enter' && e.target.value.trim()) {
    const postId = e.target.closest('.post-card').getAttribute('data-post-id');
    addCommentToPost(postId, e.target.value.trim());
    e.target.value = '';
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Render post content
function renderPostContent(post) {
  return `
    <div class="post-header">
      <img src="${post.author.profilePicture || '/images/default-profile.png'}" 
           alt="${post.author.username}" class="post-author-pic">
      <div class="post-author-info">
        <div class="post-author-name">${post.author.firstName} ${post.author.lastName}</div>
        <div class="post-time">${formatDate(post.createdAt)}</div>
      </div>
    </div>
    <div class="post-content">${post.content}</div>
    ${post.images && post.images.length > 0 ? `
      <img src="${post.images[0]}" alt="Post image" class="post-image">
    ` : ''}
    <div class="post-actions">
      <div class="post-action ${post.isLiked ? 'liked' : ''}" data-action="like">
        <span class="action-icon">👍</span>
        <span class="action-count">${post.likeCount || 0}</span>
      </div>
      <div class="post-action" data-action="comment">
        <span class="action-icon">💬</span>
        <span class="action-count">${post.commentCount || 0}</span>
      </div>
      <div class="post-action" data-action="share">
        <span class="action-icon">↗️</span>
      </div>
    </div>
    <div class="comment-section">
      <div class="comment-input">
        <img src="${currentUser.profilePicture || '/images/default-profile.png'}" 
             alt="${currentUser.username}" class="comment-author-pic">
        <input type="text" class="comment-input" placeholder="Write a comment...">
      </div>
    </div>
  `;
}