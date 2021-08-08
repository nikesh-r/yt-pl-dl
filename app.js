const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const MY_KEY = process.env.MY_YT_API_KEY;
const PLAYLIST_ID = "PLTBwOxolC2B3uRPWtXpNq8l71hsuRx8Zs"; // "PLzMsvNpDYBM7EjR8dgqM_kYfj_MAUAxEA";
const MAX_RESULT = 5; // Can be between 0 and 50 inclusive
let videosIdList = [];


function createFolder(playilstID)
{
    // create folder
    folderPath = "./" + playilstID;
    fs.mkdirSync(folderPath);
    return folderPath
}
function createOutputPath(folderPath, videoID)
{
    // return filename
    return folderPath + "\\" + videoID + ".mkv";
}

const checkNextPage = async (npt) => {
  let NPT = npt;
  console.log(NPT);
  const res = await axios.get(
    `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${PLAYLIST_ID}&maxResults=${MAX_RESULT}&pageToken=${NPT}&key=${MY_KEY}`
  );
  const data = await res.data;
  // console.log(data);
  await saveVideos(data);
};

const saveVideos = async (data) => {
  const numberOfVideos = data.items.length;
  for (let i = 0; i < numberOfVideos; i++) {
    videosIdList.push(data.items[i].contentDetails.videoId);
  }
  if (data.nextPageToken) {
    await checkNextPage(data.nextPageToken);
  }
};

const getDataFromApi = async () => {
  try {
    const res = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${PLAYLIST_ID}&maxResults=${MAX_RESULT}&key=${MY_KEY}`
    );
    const data = await res.data;

    if (data.items.length !== 0) {
      await saveVideos(data);
    } else {
      console.log("No videos in playlist! or All videos saved!");
      return;
    }
  } catch (err) {
    console.log(err);
  }
};

const app = async () => {
  await getDataFromApi();
  console.log(videosIdList);
};

app();
