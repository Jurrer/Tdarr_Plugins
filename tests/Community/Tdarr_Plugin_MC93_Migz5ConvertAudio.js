/* eslint max-len: 0 */
const _ = require('lodash');
const run = require('../helpers/run');

const tests = [
  // Both convert_all_to_opus and downmix left at their (false) defaults - nothing to do.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {},
      otherArguments: {},
    },
    output: {
      processFile: false,
      container: '.mp4',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☑File contains all required audio formats. \n',
    },
  },

  // convert_all_to_opus has no channel restriction (unlike upstream's aac_stereo) -
  // a 6 channel AAC track still gets converted to opus.
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
      container: '.mp4',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 6 channel but is not opus. Converting. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=und"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // convert_all_to_opus converts every non-opus track (flac/ac3/eac3/aac), regardless of codec.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_2.json')),
      librarySettings: {},
      inputs: {
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -metadata:s:a:3 "language=fre" -c:a:4 libopus -metadata:s:a:4 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // Language metadata is only emitted when the source stream actually has a language tag.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        delete file.ffProbeData.streams[4].tags.language;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -c:a:4 libopus -metadata:s:a:4 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // --- downmix: replace-in-place, straight to stereo, preserve_channel_title: false (default) ---

  // Single >2ch track downmixes to stereo.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        downmix: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // downmix_single_track: false (default) - every eligible track is downmixed independently.
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
        downmix: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n'
        + '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng" -c:a:1 libopus -ac 2 -metadata:s:a:1 "title=2.0" -metadata:s:a:1 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // downmix_single_track: true - only the first eligible track is downmixed, the second is left
  // completely untouched (no downmix, and convert_all_to_opus is not set so no opus conversion).
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
        downmix: 'true',
        downmix_single_track: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // Regression test for the double-skip bug: with downmix_single_track true and
  // convert_all_to_opus true, the second 8ch track is skipped by the downmix gate
  // (downmix_single_track already satisfied) but must still be caught by the opus pass -
  // downmixedIndices (not a recomputed channel check) is what the opus pass consults. Every
  // other non-downmixed track (including the untouched 2ch tracks) is opus-converted too.
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
        downmix: 'true',
        downmix_single_track: 'true',
        convert_all_to_opus: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "2.0" from 8 channel. \n'
        + '☒Audio track is 8 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n'
        + '☒Audio track is 2 channel but is not opus. Converting. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=eng" -c:a:1 libopus -metadata:s:a:1 "language=eng" -c:a:2 libopus -metadata:s:a:2 "language=eng" -c:a:3 libopus -metadata:s:a:3 "language=fre" -c:a:4 libopus -metadata:s:a:4 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // --- preserve_channel_title: true - preserves original title in the downmix name ---

  // Original title already ends with the new layout ("... 2.0") - buildDownmixTitle must not
  // duplicate the suffix.
  {
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleH264_2.json'));
        file.ffProbeData.streams[1].channels = 8;
        return file;
      })(),
      librarySettings: {},
      inputs: {
        downmix: 'true',
        preserve_channel_title: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "Anglais E-AC3 2.0" from 8 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=Anglais E-AC3 2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // Original title does not already end with the new layout - it gets appended.
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
        downmix: 'true',
        preserve_channel_title: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mkv',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 8 channel. Creating 2 channel "E-AC-3 Atmos 5.1 - 2.0" from 8 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=E-AC-3 Atmos 5.1 - 2.0" -metadata:s:a:0 "language=eng"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },

  // No original title at all - buildDownmixTitle falls back to the layout string itself.
  {
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: {
        downmix: 'true',
        preserve_channel_title: 'true',
      },
      otherArguments: {},
    },
    output: {
      processFile: true,
      container: '.mp4',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio track is 6 channel. Creating 2 channel "2.0" from 6 channel. \n',
      preset: ', -map 0 -c copy -c:a:0 libopus -ac 2 -metadata:s:a:0 "title=2.0" -metadata:s:a:0 "language=und"  -strict -2 -max_muxing_queue_size 9999 ',
    },
  },
];

void run(tests);
