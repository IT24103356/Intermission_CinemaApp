const Showtime = require('../models/Showtime');
const {
  withComputedAvailableOne,
  withComputedAvailableMany,
} = require('../utils/showtimeAvailability');

// GET all showtimes
exports.getShowtimes = async (req, res) => {
  try {
    const showtimes = await Showtime.find().populate('movie', 'title genre duration posterUrl status');
    const out = await withComputedAvailableMany(showtimes);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single showtime
exports.getShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.findById(req.params.id).populate('movie', 'title genre duration posterUrl status');
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });
    const out = await withComputedAvailableOne(showtime);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET showtimes by movie
exports.getShowtimesByMovie = async (req, res) => {
  try {
    const showtimes = await Showtime.find({ movie: req.params.movieId }).populate('movie', 'title genre duration posterUrl');
    const out = await withComputedAvailableMany(showtimes);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET showtimes by date
exports.getShowtimesByDate = async (req, res) => {
  try {
    const start = new Date(req.params.date);
    const end   = new Date(req.params.date);
    end.setDate(end.getDate() + 1);

    const showtimes = await Showtime.find({
      date: { $gte: start, $lt: end }
    }).populate('movie', 'title genre duration posterUrl');
    const out = await withComputedAvailableMany(showtimes);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create showtime
exports.createShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.create(req.body);
    const out = await withComputedAvailableOne(showtime);
    res.status(201).json(out);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update showtime
exports.updateShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });
    const out = await withComputedAvailableOne(showtime);
    res.json(out);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE showtime
exports.deleteShowtime = async (req, res) => {
  try {
    const showtime = await Showtime.findByIdAndDelete(req.params.id);
    if (!showtime) return res.status(404).json({ message: 'Showtime not found' });
    res.json({ message: 'Showtime deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};