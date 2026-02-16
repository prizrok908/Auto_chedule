const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/users', require('./routes/teacher-subjects')); // Предметы учителей
app.use('/api/classes', require('./routes/classes'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/lesson-plans', require('./routes/lessonPlans'));
app.use('/api/files', require('./routes/files'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/vacations', require('./routes/vacations'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
