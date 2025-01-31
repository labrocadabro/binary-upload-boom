const cloudinary = require("../middleware/cloudinary");
const Post = require("../models/Post");
const Comment = require("../models/Comment");


module.exports = {
  getProfile: async (req, res) => {
    try {
      const allPosts = await Post.find({ user: req.user.id }).sort({ createdAt: "desc" });
			const posts = allPosts.filter(post => post.image);
			const drafts = allPosts.filter(post => !post.image);
      res.render("profile.ejs", { posts: posts, drafts: drafts, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },

  getPost: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id).populate('user');
      // get comment for this post
      const comments = await Comment.find({'postId': req.params.id }).populate('user');
      res.render("post.ejs", { post: post, user: req.user, comments: comments, title: post.title });
    } catch (err) {
      console.log(err);
			res.redirect("/feed");
    }
  },
  createPost: async (req, res) => {
    try {
      // Upload image to cloudinary
			const post = {
				title: req.body.title,
				caption: req.body.caption,
				likes: 0,
				user: req.user.id,
			}
			if(req.file) {
				const result = await cloudinary.uploader.upload(req.file.path);
				post['image'] = result.secure_url;
				post['cloudinaryId'] = result.public_id;
			}
			await Post.create(post);
			console.log("Post has been added!");
			req.flash('success', { msg: 'Your post has been created.' })
    } catch (err) {
      console.log(err);
			req.flash('error', { msg: 'Your post could not be created.' })
    } finally {
			res.redirect("/profile");
		}
  },
    getFeed: async (req, res) => {
    try {
      const posts = await Post.find({image: { $exists: true}}).sort({ createdAt: "desc" }).lean();
      res.render("feed.ejs", { posts: posts, user: req.user, page: 'feed'  });
    } catch (err) {
      console.log(err);
    }
  },

  editPost: async (req, res) => {
    try {
			const post = await Post.findById(req.params.id);
			post.title = req.body.title;
			post.caption = req.body.caption;
			if(req.file) {
				const result = await cloudinary.uploader.upload(req.file.path);
				post['image'] = result.secure_url;
				post['cloudinaryId'] = result.public_id;
			}
			await post.save();
      console.log("Post edited");
			req.flash('success', { msg: 'Your post has been edited.' });
    } catch (err) {
      console.log(err);
			req.flash('error', { msg: 'Your post could not be edited.' });
    } finally {
			res.redirect("/profile");
		}
  },
  deletePost: async (req, res) => {
    try {
      // Find post by id
      let post = await Post.findById({ _id: req.params.id });
			if (post.user != req.user.id) throw new Error("User mismatch");
      // Delete image from cloudinary
			if (post.cloudinaryId) await cloudinary.uploader.destroy(post.cloudinaryId);
      // Delete post from db
      await Post.remove({ _id: req.params.id });
      console.log("Deleted Post");
			req.flash('success', { msg: 'Your post has been deleted.' })
    } catch (err) {
			console.log(err)
			req.flash('error', { msg: 'Your post could not be deleted.' })
    } finally {
			res.redirect("/profile");
		}
  },
	  likePost: async (req, res) => {
    try {
			const post = await Post.findById(req.params.id);
			const owner = post.user;
			const liker = req.body.liker;
			if (liker === owner) {
				throw new Error("You can't like your own post!");
			} else if (post.likedUsers.includes(liker)) {
				const index = post.likedUsers.indexOf(liker);
				post.likedUsers.splice(index, 1);
				post.likes -= 1;
				console.log("Likes -1");
				await post.save();
			} else {
				post.likedUsers.push(liker);
				post.likes += 1;
				console.log("Likes +1");
				await post.save();
			}
    } catch (err) {
      console.log(err);
			req.flash('error', { msg: err.message });
    } finally {
			res.redirect(`/post/${req.params.id}`);
		}
  },
};
