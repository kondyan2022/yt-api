require("dotenv").config();
const { google } = require("googleapis");

const {API_KEY}= proc 

const youtube = google.youtube({ version: "v3", auth: API_KEY });
