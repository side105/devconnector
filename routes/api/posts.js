const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');

const validatePostInput = require('../../validation/post');

// @route: GET api/posts/test
// @desc:  Test Posts route
// @access: Public
router.get('/test', (req, res) => {
    res.json({ msg: "Posts Works" });
});

// @route: GET api/posts/
// @desc:  Get Posts
// @access: Public
router.get('/', (req, res) => {
    Post.find()
        .sort({ date: -1 })
        .then(posts => res.json(posts))
        // .catch(err => res.status(404));
        .catch(err => res.status(404).json(err));
});

// @route: GET api/posts/:id
// @desc:  Get Post by id
// @access: Public
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch(err => res.status(404).json(err));
});

// @route: POST api/posts
// @desc:  Create post
// @access: Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save()
        .then(post => res.status(200).json(post))
        .catch(err => console.log(err));

});


// @route: DELETE api/posts/:id
// @desc:  Delete post
// @access: Private
router.delete('/:id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Profile.findOne({ user: req.user.id }).then(profile => {
        console.log(profile);

        Post.findById(req.params.id)
            .then(singlePost => {
                //check for post owner
                if (singlePost.user.toString() !== req.user.id) {
                    return res.status(401).json({ notauthorized: 'User not authorized' });
                }
                singlePost.remove().then(() => res.json({ success: true }))
                    .catch((err) => {
                        return res.status(404).json({ msg: 'cant remove post' });
                    });
            }).catch((err) => {
                return res.status(404).json({ postnotfound: 'Post not found' });
            })
    });
});

// @route: POST api/posts/like/:id
// @desc:  Like post
// @access: Private
router.post('/like/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    console.log('req.user.id: ', req.user.id);

    Profile.findOne({ user: req.user.id }).then(profile => {
        Post.findById(req.params.id)
            .then(singlePost => {
                //check if the user has already liked the post
                console.log('#1');

                if (singlePost.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                    console.log('*** already liked');
                    return res.status(400).json({ alreadyliked: 'User has already liked this post' });
                }
                console.log('#2');
                singlePost.likes.push({ user: req.user.id });
                console.log('#3');
                singlePost.save().then(() => {
                    return res.status(200).json({ msg: 'post liked', post: singlePost });
                })
                    .catch((err) => {
                        return res.status(401).json({ msg: 'cant like post', err: err });
                    });

            }).catch((err) => {
                return res.status(404).json({ postnotfound: 'Post not found' });
            })
    });
});

// @route: POST api/posts/unlike/:id
// @desc:  Unlike post
// @access: Private
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Profile.findOne({ user: req.user.id }).then(profile => {
        Post.findById(req.params.id)
            .then(singlePost => {
                if (singlePost.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
                    return res.status(400).json({ alreadyliked: 'User has not yet liked this post' });
                }
                //get the remove index
                const removeIndex = singlePost.likes
                    .map(item => item.user.toString())
                    .indexOf(req.user.id);

                singlePost.likes.splice(removeIndex , 1);
                singlePost.save().then(() => {
                    return res.status(200).json({ msg: 'post unliked', post: singlePost });
                })
                    .catch((err) => {
                        return res.status(401).json({ msg: 'cant unlike post', err: err });
                    });

            }).catch((err) => {
                return res.status(404).json({ postnotfound: 'Post not found' });
            })
    });
});


// @route: POST api/posts/comment/:id (id is the post_id)
// @desc:  add comment to post
// @access: Private
router.post('/comment/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    if (!isValid) {
        return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
        .then(singlePost => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            };
            //add comment to array
            singlePost.comments.unshift(newComment);
            singlePost.save().then(() => {
                return res.status(200).json({ msg: 'comment added', post: singlePost });
            })
                .catch((err) => {
                    return res.status(401).json({ msg: 'cant add comment to post', err: err });
                });

        }).catch((err) => {
            return res.status(404).json({ postnotfound: 'Post not found' });
        })
});


// @route: DELETE api/posts/comment/:id/:comment_id (id is the post_id, comment_id is the comment_id)
// @desc:  remove comment from post
// @access: Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {

    Post.findById(req.params.id)
        .then(singlePost => {
            //check if the comment exists
            if (singlePost.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({ commentnotexists: 'Comment does not exist' });
            }
            const removeIndex = singlePost.comments
            .map(item => item._id.toString()).indexOf(req.params.comment_id);
            singlePost.comments.splice(removeIndex, 1);

            singlePost.save().then(() => {
                return res.status(200).json({ msg: 'comment removed', post: singlePost });
            })
                .catch((err) => {
                    return res.status(401).json({ msg: 'cant remove comment to post', err: err });
                });

        }).catch((err) => {
            return res.status(404).json({ postnotfound: 'Post not found' });
        })
});

module.exports = router;