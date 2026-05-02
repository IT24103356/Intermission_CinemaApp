const Movie = require('../models/Movie');

// GET all movies
exports.getMovies = async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single movie
exports.getMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create movie
exports.createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update movie
exports.updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE movie
exports.deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET trending movies
exports.getTrendingMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ isTrending: true });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET movies by status
exports.getMoviesByStatus = async (req, res) => {
  try {
    const movies = await Movie.find({ status: req.params.status });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};