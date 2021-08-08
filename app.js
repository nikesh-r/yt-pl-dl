const axios = require("axios");
const fs = require("fs");
const libDownload = require("./libdownload");
require("dotenv").config();

const MY_KEY = process.env.MY_YT_API_KEY;

let globalPlaylistID = "PLTBwOxolC2B1BODxYx4ZNBc0pWYKRu7RF"; 
let globalOutputPath = "./";

const MAX_RESULT = 50; // Can be between 0 and 50 inclusive
let videoIDList = [];
let videoTitleList = [];

function setGlobalVariables()
{
    for (let j = 0; j < process.argv.length; j++) {
        console.log(j + ' -> ' + (process.argv[j]));
    }
    if (process.argv.length >= 2)
    {
        globalPlaylistID = process.argv[2];
        console.log("set global playlist id to", globalPlaylistID)
    }
    if (process.argv.length >= 3)
    {
        globalOutputPath = process.argv[3] + "/";
        console.log("set global output path to", globalOutputPath) 
    }
}

async function convertPlaylistIDToTitle(playlistID)
{
    playlistTitle = "";

    try {
        const res = await axios.get(
          `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistID}&key=${MY_KEY}`
        );
        const data = await res.data;
        if (data.items.length !== 0) {
          playlistTitle = data.items[0].snippet.title;
          return playlistTitle;
        } else {
          console.error("failed to resolve playlist id to title");
          return playlistID;
        }
      } catch (err) {
        console.error("failed to resolve playlist id to title");
        console.log(err);
        return playlistID;
      }
}

async function createFolder(playlistID) {
  // create folder
  playlistTitle = await convertPlaylistIDToTitle(playlistID);
  let folderPath = globalOutputPath + playlistTitle;
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  return folderPath;
}

function sanitizeOutputPath(outputPath)
{
  sanitizedPath = "";
  sanitizedPath = outputPath.replace(/\|/g, "-");
  return sanitizedPath;
}

function createOutputPath(folderPath, videoTitle) {
  outputPath = folderPath + "/" + videoTitle + ".mkv"; 
  return sanitizeOutputPath(outputPath);
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
    if (playlistObject.id === globalPlaylistID) {
      playlistExist = true;
    }
  }
  if (playlistExist === false) {
    playlistObject = initializePlaylist(playlistArray, globalPlaylistID);
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
    `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${globalPlaylistID}&maxResults=${MAX_RESULT}&pageToken=${NPT}&key=${MY_KEY}`
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
      `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${globalPlaylistID}&maxResults=${MAX_RESULT}&key=${MY_KEY}`
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
  playlistObject = playlistArray.find((element) => element.id === globalPlaylistID);
  if (!playlistObject) {
    console.log(
      "playlist does not exist - isVideoPresentInDb: " + !!playlistObject
    );
    return false;
  }
  // console.log(playlistArray[0][globalPlaylistID]);
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
  setGlobalVariables();
  await getDataFromApi();
  console.log(globalPlaylistID);
  const folderPath = await createFolder(globalPlaylistID);
  videoIDList.forEach((videoID) => {
    console.log("video id is", videoID);
    let isVideoPresent = isVideoPresentInDb("./config.json", videoID);
    if (isVideoPresent === false) {
      let index = videoIDList.findIndex((element) => element === videoID);
      videoTitle = videoTitleList[index];
    //   videoTitle = videoID + " temp";
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
      }).catch((error) => {
          console.error("error in downloading: ", error);
      });
    } else {
      console.log("isVideoPresent is true");
    }
  });
};

app();