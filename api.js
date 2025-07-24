const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  followUser,
  unfollowUser,
  createPost,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment,
  getFeed,
  searchUsers,
  getFollowers,
  getFollowing,
  getLikesForPost,
  uploadProfilePicture
} = require('../controllers/logic');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// User routes
router.get('/users/:username', getUserProfile);
router.put('/users/:username', authMiddleware, updateUserProfile);
router.delete('/users/:username', authMiddleware, deleteUserProfile);
router.post('/users/:username/follow', authMiddleware, followUser);
router.post('/users/:username/unfollow', authMiddleware, unfollowUser);
router.get('/users/:username/followers', getFollowers);
router.get('/users/:username/following', getFollowing);
router.post('/users/:username/upload', authMiddleware, upload.single('profilePicture'), uploadProfilePicture);

// Post routes
router.post('/posts', authMiddleware, createPost);
router.get('/posts/:postId', getPost);
router.put('/posts/:postId', authMiddleware, updatePost);
router.delete('/posts/:postId', authMiddleware, deletePost);
router.post('/posts/:postId/like', authMiddleware, likePost);
router.post('/posts/:postId/unlike', authMiddleware, unlikePost);
router.get('/posts/:postId/likes', getLikesForPost);

// Comment routes
router.post('/posts/:postId/comments', authMiddleware, addComment);
router.get('/posts/:postId/comments', getComments);
router.delete('/comments/:commentId', authMiddleware, deleteComment);

// Feed and search
router.get('/feed', authMiddleware, getFeed);
router.get('/search', searchUsers);

module.exports = router;