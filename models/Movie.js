const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  genre:        { type: String, required: true },
  duration:     { type: Number, required: true },
  releaseDate:  { type: Date },
  description:  { type: String },
  posterUrl:    { type: String },
  status:       { type: String, enum: ['Now Showing', 'Coming Soon'], default: 'Coming Soon' },
  isTrending:   { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Movie', MovieSchema);