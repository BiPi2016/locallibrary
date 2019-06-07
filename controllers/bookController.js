const mongoose  = require('mongoose');
const Book = require('../models/book');
const Author = require('../models/author');
const BookInstance = require('../models/bookInstance');
const Genre = require('../models/genre');
const menuOptions = require('../models/menuOptions');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');


const async = require('async');

exports.index = function(req, res, next) {
    console.log('Inside index')
    async.parallel( {
        book_count: function(callback) {
            Book.countDocuments({}, callback);
        },
        book_instance_count: function(callback) {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.countDocuments({status: 'Available'}, callback);
        },
        author_count: function(callback) {
            Author.countDocuments({}, callback);
        },
        genre_count: function(callback) {
            Genre.countDocuments({}, callback);
        }
    },
    function(err, results) {
        console.log('about to render');
        res.render('index', {
            title: 'Local Library Home',
            error: err,
            data: results,
            menuOptions: menuOptions
        });
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    console.log('about to list all books');
    Book.find({}, 'title author')
    .populate('author')
    .exec(function(err, list_books) {
        console.log('list of all books ' + list_books.length);
        console.log( list_books instanceof Array);
        list_books.forEach( (book, index) => {
            console.log(index + 1 + ". " + book.title);
        })
        if(err)
            return next(err);
        res.render('book_list', {
            menuOptions: menuOptions,  
            title: 'Book List',
            book_list: list_books
        });
    });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    console.log('Finding the book with id: ' + id);

    async.parallel([
        function (callback) {
            Book.findById(id)
            .populate('author')
            .populate('genre')
            .exec(callback);
        },
        function(callback) {
            BookInstance.find({'book': id})
            .exec(callback)
        }
    ],
    function(err, results) {
        if(err)
            return next(err);
        if(results[0] === null) {
            const err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        console.log('The book is ' + results[0].title);
        console.log('No of instances: ' + results[1].length);
        console.log(results[1]);
        res.render('book_detail', {
            title: `Title: ${results[0].title}`,
            menuOptions: menuOptions,
            book: results[0],
            book_instances: results[1]
        });
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel( {
            authors: function(callback) {
                    Author.find(callback)
                },
            genres: function(callback) {
                    Genre.find(callback)
                }
        },
        function(err, results) {
            if (err) { return next(err); }
            res.render('book_form', { title: 'Create Book', menuOptions: menuOptions, authors: results.authors, genres: results.genres });
        }
    );
};

// Handle book create on POST.
exports.book_create_post = [
    // Convert genre to array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    // Validate input
    body('title').isLength({min:1}).trim().withMessage('Title must be at least one character long'),
    body('author').isLength({min:2}).trim().withMessage('Author can not be empty'),
    body('summary').isLength({min:5}).trim().withMessage('Summary must be at least two characters long'),
    body('isbn').isLength({min:2}).trim().withMessage('ISBN must be at least two characters long'),

    // sanitize fields
    sanitizeBody('*').escape(),

    // Process the request
    (req, res, next) => {
        console.log('final stage');
        console.log('genre ' + req.body.genre);
        console.log(req.body.genre instanceof Array);
        const errors = validationResult(req);
        // Creat a new book instance
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        // If there are errors in the input
        if(!errors.isEmpty()) {
            // Fetch all authors
            let authors = () => {
                return new Promise( (resolve, reject) => {
                    Author.find({})
                    .exec( (err, result) => {
                        if(err)
                            return reject(next(err));
                        return resolve(result);
                    });
                });
            }
            // Fetch all genres
            let genres = () => {
                return new Promise( (resolve, reject) => {
                    Genre.find({})
                    .exec( (err, result) => {
                        if(err)
                            return reject(next(err));
                        return resolve(result);
                    });
                });
            }
            Promise.all([authors(), genres()])
            .then( resultArr => {
                // Mark all selected genres as checked
                console.log(book.genre);
                resultArr[1].forEach( genre => {
                    if(book.genre.indexOf(genre._id) > -1) {
                        Object.defineProperty(genre, 'checked', {
                            value: true,
                            enumerable: true,
                            configurable: true,
                            writable: true
                        });
                        console.log('Genre selected' + genre.name);
                    }
                    console.log(genre.name + ' is ' + genre.checked);
                });

                res.render( 'book_form', {
                    menuOptions: menuOptions,
                    title: 'Create book',
                    book: book,
                    authors: resultArr[0].reverse(),
                    genres: resultArr[1],
                    errors: errors.array()
                }); 
            }) 
            .catch( err => next(err));
        } else {
            book.save( err => {// Data without errors, will be saved
                if(err)
                    return next(err);
                res.redirect(book.url);
            });
        }
    }
];
// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    
    const id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        book: function(cb) {
            Book.findById(id)
            .exec(cb);
        },
        book_instances: function(cb) {
            BookInstance.find({'book': id})
            .populate('book')
            .exec(cb);
        }
    },
    function(err, results) {
        if(err)
            return next(err);
        if(results.book_instances.length > 0) {
            console.log('Book copies in library, can not delete');
            res.render('book_delete', {
                menuOptions: menuOptions,
                title: 'Can not delete: ' + results.book.title,
                book: results.book,
                bookinstances: results.book_instances
            });
        } else {
            res.render('book_delete', {
                menuOptions: menuOptions,
                title: 'Delete book: ' + results.book.title,
                book: results.book
            });
        }
    });
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    console.log(req.body.book_id);
    BookInstance.find({'book': req.body.book_id})
    .exec( (err, results) => {
        console.log('All copies');
        console.log(results);
    })
    async.series({
        book: function(cb) {
            Book.findById(req.body.book_id)
            .exec(cb);
        },
        book_instances: function(cb) {
            BookInstance.find({'book': req.body.book_id})
            .exec(cb);
        }
    },
    function(err, results) {
        if(err) {
            console.log('some error before final stage')
            return next(err);
        }
         
        if(results.book_instances.length > 0) {
            console.log('Copies of this book exist, can not delete');
            res.render('book_delete', {
                menuOptions: menuOptions,
                title: 'Can not delete ' + results.book.title,
                book: results.book,
                bookinstances: results.book_instances
            });
        } else {
            Book.findByIdAndDelete(req.body.book_id, (err, result) => {
                if(err)
                    return next(err);
                console.log('Deleted book ' + result);
                res.redirect('/catalog/books');
            });
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    
    const id = mongoose.Types.ObjectId(req.params.id);

    async.parallel({
        authors: function(cb) {
            Author.find({}).exec(cb);
        },
        genres: function(cb) {
            Genre.find({}).exec(cb);
        }
    },
    function(err, results) {
        if(err)
            return next(err);
        Book.findById(id)
        .populate('author')
        .populate('genre')
        .exec((err, selectedBook) => {
            if(err)
                return next(err);
            if(selectedBook === null) {
                const error = new Error('Book not found');
                error.status = 404;
                return next(error);
            }
            console.log('Book ' + selectedBook.genre);
            const selectedGenres = selectedBook.genre.map( genre => genre._id.toString());
            results.genres.forEach( g => {
                if(selectedGenres.indexOf(g._id.toString()) > -1) {
                    Object.defineProperty(g, 'checked', {
                        value: true,
                        enumerable: true,
                        configurable: true,
                        writable: true
                    });
                }
            });
            res.render('book_form', {
                menuOptions: menuOptions,
                title: 'Update ' + selectedBook.title,
                book: selectedBook,
                authors: results.authors,
                genres: results.genres
            });
        });
    });
};

// Handle book update on POST.
exports.book_update_post = [
    // converting genres to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)) {
            if(typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },
    // Validate the input
    body('title').trim().isLength({min: 1}).withMessage('Title should be at least one character long'),
    body('author').trim().isLength({min: 2}).withMessage('Authors name should be atleast two characters long'),
    body('summary').trim().isLength({min: 2}).withMessage('Summary must be at least two chracters long'),
    body('isbn').trim().isLength({min: 2}).withMessage('ISBN must be at least two chracters long'),

    // Sanitize the input
    sanitizeBody('title').escape(),
    sanitizeBody('author').escape(),
    sanitizeBody('summary').escape(),
    sanitizeBody('isbn').escape(),
    sanitizeBody('genre.*').escape(),

    //Process the request
    (req, res, next) => {    
        // New instance of the book object
        const errors = validationResult(req);

        const book = new Book( {
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre,
            _id: req.params.id
        });

        // Check for the errors in validationResult(req)
        if(!errors.isEmpty()) {
            async.parallel({
                authors: function(cb) {
                    Author.find({}).exec(cb);
                },
                genres: function(cb) {
                    Genre.find(cb);
                }
        },
        function(err, results) {
            if(err)
                return next(err);
            // Mark selected genres
            results.genres.forEach( g => {
                if(book.genre.indexOf(g._id) > -1) 
                    g.checked = true;
                res.render('book_form', {
                    menuOptions: menuOptions,
                    title: 'Update ' + book.title,
                    book: book,
                    authors: results.authors,
                    genres: results.genres,
                    errors: errors.array()
                });
                return;
            });
        })
        } else {
            Book.findByIdAndUpdate(req.params.id, book, {}, (err, result) => {
                if(err)
                    return next(err);
                res.redirect(result.url);
            });
        }
    }
];