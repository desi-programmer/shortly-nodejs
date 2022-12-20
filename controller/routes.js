const express = require('express');
const router = express.Router();
const user = require('../model/user');
const urls = require('../model/url');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
require('./passportLocal')(passport);
require('./googleAuth')(passport);
const userRoutes = require('./accountRoutes');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}


router.get('/login', (req, res) => {
    res.render("login", { csrfToken: req.csrfToken() });
});

router.get('/signup', (req, res) => {
    res.render("signup", { csrfToken: req.csrfToken() });
});

router.post('/signup', (req, res) => {
    // get all the values 
    const { email, password, confirmpassword } = req.body;
    // check if the are empty 
    if (!email || !password || !confirmpassword) {
        res.render("signup", { err: "All Fields Required !", csrfToken: req.csrfToken() });
    } else if (password != confirmpassword) {
        res.render("signup", { err: "Password Don't Match !", csrfToken: req.csrfToken() });
    } else {

        // validate email and username and password 
        // skipping validation
        // check if a user exists
        user.findOne({ email: email }, function (err, data) {
            if (err) throw err;
            if (data) {
                res.render("signup", { err: "User Exists, Try Logging In !", csrfToken: req.csrfToken() });
            } else {
                // generate a salt
                bcryptjs.genSalt(12, (err, salt) => {
                    if (err) throw err;
                    // hash the password
                    bcryptjs.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        // save user in db
                        user({
                            email: email,
                            password: hash,
                            googleId: null,
                            provider: 'email',
                        }).save((err, data) => {
                            if (err) throw err;
                            // login the user
                            // use req.login
                            // redirect , if you don't want to login
                            res.redirect('/login');
                        });
                    })
                });
            }
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        failureRedirect: '/login',
        successRedirect: '/dashboard',
        failureFlash: true,
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy(function (err) {
        res.redirect('/');
    });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email',] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/dashboard');
});

router.get('/dashboard', checkAuth, (req, res) => { 
    urls.find({ owned : req.user.email }, (err, data) => {
        if(err) throw err; 
        res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), urls : data });
        
    }); 
});


router.post('/create', checkAuth, (req, res) => {
    const { original, short } = req.body;

    if (!original || !short) {

        res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), err: "Empty Fields !" });
    } else {
        urls.findOne({ slug: short }, (err, data) => {
            if (err) throw err;
            if (data) {
                res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), err: "Try Different Short Url, This exists !" });

            } else {
                urls({
                    originalUrl: original,
                    slug: short,
                    owned: req.user.email,
                }).save((err) => {
                    res.redirect('/dashboard');
                });
            }
        })
    }

});

router.use(userRoutes);


router.get('/:slug?', async (req, res) => {

    if (req.params.slug != undefined) {
        var data = await urls.findOne({ slug: req.params.slug });
        if (data) {
            data.visits = data.visits + 1;

            var ref = req.query.ref;
            if (ref) {
                switch (ref) {
                    case 'fb':
                        data.visitsFB = data.visitsFB + 1;
                        break;
                    case 'ig':
                        data.visitsIG = data.visitsIG + 1;
                        break;
                    case 'yt':
                        data.visitsYT = data.visitsYT + 1;
                        break;
                }
            }

            await data.save();

            res.redirect(data.originalUrl);
        } else {
            if (req.isAuthenticated()) {
                res.render("index", { logged: true, err: true });
            } else {
                res.render("index", { logged: false, err: true });
            }

        }


    } else {
        if (req.isAuthenticated()) {
            res.render("index", { logged: true });
        } else {
            res.render("index", { logged: false });
        }
    }

});



module.exports = router;