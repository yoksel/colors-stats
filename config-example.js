module.exports = {
  // Initial path to start parsing files and directories
  initialPath: 'styles',

  // if exist, initialPath will be ignored,
  // search will be started from last of items
  setDirsToParse: [
    'my-fancy-component/styles',
    'another-fancy-component',
  ],

  // If exist, files fill be filtered by extensions
  fileExtensions: ['.css','.less','.scss'],

  // Search all colors or all style variables
  // colors | variables
  searchFor: 'variables',

  // If exist, files older than this date
  // will not be processed
  notOlderThan: {
    year: '2017',
    month: '1', //1-12,
    day: '1' //1-32
  },

  // Filter colors by popularity
  // Set 0 to disable
  popularityThreshold: 3,

  // Directories to ignore
  ignoreDirs: [
    '/old-version'
  ],

  // Files to ignore
  ignoreFiles: [
    'old-staff.css',
  ]
};
