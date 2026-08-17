/* eslint max-len: 0 */
const _ = require('lodash');
const run = require('../helpers/run');

const tests = [
  {
    // No bitrate configured - libopus picks its own.
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleMP3_1.json')),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 libopus -c:a:1 libopus -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Converting non-opus audio track(s) to opus.\n',
    },
  },
  {
    // Bitrate given without a 'k' suffix.
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleMP3_1.json')),
      librarySettings: {},
      inputs: { bitrate: '128' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 libopus -b:a:0 128k -c:a:1 libopus -b:a:1 128k -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Converting non-opus audio track(s) to opus at 128k.\n',
    },
  },
  {
    // Bitrate given with a 'k' suffix.
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleMP3_1.json')),
      librarySettings: {},
      inputs: { bitrate: '96k' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 libopus -b:a:0 96k -c:a:1 libopus -b:a:1 96k -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Converting non-opus audio track(s) to opus at 96k.\n',
    },
  },
  {
    // Unparseable bitrate falls back to automatic, with a note in infoLog.
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleMP3_1.json')),
      librarySettings: {},
      inputs: { bitrate: 'abc' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 libopus -c:a:1 libopus -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Could not parse bitrate "abc", letting libopus pick automatically.\n'
        + '☒Converting non-opus audio track(s) to opus.\n',
    },
  },
  {
    // Every audio stream already opus but the container is mkv - remux only, no re-encode.
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleMP3_1.json'));
        file.ffProbeData.streams[0].codec_name = 'opus';
        file.ffProbeData.streams[1].codec_name = 'opus';
        return file;
      })(),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 copy -c:a:1 copy -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Audio is already opus but container is .mkv. Remuxing to .opus.\n',
    },
  },
  {
    // Every audio stream already opus AND container already .opus - genuinely nothing to do.
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleMP3_1.json'));
        file.ffProbeData.streams[0].codec_name = 'opus';
        file.ffProbeData.streams[1].codec_name = 'opus';
        file.container = 'opus';
        return file;
      })(),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☑File is already opus.\n',
    },
  },
  {
    // Mixed: one stream already opus (copied), one still mp3 (converted).
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleMP3_1.json'));
        file.ffProbeData.streams[0].codec_name = 'opus';
        return file;
      })(),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 copy -c:a:1 libopus -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Converting non-opus audio track(s) to opus.\n',
    },
  },
  {
    // Real video stream present - not a music file, skip entirely.
    input: {
      file: _.cloneDeep(require('../sampleData/media/sampleH264_1.json')),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: false,
      preset: '',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒File contains video!\n',
    },
  },
  {
    // Embedded cover art (mjpeg, 0/0 frame rate) shouldn't be mistaken for a real video stream.
    input: {
      file: (() => {
        const file = _.cloneDeep(require('../sampleData/media/sampleMP3_1.json'));
        file.ffProbeData.streams.push({
          index: 2,
          codec_name: 'mjpeg',
          codec_type: 'video',
          avg_frame_rate: '0/0',
          disposition: { attached_pic: 1 },
        });
        return file;
      })(),
      librarySettings: {},
      inputs: { bitrate: '' },
      otherArguments: {},
    },
    output: {
      processFile: true,
      preset: '<io> -vn -map 0:a -c:a:0 libopus -c:a:1 libopus -map_metadata 0 -f opus',
      container: '.opus',
      handBrakeMode: false,
      FFmpegMode: true,
      reQueueAfter: true,
      infoLog: '☒Converting non-opus audio track(s) to opus.\n',
    },
  },
];

void run(tests);
