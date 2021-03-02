const fs = require('fs');
const path = require('path');

module.exports.getStat = (fullPath) => {
  return new Promise((resolve, reject) => {
    fs.lstat(fullPath, (err, stats) => {
      if (err) {
        reject(err);
      }

      resolve(stats);
    });
  })
};

//------------------------------

module.exports.getFileContent = (fullPath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fullPath, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data);
    })
  });
};

//------------------------------

module.exports.checkIsNew = ({ mtimeMs, notOlderThan }) => {
  if (!notOlderThan || !notOlderThan.year) {
    return true;
  }

  let { year, month = 0, day = 0 } = notOlderThan;

  if (month)
    month -= 1;

  const fileDateMS = parseInt(mtimeMs);
  const dateOfOldFilesMS = new Date(year, month, day).getTime();

  return dateOfOldFilesMS <= fileDateMS;
}

//------------------------------

module.exports.isNeedToReadFile = ({fullPath, extensions}) => {
  return extensions.includes(path.extname(fullPath));
}

//------------------------------

module.exports.writeFilesList = ({filesPath, files, projectName}) => {
  fs.writeFile(`${filesPath}/files.json`, JSON.stringify(files, null, '\t'), (err) => {
    if (err) {
      console.log(`Error: check if this folder name is ${projectName}`);
      throw err;
    }

    console.log('Files list was written to files.json');
  })
}

