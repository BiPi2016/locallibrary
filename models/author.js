const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const moment = require('moment');

const AuthorSchema = new Schema(
    {
        first_name: {
            type: String,
            required: true,
            max: 100,
            min: 2
        },
        last_name: {
            type: String,
            required: true,
            max: 100,
            min: 2
        },
        date_of_birth: {
            type: Date
        },
        date_of_death: {
            type: Date
        }
    }
);

// Virtual for author's full name

AuthorSchema
.virtual('name')
.get(function() {
    return(`${this.first_name} ${this.last_name}`);
});

AuthorSchema
.virtual('life_span')
.get( function() {
    const dob = this.date_of_birth ? moment(this.date_of_birth).format('MMMM Do, YYYY') : 'Not Available';
    const dod = this.date_of_death ? moment(this.date_of_death).format('MMMM Do, YYYY') : 'Alive / Not Available';
    return( dob + ' - ' + dod);
});

AuthorSchema
.virtual('url')
.get( function() {
    return '/catalog/author/' + this._id;
});

module.exports = mongoose.model('Author', AuthorSchema);
