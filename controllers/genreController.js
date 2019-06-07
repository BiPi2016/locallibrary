const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const menuOptions = require('../models/menuOptions');
const mongoose = require('mongoose');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');



// Display list of all Genre.
exports.genre_list = function(req, res) {
    Genre.find({})
    .sort([['name', 'Ascending']])
    .exec(function(err, list_genres) {
        if(err)
            return next(err);
        res.render('genre_list', {
            title: 'All Genres',
            genre_list: list_genres,
            menuOptions: menuOptions
        });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next  ) {
    
    const id = mongoose.Types.ObjectId(req.params.id);
    
    async.parallel([
        function(callback) {
            Genre.findById(id)
            .exec(callback);
        },
        function(callback) {
            Book.find({'genre':id})
            .exec(callback);
        }]
    ,
    function(err, results) {
        if(err)
            return next(err);
        if(results[0] === null ) {
            let err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        res.render('genre_detail', {
            title: 'Genre Details',
            menuOptions: menuOptions,
            genre : results[0],
            genre_books:results[1]
        });
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', {
        title: 'Create Genre',
        menuOptions: menuOptions/* ,
        genre: req.body.genre || '',  // not required if in the ejs file we use locals.genre to check if genre is defined
        errors: req.body.errors || '' // not requrired if locals.genre is used in ejs to check if 'errors' exists  */
    });
};

// Handle Genre create on POST.
exports.genre_create_post = [
    // Validate the input
    body('name', 'Genre name must be 3 or more letters long').isLength({ min: 3 }).trim(),
    
    // Sanitize the input
    sanitizeBody('name').escape(),
    
    // Process the request
    (req, res, next) => {
        const errors = validationResult(req);
        const genre = new Genre( { name: req.body.name} );
        console.log('genre defined'  + genre);
        
        // Errors in input
        if(!errors.isEmpty()) {
            console.log('Some error in input');
            return res.render('genre_form', {
                title: 'Create a new genre',
                menuOptions: menuOptions,
                genre: genre,
                errors: errors.array()
            });
        }

        // An appropriate name passed, so a genre is created
        if(req.body.id) {
            console.log('Updating an existing genre');
            genre._id = req.body.id;
            Genre.findByIdAndUpdate(req.body.id, genre, {}, (err, theGenre) => {
                if(err)
                    next(err);
                return res.redirect(theGenre.url);
            })
        } else {
            console.log('Creating a new genre');
            genre.save( err => {
                if(err)
                    return next(err);
                res.redirect(genre.url);
            });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    
    const id = mongoose.Types.ObjectId(req.params.id);
    console.log('Request to delete genre: ' + req.params.id);

    async.parallel({
        genre: function(cb) {
            Genre.findById(id).exec(cb);
        },
        genre_books: function(cb) {
            Book.find({})
            .exec(cb)
        }
    }, function(err, results) {
        if(err)
            return next(err);
        console.log('Result of running parallel functions');
        console.log('Asked genre: ' + results.genre);
        console.log('Our books')
        let mustKeepBooks = results.genre_books.filter( book => book.genre.indexOf(id) > -1 );
        console.log(mustKeepBooks);
        
        // Books with genre exist
        if(mustKeepBooks.length > 0) {
            console.log('Books with this genre exist, can not delete genre');
            res.render('genre_delete', {
                menuOptions: menuOptions,
                title: 'Can not delete genre',
                genre: results.genre,
                books: mustKeepBooks
            });
        } else {
            res.render('genre_delete', {
                menuOptions: menuOptions,
                title: 'Delete genre: ' + results.genre.name,
                genre: results.genre
            });
        }
        
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {
    console.log('About to delete the genre: ' + req.body.genre_id);
    Genre.findByIdAndDelete(req.body.genre_id, (err, result) => {
        if(err)
            return next(err);
        console.log('following record deleted' + result);
        res.redirect('/catalog/genres');
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) { 
    const id = mongoose.Types.ObjectId(req.params.id);
    Genre.findById(id)
    .exec( (err, g) => {
        if(err)
            return next(err);
        if(g === null) {
            const error = new Error('Genre not found');
            error.status = 404;
            return next(error);
        }

        res.render('genre_form', {
            menuOptions: menuOptions,
            title: 'Edit genre',
            genre: g
        });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = function(req, res, next) {
    res.send('NOT IMPLEMENTED: Genre update POST');
};