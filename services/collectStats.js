const { google } = require("googleapis");
const { VideoList } = require("../models/videoList");
const sleep = require("../helpers/sleep");

const { API_KEY } = process.env;

const youtube = google.youtube({ version: "v3", auth: API_KEY });

const getList = async () => {
  try {
    const options = {
      q: "",
      part: "snippet",
      type: "video",
      publishedAfter: "2024-02-13T08:00:00Z",
      publishedBefore: "2024-02-13T09:00:00Z",
      maxResults: 50,
    };
    let itemCount = 0;
    let data;
    do {
      await sleep(1000);
      //   console.log(options);
      const response = await youtube.search.list(options);
      data = response.data;
      itemCount += data.pageInfo.resultsPerPage;
      console.log(itemCount);
      data.items.forEach(async (elem) => {
        const item = await VideoList.findOne({ videoId: elem.id.videoId });
        if (!item) {
          try {
            await VideoList.create({
              videoId: elem.id.videoId,
              channelId: elem.snippet.channelId,
              channelTitle: elem.snippet.channelTitle,
              title: elem.snippet.title,
              logo_url: elem.snippet.thumbnails.default.url,
              views: 0,
              subscribers: 0,
              pubDate: elem.snippet.publishTime,
            });
          } catch (error) {
            console.log("Create item error", error);
            console.log(elem.id.videoId);
          }
        } else {
          console.log("already exist", elem.id.videoId);
        }
      });
      console.log("page token", data.nextPageToken);

      if (data.nextPageToken) {
        options.pageToken = data.nextPageToken;
      }
    } while (data.nextPageToken);
    console.log("total:", itemCount);
  } catch (err) {
    console.log(err);
  }
};

const getVideoStats = async () => {
  try {
    let videoList = await VideoList.find().limit(50);
    let currentPage = 0;
    while (videoList.length) {
      const iDs = videoList.map((elem) => elem.videoId).join(",");
      const {
        data: { items },
      } = await youtube.videos.list({
        part: "snippet,statistics",
        id: iDs,
        maxResults: 50,
      });
      const updateVideoList = items.map(
        ({ id: videoId, statistics, snippet }) => ({
          videoId,
          channelId: snippet.channelId,
          views: statistics.viewCount,
        })
      );
      updateVideoList.forEach(async ({ videoId, views }) => {
        await VideoList.findOneAndUpdate({ videoId }, { views });
      });

      currentPage += 1;
      videoList = await VideoList.find()
        .limit(50)
        .skip(50 * currentPage);
    }
  } catch (err) {
    console.log(err);
  }
  //   process.exit(0);
};

const getChannelStats = async () => {
  try {
    const channelList = await VideoList.distinct("channelId"); //Тимчасовий варіант
    while (channelList.length) {
      const iDs = channelList.slice(0, 50).join(",");
      const {
        data: { items },
      } = await youtube.channels.list({
        part: "statistics",
        id: iDs,
        maxResults: 50,
      });
      const updateChannelList = items.map(({ id: channelId, statistics }) => ({
        channelId,
        subscribers: statistics.subscriberCount,
      }));

      updateChannelList.forEach(async ({ channelId, subscribers }) => {
        await VideoList.updateMany({ channelId }, { subscribers });
      });
      channelList.splice(0, 50);
    }
  } catch (err) {
    console.log(err);
  }
};

const dropSmallest = async () => {
  const controlDate = new Date(Date.now() - 1000 * 60 * 60 * 12); //(12 годин)
  await VideoList.deleteMany({
    $and: [{ pubDate: { $lte: controlDate } }, { views: { $lte: 1000 } }],
  });
};

module.exports = { getList, getVideoStats, getChannelStats, dropSmallest };
