const { Schema, model } = require("mongoose");

const videoListSchema = new Schema(
  {
    videoId: { type: String, required: true, unique: true },
    channelId: String,
    channelTitle: String,
    title: String,
    logo_url: String,
    views: Number,
    subscribers: Number,
    pubDate: Date,
  },
  { versionKey: false, timestamps: true }
);

const VideoList = model("videoList", videoListSchema);

module.exports = { VideoList };
