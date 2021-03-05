const fs = require('fs');
const path = require('path');
const {
    getFileContent,
    getReadDirPromise
} = require('./helpers/files-handlers');
const { getColorsFromContent, checkIfHslaValid, hslToString, prettifyColor, checkColor, checkIsDark} = require('./helpers/colors-helpers');
const { fillIndex } = require('./helpers/fill-index');
const { getColorData } = require('./helpers/get-color-data');
const { colorToHsla } = require('./helpers/color-to-hsl');

// Folder name to save files
const projectName = 'colors-stats';

let directories = [];
const files = [];
let colors = {};
let variables = {};

let {
  root,
  initialPath,
  setDirsToParse,
  searchFor,
  isJSX,
  fileExtensions,
  notOlderThan,
  popularityThreshold,
  ignoreDirs = [],
  ignoreFiles = []
} = require('./config.js');

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

const pushToDirectories = fullPath => {
    directories.push(fullPath);
};

//------------------------------

const readDir = async ({initialPath, filesToParse, fileHandler = fillStats}) => new Promise(async (resolve, reject) => {
    const readDirPromise = getReadDirPromise({
        dirPath: initialPath,
        filesToParse,
        fileHandler,
        ignoreDirs,
        ignoreFiles,
        notOlderThan,
        pushToDirectories
    });

    await readDirPromise;

    if (directories.length > 0) {
        const nextDir = directories.pop();
        await readDir({initialPath: nextDir, filesToParse, fileHandler});

        resolve();
    }
    else {
        resolve();
    }
});

//------------------------------

const handleFiles = async () => {
    console.log('Files:', files.length);
    const filesToParse = files.slice();

    return new Promise((resolve, reject) => {
      const handleChunk = async () => {
        const filesChunk = filesToParse.splice(0, 10);
        const promises = filesChunk.map(fullPath => getHandleFilePromise(fullPath))

        await Promise.all(promises.filter(Boolean));

        if (filesToParse.length > 0) {
            // console.log(filesToParse.length);
            handleChunk();
        }
        else {
            resolve();
        }
      }

      handleChunk();
    })
}

//------------------------------

const fillColors = ({fullPath, fileContent}) => {
  let colorsFromFile = getColorsFromContent(fileContent);

  if (!colorsFromFile.length > 0) {
    return;
  }

  colorsFromFile.forEach((initialColor) => {
    const {format, alphaUnits} = getColorData(initialColor);
    const hsla = colorToHsla({color: initialColor, format, alphaUnits});
    const hslaAsKey = Object.values(hsla).join('-');

    if(!checkIfHslaValid(hsla))
      return;

    const isDark = checkIsDark({hsla, alphaUnits})

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

const prettifyValue = (value) => {
  return value
    .replace(';', '')
    .replace(/\/\/.*/, '')
    .trim();
}

//------------------------------

const fillVariables = ({fullPath, fileContent}) => {
  let variablesFromFile = fileContent.match(/^\s?(@|\$|--).*/igm);

  if (!variablesFromFile) {
    return;
  }

  const colorVarsByName = {};

  variablesFromFile.forEach((initialVariable) => {
    if(!initialVariable.includes(':') || initialVariable.includes('@media')) {
      return;
    }

    const varParts = initialVariable
      .split(':')
      .map(item => item.trim());

    let [name, value] = varParts;
    value = prettifyValue(value);
    const pathParts = fullPath.split('App/')
    const keyFromPath = pathParts[1];

    if (!variables[keyFromPath]) {
      variables[keyFromPath] = {
        fullPath,
        colors: [],
        values: []
      };
    }

    const {hsla, alphaUnits, isColor} = checkColor(value);

    if (isColor) {
      const isDark = checkIsDark({hsla, alphaUnits});
      const color = {
          initialVariable: `${name}: ${value}`,
          initialColor: value,
          name,
          value,
          hsla,
          isDark
      };

      variables[keyFromPath].colors.push(color);

      colorVarsByName[name] = color;
    }
    else {
      const matchFadeFunc = value.match(/fade\((@[\S]+),([^)]+)\)/);
      let color = colorVarsByName[value];

      if(matchFadeFunc) {
        colorVar = matchFadeFunc[1];
        percents = parseFloat(matchFadeFunc[2]);
        color = Object.assign({}, colorVarsByName[colorVar]);

        if (!color.hsla.a) {
          color.hsla.a = 1;
        }

        color.hsla.a = color.hsla.a - percents / 100;
        color.value = hslToString({hsla: color.hsla});
      }

      if (color) {
        variables[keyFromPath].colors.push({
          initialVariable: `${name}: ${value}`,
          initialColor: color.value,
          name,
          value,
          hsla: color.hsla,
          isDark: color.isDark
        });
      }
      else {
        variables[keyFromPath].values.push({
          initialVariable: `${name}: ${value}`,
          name,
          value
        });
      }
    }
  });
}

//------------------------------

const getHandleFilePromise = async (fullPath) => {
    return new Promise((resolve, reject) => {
      try {
        getFileContent(fullPath)
          .then(fileContent => {
            if (searchFor === 'colors')
              fillColors({fullPath, fileContent});
            else if(searchFor === 'variables')
              fillVariables({fullPath, fileContent});

            resolve();
          })
      }
      catch (err) {
        console.log('\nError in reading file: ', err);
        console.log('Path:', fullPath);

        reject();
      }
    })
};

//------------------------------

const saveFileUrl = async ({fullPath}) => {
    const needToRead = fileExtensions.includes(path.extname(fullPath));

    if (!needToRead) {
        return;
    }

    files.push(fullPath);
};


//------------------------------

(async () => {
    // Находим все файлы
    if(initialPath) {
        console.log(`\n\n* Start parsing from path: ${initialPath} *\n`);
        await readDir({initialPath, fileHandler: saveFileUrl});
    }
    else {
        console.log(`\n\nNothing to parse.\nAdd to config folders or files\n\n`);
        return;
    }

    // Собираем данные
    await handleFiles();

    console.log('\n................................................');
    console.log('* Start writing data to files *');

    // Записываем данные в файлы
    await fillIndex({filesPath, projectName, colors, variables, popularityThreshold, isJSX});

    console.log('\n------------------------------------------------');

    console.log('\n');
})();
