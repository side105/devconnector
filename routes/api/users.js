const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');

//load user model
const User = require('../../models/User');


// @route: GET api/users/test
// @desc:  Test user route
// @access: Public
router.get('/test', (req, res) => {
    res.json({ msg: "User Works" });
});

// @route: GET api/users/register
// @desc:  Register User
// @access: Public
router.post('/register', (req, res) => {
    User.findOne({ email: req.body.email }).then(user => {
        if (user) {
            res.status(400).json({ email: 'email already exists' });
        } else {
            const avatar = gravatar.url(req.body.email, {
                s: '200', //size
                r: 'pg',  //rating
                d: 'mm',//Default
            });
            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                avatar,
                password: req.body.password,
            });
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) { throw err; }
                    newUser.password = hash;
                    newUser.save()
                        .then(user => res.status(200).json(user))
                        .catch(err => console.log(err))
                })
            })
        }
    })
});


// @route: GET api/users/login
// @desc:  Login User and send token back
// @access: Public
router.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email })
        .then(user => {
            if (!user) {
                return res.status(404).json({ email: 'user not found' });
            }
            //check password
            bcrypt.compare(password, user.password).then(isMatch => {
                if (isMatch) {
                    const payload = { id: user.id, name: user.name, avatar: user.avatar };
                    jwt.sign(payload, keys.secretOrKey, { expiresIn: 3600 }, (tokenErr, token) => {
                        if (tokenErr) {
                            console.log('***TOKEN ERROR***', tokenErr);

                        } else {
                            res.status(200).json({ success: true, token: 'Bearer ' + token });
                        }
                    })
                } else {
                    return res.status(400).json({ password: "Password incorrect" });
                }
            });
        })
        .catch(err => console.log('***impossibile collegarsi al database MongoDb*** ', err));
});

module.exports = router;