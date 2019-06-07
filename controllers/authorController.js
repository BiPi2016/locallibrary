const mongoose = require('mongoose');
const Author = require('../models/author');
const menuOptions = require('../models/menuOptions');
const async = require('async');
const moment = require('moment');
const Book = require('../models/book');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all Authors.
exports.author_list = function(req, res, next) {
    Author.find({})
    .sort([['last_name', 'ascending']])
    .exec(function(err, list_authors) {
        if(err)
            return next(err);
        res.render('author_list', {
            title: 'All available authors',
            author_list: list_authors,
            menuOptions: menuOptions
        });
    });
};

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    async.parallel({
        author: function(callback) {
            Author.findById(id)
            .exec(callback);
        },
        authors_books: function(callback) {
            Book.find({'author': id}, 'title summary')
            .exec(callback);
        }
    },
    function(err, results) {
        if(err)
            return next(err);
        if(results.author === null) {
            const err = new Error('Author not found');
            err.status = 400;
            return next(err);
        }
        res.render('author_detail', {
            title: results.author.name,
            menuOptions: menuOptions,
            author: results.author,
            author_books: results.authors_books
        });
    });
};

// Display Author create form on GET.
exports.author_create_get = (req, res, next) => {
    res.render('author_form', {
        title: 'Create a new author profile',
        menuOptions: menuOptions
    });
};

// Handle Author create on POST.
exports.author_create_post = [
    // Firstname and last name are required
    body('first_name').isLength({min:2}).trim().withMessage('First name must be atleast two character long')
    .isAlphanumeric().withMessage('Firstname has non-alphanumeric characters'),
    body('last_name').isLength({min:2}).trim().withMessage('Last name must be atleast two chracters long')
    .isAlphanumeric().withMessage('Lastname has non-alphanumeric chraracters'),
    // DOB and DOD must be of type date
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date, accepted format dd/mm/yyyy').optional({ checkFalsy: true }).isISO8601(),
   
    // Sanitize every input field
    sanitizeBody('first_name').escape(),
    sanitizeBody('last_name').escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    function(req, res, next) {
    // Process the response
        // Any error in validation must reload the form with user-entered data and reason for rejection
        const errors = validationResult(req);

        if(!errors.isEmpty()) {
            return res.render('author_form', {
                title: 'Authors Profile',
                menuOptions: menuOptions,
                author: req.body,
                errors: errors.array()                
            });
        }

        // Check if the user already exists
        const author = new Author( {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death
        });

        console.log( author );

        author.save( function(err){
            if(err)
                return next(err);
            res.redirect(author.url);
        });
    }
    ];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    console.log('In author_delete_get');
    
    const id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        author: function(callback) {
            Author.findById(id).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }

        if (results.author==null) { // No results.
            res.redirect('/catalog/authors');
        }

        // Successful, so render.
        res.render('author_delete', { 
            menuOptions: menuOptions,
            title: 'Delete Author', 
            author: results.author, 
            author_books: results.authors_books 
        } );
    });

};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    console.log('Author to be deleted has id: ' + req.body.authorid);

    async.parallel({
        author: function(callback) {
            Author.findById(req.body.authorid).exec(callback);
        },
        authors_books: function(callback) {
            Book.find({'author': req.body.authorid}).exec(callback);
        }
    }, function(err, results) {
        if(err)
            return next(err);
        if(results.authors_books.length > 0) {
            console.log('There are books by this author in the library, Can not not delete.');
            return res.render('author_delete', {
                menuOptions: menuOptions,
                title: 'Delete author',
                author: results.author,
                author_books: results.authors_books
            });
        } else {
            console.log('No books by this author, proceed with deletion for: ' + req.body.authorid);
            Author.findOneAndDelete({_id: req.body.authorid}, (err, result) => {
                if(err) 
                    return next(err);
                console.log('The result of delete operation on author: ' + JSON.stringify(result));
                res.redirect('/catalog/authors');
            });
        }
     });
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    
    Author.findById(id)
    .exec( (err, result) => {
        if(err)
            return next(err);
        if(result === null) {
            const error = new Error('Could not found the author');
            error.status = 404;
            return next(error);
        }

        console.log('Author found: ')
        console.log(result);

        res.render('author_form', {
            menuOptions: menuOptions,
            title: 'Update ' + result.name,
            author: result
        });
    });
};

// Handle Author update on POST.
exports.author_update_post = [
    body('first_name').trim().isLength({min: 2}).withMessage('First name must be at least two characters long'),
    body('last_name').trim().isLength({min: 2}).optional().withMessage('Last name, if specified, must be at least two characters long'),
    body('date_of_birth').optional({checkFalsy: true}).isISO8601(),
    body('date_of_birth').optional({checkFalsy: true}).isISO8601(),


    sanitizeBody('first_name').escape(),
    sanitizeBody('last_name').escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),
    (req, res, next) => {
        const errors = validationResult(req);

        const author = new Author( {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id
        });

        if(!errors.isEmpty()) {
            return res.render('author_form', {
                menuOptions: menuOptions,
                title: 'Update author',
                author: author,
                errors: errors.array()
            });
        }

        Author.findByIdAndUpdate(req.params.id, author, {}, (err, theAuthor) => {
            if(err)
                return next(err);
            res.redirect(theAuthor.url);
        });
    }

];