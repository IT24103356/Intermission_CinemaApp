const Suggestion = require('../models/Suggestion');

// GET all suggestions
exports.getSuggestions = async (req, res) => {
  try {
    const suggestions = await Suggestion.find()
      .populate('user', 'name email')
      .sort({ votes: -1 }); // highest voted first
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all suggestions (admin review)
exports.getSuggestionsAdmin = async (req, res) => {
  try {
    const suggestions = await Suggestion.find()
      .populate('user', 'name email')
      .sort({ votes: -1, createdAt: -1 });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single suggestion
exports.getSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id)
      .populate('user', 'name email');
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET logged in user's suggestions
exports.getMySuggestions = async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET suggestions by status
exports.getSuggestionsByStatus = async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ status: req.params.status })
      .populate('user', 'name')
      .sort({ votes: -1 });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create suggestion
exports.createSuggestion = async (req, res) => {
  try {
    const { movieTitle, description } = req.body;

    // Check if same title already suggested
    const existing = await Suggestion.findOne({
      movieTitle: { $regex: new RegExp(`^${movieTitle}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({
        message: 'This movie has already been suggested. Vote for it instead!'
      });
    }

    const suggestion = await Suggestion.create({
      user: req.user.id,
      movieTitle,
      description,
      votes: 0
    });

    res.status(201).json(suggestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT vote on suggestion
exports.voteSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    // Prevent user from voting on their own suggestion
    if (suggestion.user.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot vote on your own suggestion' });
    }

    // Check if already voted
    if (suggestion.votedBy && suggestion.votedBy.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already voted for this suggestion' });
    }

    const updated = await Suggestion.findByIdAndUpdate(
      req.params.id,
      {
        $inc:  { votes: 1 },
        $push: { votedBy: req.user.id }
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT update suggestion (owner only)
exports.updateSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    // Only owner can edit
    if (suggestion.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Cannot edit if already approved
    if (suggestion.status === 'approved') {
      return res.status(400).json({ message: 'Cannot edit an approved suggestion' });
    }

    const updated = await Suggestion.findByIdAndUpdate(
      req.params.id,
      { movieTitle: req.body.movieTitle, description: req.body.description },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT approve or reject suggestion (admin only)
exports.updateSuggestionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const suggestion = await Suggestion.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    res.json(suggestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE suggestion
exports.deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    // Allow owner or admin to delete
    if (suggestion.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Suggestion deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};