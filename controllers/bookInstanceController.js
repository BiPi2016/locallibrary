const mongoose = require('mongoose');
const BookInstance = require('../models/bookInstance');
const Book = require('../models/book.js');
const menuOptions = require('../models/menuOptions');
const async = require('async');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    BookInstance.find({})
    .populate('book')
    .exec(function(err, list_bookinstances) {
        if(err)
            return next(err);
        res.render('bookinstance_list', {
            title: 'Book Instance List',
            bookinstance_list: list_bookinstances,
            menuOptions: menuOptions
        });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    BookInstance.findById(id)
    .populate('book')
    .exec( (err, result) => { 
        if(err)
            return next(err);
        if (result==null) { // No results.
            const err = new Error('Book copy not found');
            err.status = 404;
            return next(err);
        }   
        res.render('bookinstance_detail', {
            title: result.book.title,
            menuOptions: menuOptions,
            bookinstance: result
        });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    Book.find({}, 'title')
    .exec(function(err, result) {
        if(err)
            return next(err);
        res.render('bookinstance_form', {
            title: 'Create a new book copy',
            menuOptions: menuOptions,
            book_list: result
        });
    });    
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    // Validate input
    body('book').isLength({min:2}).withMessage('Book must be specified'),
    body('imprint').isLength({min:2}).withMessage("Publisher's name must two or more charactes long").trim(),
    body('due_back').optional({checkFalsy:true}).isISO8601().withMessage('Date when available must be a valid date'),
    
    // Sanitize input
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process the requrest
    (req, res, next) => {
        console.log('Final Stage');
        const errors = validationResult(req);

        const bookinstance = new BookInstance( {
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        // If error in input redirect to Create copy page
        if(!errors.isEmpty()) {
            console.log('Error in user input')
            Book.find({}, 'title')
            .exec((err, result) => {
                if(err)
                    return next(err);
                res.render('bookinstance_form', {
                    title: 'Create new copy',
                    menuOptions: menuOptions,
                    book_list: result,
                    bookinstance: bookinstance,
                    errors: errors.array()
                }); 
                return;       
            });            
        } else {     
            console.log(req.body);
            console.log('id is ' + req.body.id);
            if(req.body.id) {
                console.log('Updating existing copy');
                bookinstance._id = req.body.id;
                BookInstance.findByIdAndUpdate(req.body.id, bookinstance, {}, (err, bookCopy) => {
                    if(err)
                        return next(err);
                    return res.redirect(bookCopy.url);
                })
            } else {
                console.log('Creating new copy')
                bookinstance.save( err => {
                    // Input validated and sanitized leads to save the record
                    if(err)
                        return next(err);
                    return res.redirect(bookinstance.url);
                });
            }
        }
    }

];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {    
    const id = mongoose.Types.ObjectId(req.params.id);
    console.log('Requested deletion for instance ' + req.params.id);
    BookInstance.findById(id)
    .exec( (err, result) => {
        if(err)
            return next(err);
        console.log('found this instance ' + result);
        res.render('bookinstance_delete', {
            menuOptions: menuOptions,
            title: 'Confirm deletion',
            bookinstance: result
        });
    });        
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res) {
    console.log(req.body);
    console.log('About to delete ' + req.body.bookinstance_id);
    BookInstance.findByIdAndDelete(req.body.bookinstance_id, (err, result) => {
        if(err)
            return next(err);
        console.log('Deleted: ' + result);
        res.redirect('/catalog/bookinstances');
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
       
    const id = mongoose.Types.ObjectId(req.params.id);
    console.log('Update copy: ' + id);

    async.parallel({
        bookCopy: function(cb) {
            BookInstance.findById(id).exec(cb);
        },
        books: function(cb) {
            Book.find({}).exec(cb);
        }
    },
    function(err, results) {
        if(err)
            return next(err);
        console.log('final function')
        if( results.bookCopy === null) {
            const error = new Error('Could not find  book copy');
            error.status = 404;
            return next(error);
        }
        res.render('bookinstance_form', {
            menuOptions: menuOptions,
            title: 'Update book copy',
            bookinstance: results.bookCopy,
            book_list: results.books
        });
    });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function(req, res, next) {
    // Implemented in booinstance_create_post
    res.send('IMPLEMENTED in bookinstance_create_post');
};