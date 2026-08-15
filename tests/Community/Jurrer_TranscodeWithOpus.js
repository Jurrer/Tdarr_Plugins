/* eslint max-len: 0 */
const _ = require('lodash');
const run = require('../helpers/run');

const tests = [
  // --- Ported from Migz Transcode Using Nvidia GPU & FFMPEG (video-only, audio inputs at defaults) ---
  // Every case below leaves convert_all_to_opus/downmix at their (false) defaults, so the audio
  // pass never fires and the "☑File contains all required audio formats." fallback line is
  // appended after the video infoLog - the only addition versus running Migz1FFMPEG standalone.

  // Default inputs - no cutoff/max_bitrate set, h264 in mkv (default container). Transcodes.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Already hevc and container matches, no audio work needed - nothing to do at all.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // 10bit enabled, enable_full_gpu_10bit left false (default) - uses softwareFrames path.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        enable_10bit: 'true',
        force_conform: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 -pix_fmt p010le ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mp4. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // 10bit enabled with enable_full_gpu_10bit true - uses scale_cuda full GPU path.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        enable_10bit: 'true',
        enable_full_gpu_10bit: 'true',
        enable_bframes: 'true',
        force_conform: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 -vf scale_cuda=format=p010le -bf 5 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mp4. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // Below cutoff, container already matches - skip transcode entirely, no audio work.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        enable_10bit: 'true',
        force_conform: 'true',
        bitrate_cutoff: '10000',
      },
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 1517k is below cutoff 10000k. Skipping transcode. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // Above cutoff, container matches - transcode.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        enable_10bit: 'true',
        force_conform: 'true',
        bitrate_cutoff: '1000',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 -pix_fmt p010le ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Container for output selected as mp4. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // Remuxing-below-cutoff, container mismatch ("Remuxing only" path), no audio work.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        bitrate_cutoff: '5000',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is at or below cutoff 5000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Container mismatch (current: mp4, wanted: mkv). Remuxing only. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // force_conform on mkv strips data streams (-map -0:d), no audio work.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_2.json')),
      librarySettings: {},
      inputs: {
        container: 'original',
        enable_10bit: 'true',
        force_conform: 'true',
        bitrate_cutoff: '1000',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 -map -0:d -pix_fmt p010le ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // hevc but container mismatch - remux, no audio work.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        force_conform: 'false',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc but container mismatch (current: mkv, wanted: mp4). Remuxing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // hevc but container mismatch - remux, ignoring 10bit/bframes inputs (early exit skips them).
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        enable_10bit: 'true',
        enable_full_gpu_10bit: 'true',
        enable_bframes: 'true',
        force_conform: 'false',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc but container mismatch (current: mkv, wanted: mp4). Remuxing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // .ts container adds genpts.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'ts',
        enable_10bit: 'false',
        force_conform: 'false',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda -fflags +genpts, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as ts. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.ts',
    },
  },

  // .avi container adds genpts.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'avi',
        enable_10bit: 'false',
        force_conform: 'false',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda -fflags +genpts, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as avi. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.avi',
    },
  },

  // max_bitrate forces transcode of a non-hevc file even without a cutoff.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        max_bitrate: '1000',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is above max 1000k. Forcing transcode. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Bitrate 1517k is above max 1000k. Forcing transcode to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // max_bitrate forces transcode even when the file is already hevc in the target container -
  // overrides the "nothing to do" short-circuit.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {
        max_bitrate: '1000',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 1529k -minrate 1070k -maxrate 1987k -bufsize 3058k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 3058k is above max 1000k. Forcing transcode. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 3058 \n'
        + 'Bitrate settings: \n'
        + 'Target = 1529 \n'
        + 'Minimum = 1070 \n'
        + 'Maximum = 1987 \n'
        + 'Bitrate 3058k is above max 1000k. Forcing transcode to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // --- Ported from Migz Convert Audio Streams (container set so no video work is triggered) ---

  // Both convert_all_to_opus and downmix left at their (false) defaults - nothing to do at all.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        bitrate_cutoff: '10000',
      },
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 1517k is below cutoff 10000k. Skipping transcode. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mp4',
    },
  },

  // convert_all_to_opus has no channel restriction - a 6 channel AAC track still gets converted,
  // no video work needed (container matches, below cutoff).
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        bitrate_cutoff: '10000',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=und"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 1517k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 6 channel but is not opus. Converting. \n',
      container: '.mp4',
    },
  },

  // convert_all_to_opus converts every non-opus track (flac/ac3/eac3/aac), no video work needed.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_2.json')),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        bitrate_cutoff: '10000',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -metadata:s:a:3 "language=fre" -c:a:4 libopus -metadata:s:a:4 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 7866k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // Single >2ch track downmixes to stereo, no video work needed.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        bitrate_cutoff: '10000',
        downmix: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -ac:a:0 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 7866k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n',
      container: '.mkv',
    },
  },

  // preserve_channel_title: true - original title already ends with the new layout ("... 2.0") -
  // buildDownmixTitle must not duplicate the suffix. No video work needed.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        bitrate_cutoff: '10000',
        downmix: 'true',
        preserve_channel_title: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -ac:a:0 2 -metadata:s:a:0 "title=Anglais E-AC3 2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 7866k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "Anglais E-AC3 2.0" from 8 channel. \n',
      container: '.mkv',
    },
  },

  // preserve_channel_title: true - original title does not already end with the new layout - it
  // gets appended. No video work needed.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        file.ffProbeData.streams[1].tags.title = 'E-AC-3 Atmos 5.1';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        bitrate_cutoff: '10000',
        downmix: 'true',
        preserve_channel_title: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -ac:a:0 2 -metadata:s:a:0 "title=E-AC-3 Atmos 5.1 - 2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 7866k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "E-AC-3 Atmos 5.1 - 2.0" from 8 channel. \n',
      container: '.mkv',
    },
  },

  // --- Merge-specific cases: audio and video work combined into one pass ---

  // Transcode + convert_all_to_opus: audio args land between "-c:a copy" and "-c:s copy".
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:a:0 libopus -metadata:s:a:0 "language=und" -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☒Audio track is 6 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // Transcode + downmix: -ac is scoped to -ac:a:0 (not a bare -ac 2) so it doesn't also force the
  // remaining untouched (stream-copied) audio tracks to stereo.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        downmix: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:a:0 libopus -ac:a:0 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng" -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n',
      container: '.mkv',
    },
  },

  // Transcode + downmix + convert_all_to_opus together: two 8ch tracks both downmix (each gets
  // its own scoped -ac:a:N), the remaining 2ch tracks are opus-converted without a channel change.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        file.ffProbeData.streams[2].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'mkv',
        downmix: 'true',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:a:0 libopus -ac:a:0 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng" -c:a:1 libopus -ac:a:1 2 -metadata:s:a:1 "title=2.0" -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -metadata:s:a:3 "language=fre" -c:a:4 libopus -metadata:s:a:4 "language=eng" -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // hevc/container-mismatch remux path + audio conversion combined.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        force_conform: 'false',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc but container mismatch (current: mkv, wanted: mp4). Remuxing. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mp4',
    },
  },

  // hevc/container-match, audio-only: video says "nothing to do" but audio still needs
  // conversion, so processFile must be true and the audio-only preset is used.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // force_conform + audio on the transcode path: conform args (-map -0:d) and audio args coexist.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_2.json')),
      librarySettings: {},
      inputs: {
        container: 'original',
        force_conform: 'true',
        bitrate_cutoff: '1000',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:a:0 libopus -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -metadata:s:a:3 "language=fre" -c:a:4 libopus -metadata:s:a:4 "language=eng" -c:s copy -strict -2 -max_muxing_queue_size 9999 -map -0:d ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // force_conform + audio on the audio-only (video "none") path: approved deviation - conform
  // args are NOT applied here, matching what a two-plugin chain would do (Migz1 returns early
  // without emitting conform args when there's no video work to do).
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        container: 'mp4',
        bitrate_cutoff: '10000',
        force_conform: 'true',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=und"  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 1517k is at or below cutoff 10000k. Allowing remux, skipping transcode. \n'
        + 'Bitrate 1517k is between cutoff and max. Checking codec. \n'
        + 'Codec is h264 (not hevc/vp9) but bitrate 1517k is below cutoff 10000k. Skipping transcode. \n'
        + '☒Audio track is 6 channel but is not opus. Converting. \n',
      container: '.mp4',
    },
  },

  // Nothing to do at all: video already conforms and no audio inputs are enabled.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH265_1.json')),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // --- Merge-specific cases: remove_commentary (ported from Tdarr_Plugin_sdd3_Remove_Commentary_Tracks) ---

  // remove_commentary left at default (false): a commentary-tagged track is present but the
  // detector never runs, so output is byte-identical to the plain transcode case above.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[2].tags.title = 'Director Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // remove_commentary on, title-based detection, transcode path: -map -0:a:1 (INPUT index of the
  // 2nd audio track) is inserted right after -map 0, with no encoder args for the dropped track.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[2].tags.title = 'Director Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -0:a:1 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Removing commentary audio track 1 (stream index 2). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Renumbering guard: removal + convert_all_to_opus together. Input audio index 1 (stream 2) is
  // dropped, but the 3 surviving tracks that follow it get OUTPUT indices -c:a:1.."-c:a:3, not
  // 2..4 - proving -c:a:N/-metadata:s:a:N track the post-removal output layout, not the input one.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[2].tags.title = 'Director Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -0:a:1 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:a:0 libopus -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=fre" -c:a:3 libopus -metadata:s:a:3 "language=eng" -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Removing commentary audio track 1 (stream index 2). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      container: '.mkv',
    },
  },

  // Detection variant: disposition.comment === 1 (no "commentary" text in title/handler_name).
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[3].disposition.comment = 1;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -0:a:2 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Removing commentary audio track 2 (stream index 3). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Detection variant: "commentary" in tags.handler_name (no comment disposition or title match).
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[4].tags.handler_name = 'Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -0:a:3 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Removing commentary audio track 3 (stream index 4). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Audio-only path: hevc + matching container ("nothing to do" for video) but a commentary track
  // still needs removing, so processFile flips to true off the back of removal alone.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        const commentaryTrack = _.cloneDeep(file.ffProbeData.streams[1]);
        commentaryTrack.tags = { ...commentaryTrack.tags, title: 'Commentary' };
        file.ffProbeData.streams.splice(1, 0, commentaryTrack);
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -map -0:a:0 -c copy  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒Removing commentary audio track 0 (stream index 1). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // All-commentary guard: every audio track looks like commentary, so removal is skipped entirely
  // (no -map -0:a: args) rather than producing a file with no audio.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        for (let i = 1; i <= 5; i += 1) {
          file.ffProbeData.streams[i].tags.title = 'Commentary';
        }
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒All 5 audio track(s) look like commentary. Skipping removal to avoid a file with no audio. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // force_conform + removal on the transcode path: -map -0:d (conform) and -map -0:a:1 (removal)
  // coexist without interfering with each other.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[2].tags.title = 'Director Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        container: 'original',
        force_conform: 'true',
        bitrate_cutoff: '1000',
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -0:a:1 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -strict -2 -max_muxing_queue_size 9999 -map -0:d ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'Bitrate 7866k is between cutoff and max. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Removing commentary audio track 1 (stream index 2). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // --- Ported from Lmg1 Reorder Streams ---
  // In each case below, streams[0]/streams[1] are swapped so the video stream is no longer
  // first. The plugin should always reorder (no input toggle), listing the map specifiers by
  // type so video leads, regardless of what else it does to the file.

  // Video not first, otherwise nothing to do (already hevc, container matches) - reorder-only
  // remux triggers processFile on its own.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        const audio = file.ffProbeData.streams[1];
        // eslint-disable-next-line prefer-destructuring
        file.ffProbeData.streams[1] = file.ffProbeData.streams[0];
        file.ffProbeData.streams[0] = audio;
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0:v? -map 0:a? -map 0:s? -map 0:d? -map 0:t? -c copy  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒Video is not in the first stream. Reordering streams. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Video not first, also needs transcoding - reordered map list appears inside the full
  // hevc_nvenc preset.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_1.json'));
        const audio = file.ffProbeData.streams[1];
        // eslint-disable-next-line prefer-destructuring
        file.ffProbeData.streams[1] = file.ffProbeData.streams[0];
        file.ffProbeData.streams[0] = audio;
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0:v? -map 0:a? -map 0:s? -map 0:d? -map 0:t? -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☒Video is not in the first stream. Reordering streams. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Video not first, also removing a commentary track - proves the negative -map -0:a:N
  // exclusion coexists with the reordered positive maps.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        const audio = file.ffProbeData.streams[1];
        // eslint-disable-next-line prefer-destructuring
        file.ffProbeData.streams[1] = file.ffProbeData.streams[0];
        file.ffProbeData.streams[0] = audio;
        file.ffProbeData.streams[2].tags.title = 'Director Commentary';
        return file;
      })(),
      librarySettings: {},
      inputs: {
        remove_commentary: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0:v? -map 0:a? -map 0:s? -map 0:d? -map 0:t? -map -0:a:1 -c:v hevc_nvenc -cq:v 19 -b:v 3933k -minrate 2753k -maxrate 5112k -bufsize 7866k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 7866 \n'
        + 'Bitrate settings: \n'
        + 'Target = 3933 \n'
        + 'Minimum = 2753 \n'
        + 'Maximum = 5112 \n'
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n'
        + '☒Video is not in the first stream. Reordering streams. \n'
        + '☒Removing commentary audio track 1 (stream index 2). \n'
        + '☒Removed 1 commentary track(s). \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // --- Ported from Migz Remove Image Formats From File ---
  // No sample fixture ships with an image stream, so each case appends/inserts one onto a
  // clone of an existing sample.

  // Image stream appended after an already-hevc/mkv file - nothing else to do, so removal
  // alone triggers processFile. -map -v:1 targets the 2nd video (input) stream.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        const imageStream = _.cloneDeep(file.ffProbeData.streams[0]);
        imageStream.index = 2;
        imageStream.codec_name = 'mjpeg';
        file.ffProbeData.streams.push(imageStream);
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -map -v:1 -c copy  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒File has image format stream, removing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // gif is also covered (MC93 covers mjpeg/png/gif; the old inline check this plugin
  // inherited from Migz1FFMPEG only covered mjpeg/png).
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        const imageStream = _.cloneDeep(file.ffProbeData.streams[0]);
        imageStream.index = 2;
        imageStream.codec_name = 'gif';
        file.ffProbeData.streams.push(imageStream);
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -map -v:1 -c copy  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒File has image format stream, removing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Leading cover art (image stream before the real video stream) no longer hijacks codec
  // detection - the hevc stream still drives videoAction to 'none', not a transcode.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        const coverStream = _.cloneDeep(file.ffProbeData.streams[0]);
        coverStream.index = 0;
        coverStream.codec_name = 'mjpeg';
        file.ffProbeData.streams[0].index = 1;
        file.ffProbeData.streams.unshift(coverStream);
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: ', -map 0 -map -v:0 -c copy  -strict -2 -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Codec is hevc and container is mkv. Nothing to do. \n'
        + '☒File has image format stream, removing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Image removal alongside a full transcode - -map -v:1 appears inside the hevc_nvenc preset.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_1.json'));
        const imageStream = _.cloneDeep(file.ffProbeData.streams[0]);
        imageStream.index = file.ffProbeData.streams.length;
        imageStream.codec_name = 'png';
        file.ffProbeData.streams.push(imageStream);
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -map -v:1 -c:v hevc_nvenc -cq:v 19 -b:v 758k -minrate 530k -maxrate 985k -bufsize 1517k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 1517 \n'
        + 'Bitrate settings: \n'
        + 'Target = 758 \n'
        + 'Minimum = 530 \n'
        + 'Maximum = 985 \n'
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n'
        + '☒File has image format stream, removing. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },

  // Every video stream is an image format - removal is skipped to avoid a file with no
  // video, mirroring the all-commentary guard.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH265_1.json'));
        file.ffProbeData.streams[0].codec_name = 'mjpeg';
        return file;
      })(),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '-hwaccel cuda -hwaccel_output_format cuda, -map 0 -c:v hevc_nvenc -cq:v 19 -b:v 1529k -minrate 1070k -maxrate 1987k -bufsize 3058k -spatial_aq:v 1 -rc-lookahead:v 32 -c:a copy -c:s copy -max_muxing_queue_size 9999 ',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: 'No cutoff set. Checking codec. \n'
        + 'Container for output selected as mkv. \n'
        + 'Current bitrate = 3058 \n'
        + 'Bitrate settings: \n'
        + 'Target = 1529 \n'
        + 'Minimum = 1070 \n'
        + 'Maximum = 1987 \n'
        + 'Codec is not hevc/vp9 and bitrate 3058k is above cutoff. Transcoding to hevc. \n'
        + '☒All 1 video stream(s) are image formats. Skipping removal to avoid a file with no video. \n'
        + '☑File contains all required audio formats. \n',
      container: '.mkv',
    },
  },
];

void run(tests);
