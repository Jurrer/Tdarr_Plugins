/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = () => ({
  id: "Tdarr_Plugin_MC93_Migz5ConvertAudio",
  Stage: "Pre-processing",
  Name: "Migz Convert Audio Streams",
  Type: "Audio",
  Operation: "Transcode",
  Description:
    "This plugin can convert all audio tracks to opus and can create downmixed audio tracks. \n\n",
  Version: "2.6-custom",
  Tags: "pre-processing,ffmpeg,audio only,configurable",
  Inputs: [
    {
      name: "convert_all_to_opus",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip: `Specify if all audio tracks should be converted to opus for maximum compatability with devices.
                    \\nOptional.
             \\nExample:\\n
             true

             \\nExample:\\n
             false`,
    },
    {
      name: "downmix",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip: `Specify if downmixing should be used to create extra audio tracks.
                    \\nI.e if you have an 8ch but no 2ch or 6ch, create the missing audio tracks from the 8 ch.
                    \\nLikewise if you only have 6ch, create the missing 2ch from it. Optional.
             \\nExample:\\n
             true

             \\nExample:\\n
             false`,
    },
    {
      name: "preserve_channel_title",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip:
        "Specify whether downmixed tracks should preserve the original track title." +
        " \\nWhen false (default), downmixed tracks use only the new channel layout as the title (e.g. \"2.0\")." +
        " \\nWhen true, the plugin appends the new layout to the original title (e.g. \"E-AC-3 Atmos 5.1 - 2.0\").",
    },
  ],
});

// Build a downmix title that appends the new channel layout, but avoids
// appending a layout the source title already ends with (e.g. don't turn
// "Anglais E-AC3 2.0" into "Anglais E-AC3 2.0 - 2.0"). The boundary check
// uses [^0-9.] so any non-digit/non-dot character (whitespace, paren,
// bracket, dash, etc.) terminates the layout cleanly without matching
// substrings of larger numbers like "15.1" or "12.0".
const buildDownmixTitle = (originalTitle, layout) => {
  if (!originalTitle) return layout;
  const escaped = layout.replace(/\./g, '\\.');
  if (new RegExp(`(?:^|[^0-9.])${escaped}$`).test(originalTitle)) {
    return originalTitle;
  }
  return `${originalTitle} - ${layout}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require("../methods/lib")();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    container: `.${file.container}`,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: "",
  };

  //  Check if both inputs.convert_all_to_opus AND inputs.downmix have been left empty. If they have then exit plugin.
  if (inputs && inputs.convert_all_to_opus === "" && inputs.downmix === "") {
    response.infoLog +=
      "☒Plugin has not been configured, please configure required options. Skipping this plugin. \n";
    response.processFile = false;
    return response;
  }

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    // eslint-disable-next-line no-console
    console.log("File is not video");
    response.infoLog += "☒File is not video. \n";
    response.processFile = false;
    return response;
  }

  // Set up required variables.
  let ffmpegCommandInsert = "";
  let audioIdx = 0;
  let convert = false;
  // Indices of streams downmixed in the loop below, so the opus-conversion
  // pass can skip a track without recomputing (and potentially disagreeing
  // with) the downmix eligibility check.
  const downmixedIndices = [];

  // Go through each stream in the file.
  for (let i = 0; i < file.ffProbeData.streams.length; i++) {
    // Check if stream is audio.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() === "audio") {
      // Get original track metadata. Strip characters that would break the ffmpeg
      // command-line quoting (we wrap titles in double quotes below).
      const originalTitle = (file.ffProbeData.streams[i].tags?.title || '').replace(/["`$\\]/g, '');
      const language = (file.ffProbeData.streams[i].tags?.language || '').replace(/["`$\\]/g, '');
      // Catch error here incase user left inputs.downmix empty.
      try {
        // Check if inputs.downmix is set to true.
        if (inputs.downmix === true) {
          // Downmix any track with more than 2 channels to stereo.
          if (file.ffProbeData.streams[i].channels > 2) {
            const newTitle = inputs.preserve_channel_title
              ? buildDownmixTitle(originalTitle, "2.0") : "2.0";
            ffmpegCommandInsert += `-c:a:${audioIdx} libopus -ac 2 `;
            ffmpegCommandInsert += `-metadata:s:a:${audioIdx} "title=${newTitle}" `;
            if (language) {
              ffmpegCommandInsert += `-metadata:s:a:${audioIdx} "language=${language}" `;
            }
            response.infoLog +=
              `☒Audio track is ${file.ffProbeData.streams[i].channels} channel. Creating 2 channel "${newTitle}" from ${file.ffProbeData.streams[i].channels} channel. \n`;
            convert = true;
            downmixedIndices.push(i);
          }
        }
      } catch (err) {
        // Error
      }

      // Catch error here incase user left inputs.convert_all_to_opus empty.
      try {
        // Check if inputs.convert_all_to_opus is set to true.
        if (inputs.convert_all_to_opus === true) {
          // Check if codec_name for stream is NOT opus.
          // Skip if this track was already downmixed above, whether or not
          // it actually happened to be a downmix candidate on this pass -
          // downmixedIndices reflects what downmix_single_track actually did.
          const isDownmixTrack = downmixedIndices.includes(i);
          if (file.ffProbeData.streams[i].codec_name !== "opus" && !isDownmixTrack) {
            ffmpegCommandInsert += `-c:a:${audioIdx} libopus `;
            if (language) {
              ffmpegCommandInsert += `-metadata:s:a:${audioIdx} "language=${language}" `;
            }
            response.infoLog +=
              `☒Audio track is ${file.ffProbeData.streams[i].channels} channel but is not opus. Converting. \n`;
            convert = true;
          }
        }
      } catch (err) {
        // Error
      }
      audioIdx += 1;
    }
  }

  // Convert file if convert variable is set to true.
  if (convert === true) {
    response.processFile = true;
    response.preset =
      `, -map 0 -c copy ${ffmpegCommandInsert} ` +
      "-strict -2 -max_muxing_queue_size 9999 ";
  } else {
    response.infoLog += "☑File contains all required audio formats. \n";
    response.processFile = false;
  }
  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;