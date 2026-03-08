const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const { globalErrorHandler } = require('./src/utils/errorUtils');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const projectRoutes = require("./src/routes/projectRoutes");

const app = express();

app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use("/api/projects", projectRoutes);

app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});