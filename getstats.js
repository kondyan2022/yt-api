require("dotenv").config();
const mongoose = require("mongoose");
const {
  getList,
  getVideoStats,
  getChannelStats,
  dropSmallest,
} = require("./services/collectStats");

const { API_KEY, DB_HOST } = process.env;

mongoose.set("strictQuery", true);

mongoose
  .connect(DB_HOST)
  .then(() => {
    console.log("Database connection successful");
    // getList();
    getVideoStats();
    // getChannelStats();
    // dropSmallest();
  })
  .catch((error) => {
    console.log(error.message);
    process.exit(1);
  });
