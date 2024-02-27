const { google } = require("googleapis");
const { VideoList } = require("../models/videoList");
const sleep = require("../helpers/sleep");

const { API_KEY } = process.env;

const youtube = google.youtube({ version: "v3", auth: API_KEY });

const getList = async () => {
  try {
    const options = {
      q: "",
      regionCode: "US",
      part: "snippet",
      type: "video",
      videoDuration: "long",
      publishedAfter: "2024-01-01T00:00:00Z",
      // publishedBefore: "2024-02-15T09:59:59Z",
      maxResults: 50,
    };
    let itemCount = 0;
    let data;
    do {
      await sleep(1000);
      const response = await youtube.search.list(options);
      data = response.data;
      // console.log(data)
      itemCount += data.pageInfo.resultsPerPage;
      console.log(itemCount);
      for (elem of data.items) {
        //   console.log(elem.snippet);
        // }
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
      }
      console.log("page token", data.nextPageToken);

      if (data.nextPageToken) {
        options.pageToken = data.nextPageToken;
      }
    } while (data.nextPageToken);
    console.log("total:", itemCount);
  } catch (err) {
    console.log(err);
  }
  console.log("finish collect new video");
};

const getVideoStats = async () => {
  console.log("start video stats");
  try {
    let videoList = await VideoList.find().limit(50);
    let currentPage = 0;
    while (videoList.length) {
      const iDs = videoList.map((elem) => elem.videoId).join(",");
      const {
        data: { items },
      } = await youtube.videos.list({
        part: "snippet,statistics,contentDetails",
        id: iDs,
        maxResults: 50,
      });
      const updateVideoList = items.map(
        ({ id: videoId, statistics, snippet, contentDetails }) => ({
          videoId,
          channelId: snippet.channelId,
          views: statistics.viewCount,
          duration: contentDetails.duration,
        })
      );
      for ({ videoId, views, duration } of updateVideoList) {
        try {
          await VideoList.findOneAndUpdate({ videoId }, { views, duration });
        } catch (error) {
          console.log("video update", error);
        }
      }

      currentPage += 1;
      videoList = await VideoList.find()
        .limit(50)
        .skip(50 * currentPage);
    }
  } catch (err) {
    console.log(err);
  }
  console.log("finish video stats");
  //   process.exit(0);
};

const getChannelStats = async () => {
  try {
    console.log("start channel stats");
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

      for ({ channelId, subscribers } of updateChannelList) {
        await VideoList.updateMany({ channelId }, { subscribers });
      }
      channelList.splice(0, 50);
    }
  } catch (err) {
    console.log(err);
  }
  console.log("finish channel stats");
};

const dropSmallest = async () => {
  const controlDate = new Date(Date.now() - 1000 * 60 * 60 * 12); //(12 годин)
  await VideoList.deleteMany({
    $and: [{ pubDate: { $lte: controlDate } }, { views: { $lte: 1000 } }],
  });
};

module.exports = { getList, getVideoStats, getChannelStats, dropSmallest };
