const axios = require("axios");
const { create } = require("domain");
const fs = require("fs");
const libDownload = require("./libdownload");
require("dotenv").config();

const MY_KEY = process.env.MY_YT_API_KEY;

const PLAYLIST_ID = "PLTBwOxolC2B1BODxYx4ZNBc0pWYKRu7RF"; // "PLzMsvNpDYBM7EjR8dgqM_kYfj_MAUAxEA";
// const PLAYLIST_ID = "PLTBwOxolC2B3uRPWtXpNq8l71hsuRx8Zs"; // "PLzMsvNpDYBM7EjR8dgqM_kYfj_MAUAxEA";
const MAX_RESULT = 5; // Can be between 0 and 50 inclusive
let videoIDList = [];
let videoTitleList = [];
let PLAYLIST_NAME;

function createFolder(playlistID) {
  // create folder
  let folderPath = "./" + playlistID;
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  return folderPath;
}
function createOutputPath(folderPath, videoTitle) {
  // return filename
  return folderPath + "\\" + videoTitle + ".mkv";
}

const initializeDB = (dbFilePath) => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify([], null, 2));
  } catch (e) {
    console.log("Cannot write file ", e);
  }
};

const initializePlaylist = (playlistArray, playlistId) => {
  let obj = {};
  obj.id = playlistId;
  obj.videos = [];
  playlistArray.push(obj);
  return obj;
};

const storeVideoInDB = (dbFilePath, videoID) => {
  if (!fs.existsSync(dbFilePath)) {
    try {
      initializeDB(dbFilePath);
    } catch (e) {
      console.error("Cannot write file ", e);
    }
  }
  let dbContent = fs.readFileSync("config.json");
  let playlistArray = JSON.parse(dbContent);
  let playlistExist = false;
  let playlistObject = {};
  for (let i = 0; i < playlistArray.length; i++) {
    playlistObject = playlistArray[i];
    if (playlistObject.id === PLAYLIST_ID) {
      playlistExist = true;
    }
  }
  if (playlistExist === false) {
    playlistObject = initializePlaylist(playlistArray, PLAYLIST_ID);
  }
  let storedVideoList = playlistObject.videos;

  const isVideoAlreadyPresent = storedVideoList.includes(videoID);
  if (isVideoAlreadyPresent) {
    console.log("Video already present in config");
  } else {
    storedVideoList.push(videoID);
    fs.writeFileSync(dbFilePath, JSON.stringify(playlistArray, null, 2));
  }
};

const checkNextPage = async (npt) => {
  let NPT = npt;
  const res = await axios.get(
    `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=${MAX_RESULT}&pageToken=${NPT}&key=${MY_KEY}`
  );
  const data = await res.data;
  // console.log(data);
  await saveVideos(data);
};

const saveVideos = async (data) => {
  const numberOfVideos = data.items.length;
  for (let i = 0; i < numberOfVideos; i++) {
    videoIDList.push(data.items[i].snippet.resourceId.videoId);
    videoTitleList.push(data.items[i].snippet.title);
  }
  if (data.nextPageToken) {
    await checkNextPage(data.nextPageToken);
  }
};

const getDataFromApi = async () => {
  try {
    const res = await axios.get(
      `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=${MAX_RESULT}&key=${MY_KEY}`
    );
    const data = await res.data;
    // console.log(data);
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

const isVideoPresentInDb = (dbFilePath, videoID) => {
  if (!fs.existsSync(dbFilePath)) {
    return false;
  }

  let dbContent = fs.readFileSync("config.json");
  let playlistArray = JSON.parse(dbContent);
  let playlistExist = false;
  let playlistObject = {};
  playlistObject = playlistArray.find((element) => element.id === PLAYLIST_ID);
  if (playlistObject === null) {
    console.log(
      "playlist does not exist - isVideoPresentInDb: " + playlistObject
    );
    return false;
  }
  // console.log(playlistArray[0][PLAYLIST_ID]);
  let storedVideoList = playlistObject.videos;

  const isVideoAlreadyPresent = storedVideoList.includes(videoID);
  if (isVideoAlreadyPresent) {
    console.log("video already present", videoID);
    return true;
  } else {
    console.log("video not already present", videoID);
    return false;
  }
};

const app = async () => {
  await getDataFromApi();
  console.log(PLAYLIST_ID);
  const folderPath = createFolder(PLAYLIST_ID);
  videoIDList.forEach((videoID) => {
    console.log("video id is", videoID);
    let isVideoPresent = isVideoPresentInDb("./config.json", videoID);
    if (isVideoPresent === false) {
      let index = videoIDList.findIndex((element) => element === videoID);
      videoTitle = videoTitleList[index];
      const outputPath = createOutputPath(folderPath, videoTitle);
      libDownload.downloadVideo(videoID, outputPath).then((rc) => {
        console.log("download response: ", rc);
        if (rc === 0) {
          // save to db
          console.log("before storevideo: " + videoID);
          storeVideoInDB("./config.json", videoID);
        } else {
          console.log("storevideo didnt run");
        }
      });
    } else {
      console.log("isVideoPresent is true");
    }
  });
};

app();
