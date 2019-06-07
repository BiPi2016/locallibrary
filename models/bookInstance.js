const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const moment = require('moment');

const BookInstanceSchema = new Schema(
    {
        book: {
            type: Schema.Types.ObjectId,
            ref: 'Book',
            required: true
        },
        imprint: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'],
            default: 'Maintenance'
        },
        due_back: {
            type: Date,
            default: Date.now
        }
    }
);

BookInstanceSchema
.virtual('url')
.get(function() {
    return '/catalog/bookInstance/' + this._id;
});

BookInstanceSchema
.virtual('due_date_formatted')
.get(function() {
    return(moment(this.due_back).format('MMMM Do, YYYY'));
});

module.exports = mongoose.model('BookInstance', BookInstanceSchema);