const { VideoList } = require("../models/videoList");

const stats = async (req, res) => {
  const { page = 0, limit = 50 } = req.query;

  const videoList = await VideoList.find()
    .limit(limit)
    .skip(limit * page)
    .sort({ duration: -1 });
  const { length: totalCount } = await VideoList.find();
  const totalPage = Math.ceil(totalCount / limit);

  res.json({
    page,
    limit,
    totalPage,
    totalCount,
    items: videoList,
  });
};
module.exports = { stats };
