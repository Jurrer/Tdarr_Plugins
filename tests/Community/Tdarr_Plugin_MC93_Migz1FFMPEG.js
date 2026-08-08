/* eslint max-len: 0 */
const _ = require('lodash');
const run = require('../helpers/run');

const tests = [
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
      container: '.mkv',
    },
  },

  // Already hevc and container matches - nothing to do.
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
        + 'Codec is hevc and container is mkv. Nothing to do. \n',
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
      container: '.mp4',
    },
  },

  // Below cutoff, container already matches - skip transcode entirely.
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
        + 'Codec is h264 (not hevc/vp9) but bitrate 1517k is below cutoff 10000k. Skipping transcode. \n',
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
      container: '.mp4',
    },
  },

  // Remuxing-below-cutoff, container mismatch ("Remuxing only" path) - fork-specific behavior.
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
        + 'Container mismatch (current: mp4, wanted: mkv). Remuxing only. \n',
      container: '.mkv',
    },
  },

  // force_conform on mkv strips data streams (-map -0:d).
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
        + 'Codec is not hevc/vp9 and bitrate 7866k is above cutoff. Transcoding to hevc. \n',
      container: '.mkv',
    },
  },

  // hevc but container mismatch - remux.
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
        + 'Codec is hevc but container mismatch (current: mkv, wanted: mp4). Remuxing. \n',
      container: '.mp4',
    },
  },

  // hevc but container mismatch - remux, ignoring 10bit/bframes inputs (early return skips them).
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
        + 'Codec is hevc but container mismatch (current: mkv, wanted: mp4). Remuxing. \n',
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
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
        + 'Codec is not hevc/vp9 and bitrate 1517k is above cutoff. Transcoding to hevc. \n',
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
        + 'Bitrate 1517k is above max 1000k. Forcing transcode to hevc. \n',
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
        + 'Bitrate 3058k is above max 1000k. Forcing transcode to hevc. \n',
      container: '.mkv',
    },
  },
];

void run(tests);
