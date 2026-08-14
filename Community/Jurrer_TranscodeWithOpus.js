/* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
const details = () => ({
  id: 'Jurrer_TranscodeWithOpus',
  Stage: 'Pre-processing',
  Name: 'Jurrer Transcode With Opus',
  Type: 'Video',
  Operation: 'Transcode',
  Description: `Combines Migz Transcode Using Nvidia GPU & FFMPEG and Migz Convert Audio Streams into a single pass.
                  Files not in H265 will be transcoded into H265 using Nvidia GPU with ffmpeg.
                  Settings are dependant on file bitrate.
                  Working by the logic that H265 can support the same ammount of data at half the bitrate of H264.
                  NVDEC & NVENC compatable GPU required.
                  This plugin will skip any files that are in the VP9 codec.
                  Audio tracks can also be converted to opus and downmixed to stereo in the same pass.`,
  Version: '1.0-custom',
  Tags: 'pre-processing,ffmpeg,video,audio,nvenc h265,opus,configurable',
  Inputs: [
    {
      name: 'container',
      type: 'string',
      defaultValue: 'mkv',
      inputUI: {
        type: 'text',
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
      name: 'bitrate_cutoff',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
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
      name: 'max_bitrate',
      type: 'string',
      defaultValue: '',
      inputUI: {
        type: 'text',
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
      name: 'enable_10bit',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
      },
      tooltip: `Specify if output file should be 10bit. Default is false.
                    \\nExample:\\n
                    true

                    \\nExample:\\n
                    false`,
    },
    {
      name: 'enable_full_gpu_10bit',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
      },
      tooltip: `Use full GPU 10-bit conversion with scale_cuda. May fail on files affected by CUDA filter graph issues.
                    Default is false.
                    \\nExample:\\n
                    true

                    \\nExample:\\n
                    false`,
    },
    {
      name: 'enable_bframes',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
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
      name: 'force_conform',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
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
    {
      name: 'convert_all_to_opus',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
      },
      tooltip: `Specify if all audio tracks should be converted to opus for maximum compatability with devices.
                    \\nOptional.
             \\nExample:\\n
             true

             \\nExample:\\n
             false`,
    },
    {
      name: 'downmix',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
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
      name: 'preserve_channel_title',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: ['false', 'true'],
      },
      tooltip:
        'Specify whether downmixed tracks should preserve the original track title.'
        + ' \\nWhen false (default), downmixed tracks use only the new channel layout as the title (e.g. "2.0").'
        + ' \\nWhen true, the plugin appends the new layout to the original title (e.g. "E-AC-3 Atmos 5.1 - 2.0").',
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
  const lib = require('../methods/lib')();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    preset: '',
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: true,
    infoLog: '',
  };

  let duration = '';

  // Check if inputs.container has been configured. If it hasn't then exit plugin.
  if (inputs.container === '') {
    response.infoLog
      += 'Plugin has not been configured, please configure required options. Skipping this plugin. \n';
    response.processFile = false;
    return response;
  }

  if (inputs.container === 'original') {
    // eslint-disable-next-line no-param-reassign
    inputs.container = `${file.container}`;
    response.container = `.${file.container}`;
  } else {
    response.container = `.${inputs.container}`;
  }

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== 'video') {
    response.processFile = false;
    response.infoLog += 'File is not a video. \n';
    return response;
  }

  // Check if duration info is filled, if so times it by 0.0166667 to get time in minutes.
  // If not filled then get duration of stream 0 and do the same.
  if (parseFloat(file.ffProbeData?.format?.duration) > 0) {
    duration = parseFloat(file.ffProbeData?.format?.duration) * 0.0166667;
  } else if (typeof file.meta.Duration !== 'undefined') {
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
    inputs.container.toLowerCase() === 'ts'
    || inputs.container.toLowerCase() === 'avi'
  ) {
    genpts = ' -fflags +genpts';
  }

  // If targetBitrate comes out as 0 then something has gone wrong and bitrates could not be calculated.
  // Cancel plugin completely.
  if (targetBitrate === 0) {
    response.processFile = false;
    response.infoLog
      += 'Target bitrate could not be calculated. Skipping this plugin. \n';
    return response;
  }

  let forceTranscode = false;

  // Check if inputs.max_bitrate has something entered - force transcode above this.
  if (inputs.max_bitrate !== '') {
    if (currentBitrate > inputs.max_bitrate) {
      forceTranscode = true;
      response.infoLog += `Bitrate ${currentBitrate}k is above max ${inputs.max_bitrate}k. Forcing transcode. \n`;
    }
  }

  // Check if inputs.bitrate_cutoff has something entered - allow remux but skip transcode below this.
  if (!forceTranscode && inputs.bitrate_cutoff !== '') {
    if (currentBitrate <= inputs.bitrate_cutoff) {
      response.infoLog
        += `Bitrate ${currentBitrate}k is at or below cutoff ${inputs.bitrate_cutoff}k. `
        + 'Allowing remux, skipping transcode. \n';
    }
  }

  if (!forceTranscode) {
    if (inputs.bitrate_cutoff !== '') {
      response.infoLog += `Bitrate ${currentBitrate}k is between cutoff and max. Checking codec. \n`;
    } else {
      response.infoLog += 'No cutoff set. Checking codec. \n';
    }
  }

  // --- Audio pass (from Migz Convert Audio Streams) ---
  // Computed up front so its result is available regardless of which video
  // branch (none/remux/transcode) below ends up firing.
  let audioIdx = 0;
  let audioArgs = '';
  let audioLog = '';
  let audioConvert = false;

  for (let i = 0; i < file.ffProbeData.streams.length; i++) {
    let audioCodecType = '';
    try {
      audioCodecType = file.ffProbeData.streams[i].codec_type.toLowerCase();
    } catch (err) {
      // err
    }
    if (audioCodecType === 'audio') {
      // Get original track metadata. Strip characters that would break the ffmpeg
      // command-line quoting (we wrap titles in double quotes below).
      const originalTitle = (file.ffProbeData.streams[i].tags?.title || '').replace(/["`$\\]/g, '');
      const language = (file.ffProbeData.streams[i].tags?.language || '').replace(/["`$\\]/g, '');
      let isDownmixTrack = false;
      // Catch error here incase user left inputs.downmix empty.
      try {
        // Check if inputs.downmix is set to true.
        if (inputs.downmix === true) {
          // Downmix any track with more than 2 channels to stereo.
          if (file.ffProbeData.streams[i].channels > 2) {
            const newTitle = inputs.preserve_channel_title
              ? buildDownmixTitle(originalTitle, '2.0') : '2.0';
            // -ac is a per-stream (OPT_SPEC) option: scope it to this audio
            // index so it doesn't also force other, non-downmixed audio
            // outputs (e.g. an opus-converted 8ch track) down to stereo.
            audioArgs += `-c:a:${audioIdx} libopus -ac:a:${audioIdx} 2 `;
            audioArgs += `-metadata:s:a:${audioIdx} "title=${newTitle}" `;
            if (language) {
              audioArgs += `-metadata:s:a:${audioIdx} "language=${language}" `;
            }
            audioLog
              += `☒Audio track is ${file.ffProbeData.streams[i].channels} channel. `
              + `Creating 2 channel "${newTitle}" from ${file.ffProbeData.streams[i].channels} channel. \n`;
            audioConvert = true;
            isDownmixTrack = true;
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
          // Skip if this track was already downmixed above.
          // NOTE: surround (>2ch) sources can hard-fail libopus encoding with
          // "Invalid channel layout ... for specified mapping family" - this
          // is a pre-existing limitation carried over unchanged from Migz
          // Convert Audio Streams, not something introduced by this merge.
          if (file.ffProbeData.streams[i].codec_name !== 'opus' && !isDownmixTrack) {
            audioArgs += `-c:a:${audioIdx} libopus `;
            if (language) {
              audioArgs += `-metadata:s:a:${audioIdx} "language=${language}" `;
            }
            audioLog
              += `☒Audio track is ${file.ffProbeData.streams[i].channels} channel but is not opus. Converting. \n`;
            audioConvert = true;
          }
        }
      } catch (err) {
        // Error
      }
      audioIdx += 1;
    }
  }

  // Check if force_conform option is checked.
  // If so then check streams and add any extra parameters required to make file conform with output format.
  if (inputs.force_conform === true) {
    if (inputs.container.toLowerCase() === 'mkv') {
      extraArguments += '-map -0:d ';
      for (let i = 0; i < file.ffProbeData.streams.length; i++) {
        try {
          if (
            file.ffProbeData.streams[i].codec_name.toLowerCase()
            === 'mov_text'
            || file.ffProbeData.streams[i].codec_name.toLowerCase()
            === 'eia_608'
            || file.ffProbeData.streams[i].codec_name.toLowerCase() === 'timed_id3'
          ) {
            extraArguments += `-map -0:${i} `;
          }
        } catch (err) {
          // Error
        }
      }
    }
    if (inputs.container.toLowerCase() === 'mp4') {
      for (let i = 0; i < file.ffProbeData.streams.length; i++) {
        try {
          if (
            file.ffProbeData.streams[i].codec_name.toLowerCase()
            === 'hdmv_pgs_subtitle'
            || file.ffProbeData.streams[i].codec_name.toLowerCase()
            === 'eia_608'
            || file.ffProbeData.streams[i].codec_name.toLowerCase() === 'subrip'
            || file.ffProbeData.streams[i].codec_name.toLowerCase() === 'timed_id3'
          ) {
            extraArguments += `-map -0:${i} `;
          }
        } catch (err) {
          // Error
        }
      }
    }
  }

  const {
    getNvdecHwaccelPreset,
    getNvenc10BitFormatArg,
  } = require('../methods/nvdecPreset');
  // scale_cuda-based full-GPU 10bit can fail on files/filter chains affected by
  // CUDA filter graph issues, so default to softwareFrames unless the user
  // opts into enable_full_gpu_10bit.
  const useSoftwareFramesFor10Bit = inputs.enable_10bit === true
    && inputs.enable_full_gpu_10bit === false;
  const nvdecOptions = useSoftwareFramesFor10Bit
    ? { softwareFrames: true }
    : undefined;

  // 'transcode' is the default outcome; the loop below can downgrade this to
  // 'none' (nothing to do / below cutoff, container already matches) or
  // 'remux' (container mismatch only, or below cutoff with mismatch).
  let videoAction = 'transcode';

  // Go through each stream in the file.
  for (let i = 0; i < file.ffProbeData.streams.length; i++) {
    // Check if stream is a video.
    let codec_type = '';
    try {
      codec_type = file.ffProbeData.streams[i].codec_type.toLowerCase();
    } catch (err) {
      // err
    }
    if (codec_type === 'video') {
      // Check if codec of stream is mjpeg/png, if so then remove this "video" stream.
      // mjpeg/png are usually embedded pictures that can cause havoc with plugins.
      if (
        file.ffProbeData.streams[i].codec_name === 'mjpeg'
        || file.ffProbeData.streams[i].codec_name === 'png'
      ) {
        extraArguments += `-map -v:${videoIdx} `;
      }
      // Check if codec of stream is hevc or vp9 AND check if file.container matches inputs.container.
      // Skip codec check if forceTranscode is true.
      if (forceTranscode === false) {
        const belowCutoff = inputs.bitrate_cutoff !== ''
          && currentBitrate <= inputs.bitrate_cutoff;

        // If codec is hevc/vp9 and container matches - nothing to do (or remux if needed)
        if (
          (file.ffProbeData.streams[i].codec_name === 'hevc'
            || file.ffProbeData.streams[i].codec_name === 'vp9')
          && file.container === inputs.container
        ) {
          videoAction = 'none';
          response.infoLog
            += `Codec is ${file.ffProbeData.streams[i].codec_name} and container is ${inputs.container}. `
            + 'Nothing to do. \n';
          break;
        }
        // If codec is hevc/vp9 but container mismatch - remux if below cutoff, transcode if above
        if (
          (file.ffProbeData.streams[i].codec_name === 'hevc'
            || file.ffProbeData.streams[i].codec_name === 'vp9')
          && file.container !== inputs.container
        ) {
          videoAction = 'remux';
          response.infoLog
            += `Codec is ${file.ffProbeData.streams[i].codec_name} but container mismatch `
            + `(current: ${file.container}, wanted: ${inputs.container}). Remuxing. \n`;
          break;
        }

        // Below cutoff - skip transcode but remux if container mismatch
        if (belowCutoff) {
          if (file.container !== inputs.container) {
            videoAction = 'remux';
            response.infoLog
              += `Container mismatch (current: ${file.container}, wanted: ${inputs.container}). `
              + 'Remuxing only. \n';
          } else {
            videoAction = 'none';
            response.infoLog
              += `Codec is ${file.ffProbeData.streams[i].codec_name} (not hevc/vp9) but bitrate ${currentBitrate}k `
              + `is below cutoff ${inputs.bitrate_cutoff}k. Skipping transcode. \n`;
          }
          break;
        }
      }

      // Increment videoIdx.
      videoIdx += 1;
    }
  }

  if (videoAction === 'none') {
    if (audioConvert) {
      response.processFile = true;
      response.preset = `, -map 0 -c copy ${audioArgs} `
        + '-strict -2 -max_muxing_queue_size 9999 ';
    } else {
      response.processFile = false;
    }
  } else if (videoAction === 'remux') {
    response.processFile = true;
    if (audioConvert) {
      response.preset = `, -map 0 -c copy ${extraArguments}${audioArgs}-strict -2 -max_muxing_queue_size 9999 `;
    } else {
      response.preset = `, -map 0 -c copy ${extraArguments}`;
    }
  } else {
    // Keep encoder/filter args out of remux commands; FFmpeg cannot combine them with `-c copy`.
    let transcodeOnlyArguments = '';
    // Check if 10bit variable is true.
    if (inputs.enable_10bit === true) {
      transcodeOnlyArguments += getNvenc10BitFormatArg(file, nvdecOptions);
    }

    // Check if b frame variable is true.
    if (inputs.enable_bframes === true) {
      // If set to true then add b frames argument
      transcodeOnlyArguments += '-bf 5 ';
    }

    // Set bitrateSettings variable using bitrate information calulcated earlier.
    bitrateSettings = `-b:v ${targetBitrate}k -minrate ${minimumBitrate}k `
      + `-maxrate ${maximumBitrate}k -bufsize ${currentBitrate}k`;
    // Print to infoLog information around file & bitrate settings.
    response.infoLog += `Container for output selected as ${inputs.container}. \n`;
    response.infoLog += `Current bitrate = ${currentBitrate} \n`;
    response.infoLog += 'Bitrate settings: \n';
    response.infoLog += `Target = ${targetBitrate} \n`;
    response.infoLog += `Minimum = ${minimumBitrate} \n`;
    response.infoLog += `Maximum = ${maximumBitrate} \n`;

    // Use modern CUDA hwaccel instead of legacy *_cuvid decoders
    // which cause frame-ordering issues (stuttering) with FFmpeg 7+.
    // Helper returns '' for AV1 to keep older GPUs on software decode.
    response.preset = getNvdecHwaccelPreset(file, nvdecOptions);

    const outputArguments = `${extraArguments}${transcodeOnlyArguments}`;
    if (audioConvert) {
      response.preset
        += `${genpts}, -map 0 -c:v hevc_nvenc -cq:v 19 ${bitrateSettings} `
        + `-spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy ${audioArgs}-c:s copy `
        + `-strict -2 -max_muxing_queue_size 9999 ${outputArguments}`;
    } else {
      response.preset
        += `${genpts}, -map 0 -c:v hevc_nvenc -cq:v 19 ${bitrateSettings} `
        + `-spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ${outputArguments}`;
    }
    response.processFile = true;
    if (forceTranscode === true) {
      response.infoLog
        += `Bitrate ${currentBitrate}k is above max ${inputs.max_bitrate}k. Forcing transcode to hevc. \n`;
    } else {
      response.infoLog
        += `Codec is not hevc/vp9 and bitrate ${currentBitrate}k is above cutoff. Transcoding to hevc. \n`;
    }
  }

  // Append audio-pass logging last, mirroring the order audio work would be
  // logged if this ran as a second plugin after the video pass.
  response.infoLog += audioConvert ? audioLog : '☑File contains all required audio formats. \n';

  return response;
};
module.exports.details = details;
module.exports.plugin = plugin;
