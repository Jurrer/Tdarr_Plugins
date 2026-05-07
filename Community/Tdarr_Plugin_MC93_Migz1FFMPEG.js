/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = () => ({
  id: "Tdarr_Plugin_MC93_Migz1FFMPEG",
  Stage: "Pre-processing",
  Name: "Migz Transcode Using Nvidia GPU & FFMPEG",
  Type: "Video",
  Operation: "Transcode",
  Description: `Files not in H265 will be transcoded into H265 using Nvidia GPU with ffmpeg.
                  Settings are dependant on file bitrate
                  Working by the logic that H265 can support the same ammount of data at half the bitrate of H264.
                  NVDEC & NVENC compatable GPU required.
                  This plugin will skip any files that are in the VP9 codec.`,
  Version: "3.1",
  Tags: "pre-processing,ffmpeg,video only,nvenc h265,configurable",
  Inputs: [
    {
      name: "container",
      type: "string",
      defaultValue: "mkv",
      inputUI: {
        type: "text",
      },
      tooltip: `Specify output container of file. Use 'original' wihout quotes to keep original container.
                \\n Ensure that all stream types you may have are supported by your chosen container.
                \\n mkv is recommended.
                    \\nExample:\\n
                    mkv

                    \\nExample:\\n
                    mp4
                    
                    \\nExample:\\n
                    original`,
    },
    {
      name: "bitrate_cutoff",
      type: "string",
      defaultValue: "",
      inputUI: {
        type: "text",
      },
      tooltip: `Specify bitrate cutoff, files with a current bitrate lower then this will not be transcoded.
               \\n Rate is in kbps.
               \\n Leave empty to disable.
                    \\nExample:\\n
                    6000

                    \\nExample:\\n
                    4000`,
    },
    {
      name: "max_bitrate",
      type: "string",
      defaultValue: "",
      inputUI: {
        type: "text",
      },
      tooltip: `Specify max bitrate, files with a current bitrate higher then this will be force transcoded.
               \\n Rate is in kbps.
               \\n Leave empty to disable.
                    \\nExample:\\n
                    15000

                    \\nExample:\\n
                    20000`,
    },
    {
      name: "enable_10bit",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip: `Specify if output file should be 10bit. Default is false.
                    \\nExample:\\n
                    true

                    \\nExample:\\n
                    false`,
    },
    {
      name: "enable_bframes",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip: `Specify if b frames should be used.
                 \\n Using B frames should decrease file sizes but are only supported on newer GPUs.
                 \\n Default is false.
                    \\nExample:\\n
                    true

                    \\nExample:\\n
                    false`,
    },
    {
      name: "force_conform",
      type: "boolean",
      defaultValue: false,
      inputUI: {
        type: "dropdown",
        options: ["false", "true"],
      },
      tooltip: `Make the file conform to output containers requirements.
                \\n Drop hdmv_pgs_subtitle/eia_608/subrip/timed_id3 for MP4.
                \\n Drop data streams/mov_text/eia_608/timed_id3 for MKV.
                \\n Default is false.
                    \\nExample:\\n
                    true

                    \\nExample:\\n
                    false`,
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require("../methods/lib")();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    preset: "",
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: "",
  };

  let duration = "";

  // Check if inputs.container has been configured. If it hasn't then exit plugin.
  if (inputs.container === "") {
    response.infoLog +=
      "Plugin has not been configured, please configure required options. Skipping this plugin. \n";
    response.processFile = false;
    return response;
  }

  if (inputs.container === "original") {
    // eslint-disable-next-line no-param-reassign
    inputs.container = `${file.container}`;
    response.container = `.${file.container}`;
  } else {
    response.container = `.${inputs.container}`;
  }

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    response.processFile = false;
    response.infoLog += "File is not a video. \n";
    return response;
  }

  // Check if duration info is filled, if so times it by 0.0166667 to get time in minutes.
  // If not filled then get duration of stream 0 and do the same.
  if (parseFloat(file.ffProbeData?.format?.duration) > 0) {
    duration = parseFloat(file.ffProbeData?.format?.duration) * 0.0166667;
  } else if (typeof file.meta.Duration !== "undefined") {
    duration = file.meta.Duration * 0.0166667;
  } else {
    duration = file.ffProbeData.streams[0].duration * 0.0166667;
  }

  // Set up required variables.
  let videoIdx = 0;
  let extraArguments = '';
  let genpts = '';
  let bitrateSettings = '';
  // Work out currentBitrate using "Bitrate = file size / (number of minutes * .0075)"
  // Used from here https://blog.frame.io/2017/03/06/calculate-video-bitrates/
  // eslint-disable-next-line no-bitwise
  const currentBitrate = ~~(file.file_size / (duration * 0.0075));
  // Use the same calculation used for currentBitrate but divide it in half to get targetBitrate.
  // Logic of h265 can be half the bitrate as h264 without losing quality.
  // eslint-disable-next-line no-bitwise
  const targetBitrate = ~~(file.file_size / (duration * 0.0075) / 2);
  // Allow some leeway under and over the targetBitrate.
  // eslint-disable-next-line no-bitwise
  const minimumBitrate = ~~(targetBitrate * 0.7);
  // eslint-disable-next-line no-bitwise
  const maximumBitrate = ~~(targetBitrate * 1.3);

  // If Container .ts or .avi set genpts to fix unknown timestamp
  if (
    inputs.container.toLowerCase() === "ts" ||
    inputs.container.toLowerCase() === "avi"
  ) {
    genpts = " -fflags +genpts";
  }

  // If targetBitrate comes out as 0 then something has gone wrong and bitrates could not be calculated.
  // Cancel plugin completely.
  if (targetBitrate === 0) {
    response.processFile = false;
    response.infoLog +=
      "Target bitrate could not be calculated. Skipping this plugin. \n";
    return response;
  }

  let forceTranscode = false;

  // Check if inputs.max_bitrate has something entered - force transcode above this.
  if (inputs.max_bitrate !== "") {
    if (currentBitrate > inputs.max_bitrate) {
      forceTranscode = true;
      response.infoLog += `Bitrate ${currentBitrate}k is above max ${inputs.max_bitrate}k. Forcing transcode. \n`;
    }
  }

  // Check if inputs.bitrate_cutoff has something entered - allow remux but skip transcode below this.
  if (!forceTranscode && inputs.bitrate_cutoff !== "") {
    if (currentBitrate <= inputs.bitrate_cutoff) {
      response.infoLog += `Bitrate ${currentBitrate}k is at or below cutoff ${inputs.bitrate_cutoff}k. Allowing remux, skipping transcode. \n`;
    }
  }

  if (!forceTranscode) {
    if (inputs.bitrate_cutoff !== "") {
      response.infoLog += `Bitrate ${currentBitrate}k is between cutoff and max. Checking codec. \n`;
    } else {
      response.infoLog += `No cutoff set. Checking codec. \n`;
    }
  }

  // Check if force_conform option is checked.
  // If so then check streams and add any extra parameters required to make file conform with output format.
  if (inputs.force_conform === true) {
    if (inputs.container.toLowerCase() === "mkv") {
      extraArguments += "-map -0:d ";
      for (let i = 0; i < file.ffProbeData.streams.length; i++) {
        try {
          if (
            file.ffProbeData.streams[i].codec_name.toLowerCase() ===
            "mov_text" ||
            file.ffProbeData.streams[i].codec_name.toLowerCase() ===
            "eia_608" ||
            file.ffProbeData.streams[i].codec_name.toLowerCase() === "timed_id3"
          ) {
            extraArguments += `-map -0:${i} `;
          }
        } catch (err) {
          // Error
        }
      }
    }
    if (inputs.container.toLowerCase() === "mp4") {
      for (let i = 0; i < file.ffProbeData.streams.length; i++) {
        try {
          if (
            file.ffProbeData.streams[i].codec_name.toLowerCase() ===
            "hdmv_pgs_subtitle" ||
            file.ffProbeData.streams[i].codec_name.toLowerCase() ===
            "eia_608" ||
            file.ffProbeData.streams[i].codec_name.toLowerCase() === "subrip" ||
            file.ffProbeData.streams[i].codec_name.toLowerCase() === "timed_id3"
          ) {
            extraArguments += `-map -0:${i} `;
          }
        } catch (err) {
          // Error
        }
      }
    }
  }

  // Check if 10bit variable is true.
  // When force_conform is enabled, the filter chain may contain additional
  // filters that don't work with GPU frames. Use softwareFrames to force
  // CPU-based pixel format conversion instead of scale_cuda.
  const nvdecOptions = inputs.enable_10bit === true && inputs.force_conform === true
    ? { softwareFrames: true }
    : {};

  if (inputs.enable_10bit === true) {
    const { getNvenc10BitFormatArg } = require('../methods/nvdecPreset');
    extraArguments += getNvenc10BitFormatArg(file, nvdecOptions);
  }

  // Check if b frame variable is true.
  if (inputs.enable_bframes === true) {
    // If set to true then add b frames argument
    extraArguments += "-bf 5 ";
  }

  // Go through each stream in the file.
  for (let i = 0; i < file.ffProbeData.streams.length; i++) {
    // Check if stream is a video.
    let codec_type = "";
    try {
      codec_type = file.ffProbeData.streams[i].codec_type.toLowerCase();
    } catch (err) {
      // err
    }
    if (codec_type === "video") {
      // Check if codec of stream is mjpeg/png, if so then remove this "video" stream.
      // mjpeg/png are usually embedded pictures that can cause havoc with plugins.
      if (
        file.ffProbeData.streams[i].codec_name === "mjpeg" ||
        file.ffProbeData.streams[i].codec_name === "png"
      ) {
        extraArguments += `-map -v:${videoIdx} `;
      }
      // Check if codec of stream is hevc or vp9 AND check if file.container matches inputs.container.
      // Skip codec check if forceTranscode is true.
      if (forceTranscode === false) {
        const belowCutoff =
          inputs.bitrate_cutoff !== "" &&
          currentBitrate <= inputs.bitrate_cutoff;

        // If codec is hevc/vp9 and container matches - nothing to do (or remux if needed)
        if (
          (file.ffProbeData.streams[i].codec_name === "hevc" ||
            file.ffProbeData.streams[i].codec_name === "vp9") &&
          file.container === inputs.container
        ) {
          response.processFile = false;
          response.infoLog += `Codec is ${file.ffProbeData.streams[i].codec_name} and container is ${inputs.container}. Nothing to do. \n`;
          return response;
        }
        // If codec is hevc/vp9 but container mismatch - remux if below cutoff, transcode if above
        if (
          (file.ffProbeData.streams[i].codec_name === "hevc" ||
            file.ffProbeData.streams[i].codec_name === "vp9") &&
          file.container !== inputs.container
        ) {
          if (belowCutoff) {
            response.infoLog += `Codec is ${file.ffProbeData.streams[i].codec_name} but container mismatch (current: ${file.container}, wanted: ${inputs.container}). Remuxing only. \n`;
            response.preset = `, -map 0 -c copy ${extraArguments}`;
          } else {
            response.infoLog += `Codec is ${file.ffProbeData.streams[i].codec_name} but container mismatch (current: ${file.container}, wanted: ${inputs.container}). Remuxing. \n`;
            response.preset = `, -map 0 -c copy ${extraArguments}`;
          }
          response.processFile = true;
          return response;
        }

        // Below cutoff - skip transcode but remux if container mismatch
        if (belowCutoff) {
          if (file.container !== inputs.container) {
            response.infoLog += `Container mismatch (current: ${file.container}, wanted: ${inputs.container}). Remuxing only. \n`;
            response.preset = `, -map 0 -c copy ${extraArguments}`;
            response.processFile = true;
            return response;
          }
          response.processFile = false;
          response.infoLog += `Codec is ${file.ffProbeData.streams[i].codec_name} (not hevc/vp9) but bitrate ${currentBitrate}k is below cutoff ${inputs.bitrate_cutoff}k. Skipping transcode. \n`;
          return response;
        }
      }


      // Increment videoIdx.
      videoIdx += 1;
    }
  }

  // Set bitrateSettings variable using bitrate information calulcated earlier.
  bitrateSettings =
    `-b:v ${targetBitrate}k -minrate ${minimumBitrate}k ` +
    `-maxrate ${maximumBitrate}k -bufsize ${currentBitrate}k`;
  // Print to infoLog information around file & bitrate settings.
  response.infoLog += `Container for output selected as ${inputs.container}. \n`;
  response.infoLog += `Current bitrate = ${currentBitrate} \n`;
  response.infoLog += "Bitrate settings: \n";
  response.infoLog += `Target = ${targetBitrate} \n`;
  response.infoLog += `Minimum = ${minimumBitrate} \n`;
  response.infoLog += `Maximum = ${maximumBitrate} \n`;

  // Use modern CUDA hwaccel instead of legacy *_cuvid decoders
  // which cause frame-ordering issues (stuttering) with FFmpeg 7+.
  // Helper returns '' for AV1 to keep older GPUs on software decode.
  // When enable_10bit + force_conform are both enabled, use softwareFrames
  // to avoid GPU frame format conflicts with the pixel format conversion.
  const { getNvdecHwaccelPreset } = require('../methods/nvdecPreset');
  response.preset = getNvdecHwaccelPreset(file, nvdecOptions);

  response.preset +=
    `${genpts}, -map 0 -c:v hevc_nvenc -cq:v 19 ${bitrateSettings} ` +
    `-spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ${extraArguments}`;
  response.processFile = true;
  // if (forceTranscode === true) {
  //   response.infoLog += `Bitrate ${currentBitrate}k is above max ${inputs.max_bitrate}k. Forcing transcode to hevc. \n`;
  // } else {
  //   response.infoLog += `Codec is ${file.video_codec_name} (not hevc/vp9) and bitrate ${currentBitrate}k is above cutoff ${inputs.bitrate_cutoff}k. Transcoding to hevc. \n`;
  // }
  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;
