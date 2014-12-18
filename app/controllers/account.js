//
// Account Controller
//

'use strict';

module.exports = function() {

    var _ = require('underscore'),
        fs = require('fs'),
        passport = require('passport'),
        path = require('path');

    var app = this.app,
        middlewares = this.middlewares,
        models = this.models,
        User = models.user;

    //
    // Routes
    //
    app.get('/', middlewares.requireLogin, function(req, res) {
        res.render('chat.html', {
            account: req.user.toJSON()
        });
    });

    app.get('/login', function(req, res) {
        var imagePath = path.resolve('media/img/photos');
        var images = fs.readdirSync(imagePath);
        var image = _.chain(images).filter(function(file) {
            return /\.(gif|jpg|jpeg|png)$/i.test(file);
        }).sample().value();

        res.render('login.html', {
            photo: image
        });
    });

    app.post('/account/login', function(req, res) {
        req.io.route('account:login');
    });

    // TODO: you should be POST'ing to DELETE'ing this resource
    app.get('/account/logout', function(req, res) {
        req.io.route('account:logout');
    });

    app.post('/account/register', function(req, res) {
        req.io.route('account:register');
    });

    //
    // Sockets
    //
    app.io.route('account', {
        whoami: function(req) {
            req.io.respond(req.handshake.user);
        },
        register: function(req) {
            var fields = req.body || req.data;
            User.create({
                username: fields.username,
                email: fields.email,
                password: fields.password,
                firstName: fields.firstName || fields.firstname || fields['first-name'],
                lastName: fields.lastName || fields.lastname || fields['last-name'],
                displayName: fields.displayName || fields.displayname || fields['display-name']
            }, function(err, user) {
                // Did we get error?
                if (err) {
                    var message = 'Sorry, we could not process your request';
                    // User already exists
                    if (err.code === 11000) {
                        message = 'Email has already been taken';
                    }
                    // Invalid username
                    if (err.errors) {
                        message = _.map(err.errors, function(error) {
                            return error.message;
                        }).join(' ');
                    // If all else fails...
                    } else {
                        console.error(err);
                    }
                    // Notify
                    req.io.respond({
                        status: 'error',
                        message: message
                    }, 400);
                    return;
                }
                // AWWW YISSSSS!
                req.io.respond({
                    status: 'success',
                    message: 'You\'ve been registered, please try logging in now!'
                }, 201);
            });
        },
        login: function(req) {
            passport.authenticate('local', function(err, user, info) {
                if (err) {
                    req.io.respond({
                        status: 'error',
                        message: 'There were problems logging you in.',
                        errors: err
                    });
                    return;
                }
                if (!user) {
                    req.io.respond({
                        status: 'error',
                        message: 'Incorrect login credentials.'
                    });
                    return;
                }
                req.login(user, function(err) {
                    if (err) {
                        req.io.respond({
                            status: 'error',
                            message: 'There were problems logging you in.'
                        });
                        return;
                    }
                    req.io.respond({
                        status: 'success',
                        message: 'Logging you in...'
                    });
                });
            })(req);
        },
        logout: function(req) {
            req.session.destroy();
            req.io.respond({
                status: 'succcess',
                message: 'Session deleted'
            }, 200);
        }
    });
};
