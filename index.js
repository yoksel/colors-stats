const fs = require('fs');
const path = require('path');
const { getStat, getFileContent, checkIsNew, writeFilesList, isNeedToReadFile } = require('./helpers/files-handlers');


// Folder name to save files
const projectName = 'colors-stats';

let directories = [];
const files = [];
let colors = {};

let {
  root,
  initialPath,
  setDirsToParse,
  extensions,
  notOlderThan,
  popularityThreshold,
  ignoreDirs = [],
  ignoreFiles = []
} = require('./config.js');
const { fillIndex } = require('./helpers/fill-index');
const { getColorData } = require('./helpers/get-color-data');
const { colorToHsla } = require('./helpers/color-to-hsl');

const currentPath = process.env.INIT_CWD || process.env.OLDPWD;
const currentDir = currentPath ? path.relative(process.cwd(), currentPath) : root;
let filesPath = currentDir;
const sourceFiles = [];

if (currentDir.indexOf(projectName) < 0) {
  filesPath += `/${projectName}`;
}

if (setDirsToParse) {
  directories = setDirsToParse;
  initialPath = directories.pop();
}

//------------------------------

const getReadDirPromise = (path) => {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const filtered = data
        .filter((item) => {
          if (item.startsWith('.')) {
            return false
          }

          return true;
        });

      if (filtered.length === 0) {
        resolve();
      }

      handleFiltered({
        filtered,
        path
      })
        .then(() => {
          resolve();
        })
        .catch(err => {
          console.log('\nError in processing of filtered: ', err);
        })
    })
  });
};

//------------------------------

const readDir = async (path) => {
  if (!path) {
    console.log('\nPath is undefined');
    return;
  }

  const readDirPromise = getReadDirPromise(path);

  readDirPromise
    .then(async () => {
      // Call next
      if (directories.length > 0) {
        const nextDir = directories.pop();
        readDir(nextDir);
      }
      else {
        await handleFoundedFiles();
        fillIndex({filesPath, projectName, colors, popularityThreshold});
        // writeFilesList({filesPath, files, projectName, colors})
        console.log('\nDONE');
        console.log('------------------------------');
      }
    })
    .catch(err => {
      console.log('\nError while reading dir', err);
    });
};

//------------------------------

const handleFiltered = ({ filtered, path }) => {
  return new Promise((resolve) => {

    filtered.forEach((item, index) => {
      const fullPath = `${path}/${item}`;

      getStat(fullPath)
        .then((stats) => {
          if (stats.isDirectory()) {
            // Handle stats
            const isIgnoredDir = ignoreDirs
              .some((item) => {
                return fullPath.indexOf(item) > -1;
              });

            if (!isIgnoredDir) {
              directories.push(fullPath);
            }
          }
          else if (stats.isFile()) {
            const isIgnoredFile = ignoreFiles
              .some((item) => {
                return fullPath.indexOf(item) > -1;
              });

            if (!isIgnoredFile) {
              // Ignore old files if notOlderThan is set
              const isNew = checkIsNew({
                mtimeMs: stats.mtimeMs,
                notOlderThan
              });

              if (isNew) {
                sourceFiles.push(fullPath);
              }
            }
          }

          if (index === filtered.length - 1) {
            resolve();
          }
        })
        .catch((err) => {
          console.log('\nError in reading file stats: ', err);
        })
    })
  })
}

//------------------------------

const handleFoundedFiles = async () => {
  const promises = [];

  sourceFiles.forEach((fullPath) => {
    if (!isNeedToReadFile({fullPath, extensions}))
      return;

    files.push(fullPath);

    promises.push(getHandleFilePromise(fullPath));
  })

  await Promise.all(promises);
};

//------------------------------

const getColorsFromContent = (fileContent) => {
  const grepColorsHEX = fileContent.match(/#[0-9a-f]{3,8}/igm);
  const grepColorsRGB = fileContent.match(/rgb(a)?\([^)]+\)/igm);
  const grepColorsHSL = fileContent.match(/hsl(a)?\([^)]+\)/igm);

  let grepColors = [];

  if (grepColorsHEX)
    grepColors = grepColors.concat(grepColorsHEX);
  if (grepColorsRGB)
    grepColors = grepColors.concat(grepColorsRGB);
  if (grepColorsHSL)
    grepColors = grepColors.concat(grepColorsHSL);

  return grepColors;
}

//------------------------------

const checkIfAlphaLow = ({hsla, alphaUnits}) => {
  let alpha = hsla.a;

  if(alpha === undefined)
    return false;

  return alpha < .5;
}

//------------------------------

const checkIfHslaValid = (hsla) => {
  const colorValues = Object.values(hsla);

  return colorValues.every(value => value === undefined
    ? true
    : !isNaN(value));
}

//------------------------------

const fillColors = ({fullPath, fileContent}) => {
  let colorsFromFile = getColorsFromContent(fileContent);

  if (!colorsFromFile.length > 0) {
    return;
  }

  colorsFromFile.forEach((initialColor) => {
    const {format, alphaUnits} = getColorData(initialColor);
    const hsla = colorToHsla({color: initialColor, format});
    const hslaAsKey = Object.values(hsla).join('-');

    if(!checkIfHslaValid(hsla))
      return;

    if(alphaUnits === '%')
      hsla.a /= 100;

    const isAlphaLow = checkIfAlphaLow({hsla, alphaUnits})
    const isDark = hsla.l < 50 && !isAlphaLow;

    if (!colors[hslaAsKey]) {
      colors[hslaAsKey] = {
        initialColor: prettifyColor({initialColor, format}),
        fullPaths: new Set([fullPath]),
        isDark,
        hsla,
        counter: 1
      };
    }
    else {
      colors[hslaAsKey].counter++;
      colors[hslaAsKey].fullPaths.add(fullPath);
    }
  });
}

//------------------------------

const prettifyColor = ({initialColor, format}) => {
  if(format === 'hex')
    initialColor = initialColor.toUpperCase();

  return initialColor
    .replace(/ /g, '')
    .replace(/(0\.)/g, '.')
}

//------------------------------

const getHandleFilePromise = async (fullPath) => {
  try {
    const fileContent = await getFileContent(fullPath);
    fillColors({fullPath, fileContent});
  }
  catch (err) {
      console.log('\nError in reading file: ', err);
      console.log('Path:', fullPath);
  }
};

//------------------------------

readDir(initialPath);

