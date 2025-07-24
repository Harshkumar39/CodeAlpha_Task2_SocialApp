const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sharp = require('sharp');

// Helper function to handle errors
const handleError = (res, error, status = 400) => {
  console.error(error);
  res.status(status).json({ error: error.message });
};

// Register a new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new Error('Username or email already in use');
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate auth token
    const token = user.generateAuthToken();

    res.status(201).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      },
      token
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByCredentials(username, password);
    const token = user.generateAuthToken();

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      },
      token
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    // In a real app, you might want to invalidate the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select('-password -__v')
      .populate('followers', 'username firstName lastName profilePicture')
      .populate('following', 'username firstName lastName profilePicture')
      .populate({
        path: 'posts',
        options: { sort: { createdAt: -1 }, limit: 10 }
      });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if the requesting user is following this user
    let isFollowing = false;
    if (req.user) {
      const requestingUser = await User.findById(req.user._id);
      isFollowing = requestingUser.following.includes(user._id);
    }

    res.json({
      ...user.toObject(),
      isFollowing
    });
  } catch (error) {
    handleError(res, error, 404);
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;

    // Verify the user is updating their own profile
    if (req.user.username !== username) {
      throw new Error('Unauthorized to update this profile');
    }

    const user = await User.findOneAndUpdate(
      { username },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      throw new Error('User not found');
    }

    res.json(user);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete user profile
const deleteUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Verify the user is deleting their own profile
    if (req.user.username !== username) {
      throw new Error('Unauthorized to delete this profile');
    }

    const user = await User.findOneAndDelete({ username });

    if (!user) {
      throw new Error('User not found');
    }

    // Delete all posts and comments by this user
    await Post.deleteMany({ author: user._id });
    await Comment.deleteMany({ author: user._id });

    // Remove user from followers/following lists
    await User.updateMany(
      { $or: [{ followers: user._id }, { following: user._id }] },
      { $pull: { followers: user._id, following: user._id } }
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const { username } = req.params;

    // Can't follow yourself
    if (req.user.username === username) {
      throw new Error('You cannot follow yourself');
    }

    const userToFollow = await User.findOne({ username });
    if (!userToFollow) {
      throw new Error('User not found');
    }

    // Check if already following
    const isFollowing = req.user.following.includes(userToFollow._id);
    if (isFollowing) {
      throw new Error('Already following this user');
    }

    // Update both users
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { following: userToFollow._id }
    });

    await User.findByIdAndUpdate(userToFollow._id, {
      $addToSet: { followers: req.user._id }
    });

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    handleError(res, error);
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const { username } = req.params;

    const userToUnfollow = await User.findOne({ username });
    if (!userToUnfollow) {
      throw new Error('User not found');
    }

    // Check if actually following
    const isFollowing = req.user.following.includes(userToUnfollow._id);
    if (!isFollowing) {
      throw new Error('Not following this user');
    }

    // Update both users
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { following: userToUnfollow._id }
    });

    await User.findByIdAndUpdate(userToUnfollow._id, {
      $pull: { followers: req.user._id }
    });

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    handleError(res, error);
  }
};

// Create a post
const createPost = async (req, res) => {
  try {
    const { content, tags } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];

    const post = new Post({
      author: req.user._id,
      content,
      images,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await post.save();

    // Add post to user's posts array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: post._id }
    });

    // Populate author info
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username firstName lastName profilePicture');

    res.status(201).json(populatedPost);
  } catch (error) {
    handleError(res, error);
  }
};

// Get a post
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('author', 'username firstName lastName profilePicture')
      .populate('likes', 'username firstName lastName profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName profilePicture'
        },
        options: { sort: { createdAt: -1 } }
      });

    if (!post) {
      throw new Error('Post not found');
    }

    // Check if the requesting user has liked the post
    let isLiked = false;
    if (req.user) {
      isLiked = post.likes.some(like => like._id.equals(req.user._id));
    }

    res.json({
      ...post.toObject(),
      isLiked
    });
  } catch (error) {
    handleError(res, error, 404);
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, tags } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify the user is the author of the post
    if (!post.author.equals(req.user._id)) {
      throw new Error('Unauthorized to update this post');
    }

    post.content = content || post.content;
    post.tags = tags ? tags.split(',').map(tag => tag.trim()) : post.tags;
    post.isEdited = true;
    await post.save();

    res.json(post);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Verify the user is the author of the post
    if (!post.author.equals(req.user._id)) {
      throw new Error('Unauthorized to delete this post');
    }

    // Remove post from user's posts array
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { posts: post._id }
    });

    // Delete the post (comments will be deleted via pre-remove hook)
    await post.remove();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Like a post
const likePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if already liked
    const alreadyLiked = post.likes.some(like => like.equals(req.user._id));
    if (alreadyLiked) {
      throw new Error('Already liked this post');
    }

    // Update post and user
    post.likes.push(req.user._id);
    await post.save();

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { likedPosts: post._id }
    });

    res.json({ message: 'Post liked successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Unlike a post
const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if actually liked
    const likedIndex = post.likes.findIndex(like => like.equals(req.user._id));
    if (likedIndex === -1) {
      throw new Error('Not liked this post');
    }

    // Update post and user
    post.likes.splice(likedIndex, 1);
    await post.save();

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { likedPosts: post._id }
    });

    res.json({ message: 'Post unliked successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Add a comment
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const comment = new Comment({
      author: req.user._id,
      post: post._id,
      content,
      parentComment: parentCommentId || null
    });

    await comment.save();

    // Add comment to post's comments array
    post.comments.push(comment._id);
    await post.save();

    // If this is a reply, add to parent comment's replies array
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      });
    }

    // Populate author info
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username firstName lastName profilePicture');

    res.status(201).json(populatedComment);
  } catch (error) {
    handleError(res, error);
  }
};

// Get comments for a post
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId, parentComment: null })
      .populate('author', 'username firstName lastName profilePicture')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'username firstName lastName profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Verify the user is the author of the comment
    if (!comment.author.equals(req.user._id)) {
      throw new Error('Unauthorized to delete this comment');
    }

    // Remove comment from post's comments array
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    // If this is a reply, remove from parent comment's replies array
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id }
      });
    }

    // Delete the comment (replies will be deleted via pre-remove hook)
    await comment.remove();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    handleError(res, error);
  }
};

// Get feed (posts from followed users)
const getFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const following = user.following;

    // Add the user's own posts to the feed
    following.push(req.user._id);

    const posts = await Post.find({ author: { $in: following } })
      .populate('author', 'username firstName lastName profilePicture')
      .populate('likes', 'username firstName lastName profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName profilePicture'
        },
        options: { limit: 2 }
      })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(posts);
  } catch (error) {
    handleError(res, error);
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ]
    }).select('username firstName lastName profilePicture');

    res.json(users);
  } catch (error) {
    handleError(res, error);
  }
};

// Get followers
const getFollowers = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select('followers')
      .populate('followers', 'username firstName lastName profilePicture');

    if (!user) {
      throw new Error('User not found');
    }

    res.json(user.followers);
  } catch (error) {
    handleError(res, error, 404);
  }
};

// Get following
const getFollowing = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .select('following')
      .populate('following', 'username firstName lastName profilePicture');

    if (!user) {
      throw new Error('User not found');
    }

    res.json(user.following);
  } catch (error) {
    handleError(res, error, 404);
  }
};

// Get likes for a post
const getLikesForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .select('likes')
      .populate('likes', 'username firstName lastName profilePicture');

    if (!post) {
      throw new Error('Post not found');
    }

    res.json(post.likes);
  } catch (error) {
    handleError(res, error, 404);
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify the user is updating their own profile
    if (req.user.username !== username) {
      throw new Error('Unauthorized to update this profile');
    }

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // Process image with sharp
    const processedImage = await sharp(req.file.path)
      .resize(500, 500)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Save processed image
    const filename = `profile-${user._id}-${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '../public/uploads', filename);
    await sharp(processedImage).toFile(filepath);

    // Delete original file
    fs.unlinkSync(req.file.path);

    // Update user profile picture
    user.profilePicture = `/uploads/${filename}`;
    await user.save();

    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
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
};