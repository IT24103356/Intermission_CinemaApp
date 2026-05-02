const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/movies',      require('./routes/movies'));
app.use('/api/showtimes',   require('./routes/showtimes'));
app.use('/api/bookings',    require('./routes/bookings'));
app.use('/api/feedback',    require('./routes/feedback'));
app.use('/api/suggestions', require('./routes/suggestions'));

app.get('/', (req, res) => res.send('Cinema API running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));