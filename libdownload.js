// Buildin with nodejs
const cp = require('child_process');
const readline = require('readline');
// External modules
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
// Global constants
const fs = require('fs')

function createDownloadLink(id)
{
    return "https://www.youtube.com/watch?v=" + id;
}

function download(url, outputPath)
{
    fs.unlinkSync(outputPath); // remove the file if it exists already
    return new Promise((res, rej) => {

        // Get audio and video streams
        const audio = ytdl(url, { quality: 'highestaudio' });
        const video = ytdl(url, { quality: 'highestvideo' });

        // Start the ffmpeg child process
        const ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '1', '-hide_banner',
        // Set inputs
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Map audio & video from streams
        '-map', '0:a',
        '-map', '1:v',
        // Keep encoding
        '-c:v', 'copy',
        // Define output file
        outputPath,
        ], {
        windowsHide: true,
        stdio: [
            /* Standard: stdin, stdout, stderr */
            'inherit', 'inherit', 'inherit',
            /* Custom: pipe:3, pipe:4, pipe:5 */
            'pipe', 'pipe', 'pipe',
        ],
        });

        ffmpegProcess.on('close', (code) => {
            console.log('done: ' + code);
            res(code);
        });
        ffmpegProcess.on('error', (err) => {
            console.error('error in child process: ' + err);
            rej(false);
        });

        audio.pipe(ffmpegProcess.stdio[4]);
        video.pipe(ffmpegProcess.stdio[5]);
    })

}

async function downloadVideo(videoId, outputPath)
{
    const url = createDownloadLink(videoId);
    try{
        const result = await download(url, outputPath);
        console.log("successfully downloaded: " + outputPath)
        return result;
    }
    catch (error)
    {
        console.log("failed due to error: " + error);
        return false;
    }
}

module.exports = {downloadVideo}