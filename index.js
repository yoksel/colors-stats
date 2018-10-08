const fs = require('fs');
const path = require('path');

// Folder name to save files
const projectName = 'colorsStats';

let directories = [];
const files = [];
let colors = {};

const currentPath = process.env.INIT_CWD || process.env.OLDPWD;
const currentDir = path.relative(process.cwd(), currentPath);
let filesPath = currentDir;

if(currentDir.indexOf(projectName) < 0) {
  filesPath += `/${projectName}`;
}

let {
  initialPath,
  setDirsToParse,
  notOlderThan,
  popularityThreshold,
  ignoreDirs = [],
  ignoreFiles = []
} = require('./config.js')

if(setDirsToParse) {
  directories = setDirsToParse;
  initialPath = directories.pop();
}

//------------------------------

const readDir = (path) => {
  const readDirPromise = new Promise((resolveReadDir, rejectReadDir) => {
    fs.readdir(path, (err, data) => {
      if (err) {
        rejectReadDir(err);
        return;
      }

      const filtered = data
        .filter((item) => {
          if(item.startsWith('.') < 0) {
            return false
          }

          return true;
        });

      if (filtered.length === 0) {
        resolveReadDir();
      }

      handleFiltered({
        filtered,
        path
      })
        .then(() => {
          resolveReadDir();
        })
        .catch(err => {
          console.log('\nError in processing of filtered: ', err);
        })
    })
  });

  readDirPromise
    .then(result => {

      // Call next
      if(directories.length > 0) {
        const nextDir = directories.pop();
        readDir(nextDir);
      }
      else {
        console.log('\nDONE');
        console.log('------------------------------');
        fillIndex();
        writeFilesList();
      }
    })
    .catch(err => {
      console.log('\nError while reading dir', err);
    });
};

//------------------------------

const handleFiltered = ({filtered, path}) => {
  return new Promise ((resolve, reject) => {

    filtered.forEach((item, index) => {
      const fullPath = `${path}/${item}`;

      getStat(fullPath)
        .then(stats => {
          // Handle stats
          if(stats.isDirectory()) {
            const isIgnoredDir = ignoreDirs
              .some(item => {
                return fullPath.indexOf(item) > -1;
              });

            if(!isIgnoredDir) {
              fillDirectories(fullPath);
            }
          }
          else if(stats.isFile()) {

            const isIgnoredFile = ignoreFiles
              .some(item => {
                return fullPath.indexOf(item) > -1;
              });

            if(!isIgnoredFile) {
              // Ignore old files if notOlderThan is set
              const isNew = checkIsNew(stats.mtimeMs);

              if(isNew) {
                fillColors({
                  fullPath
                });
              }
            }
          }

          if(index === filtered.length - 1) {
            resolve();
          }
        })
        .catch(err => {
          console.log('\nError in reading file stats: ', err);
        })
    })
  })
}

//------------------------------

const getStat = (fullPath) => {
  return new Promise((resolve, reject) => {
    fs.lstat(fullPath, (err, status) => {
      if(err) {
        reject (err);
      }

      resolve(status);
    });
  })
};

//------------------------------

const fillDirectories = (fullPath) => {
  directories.push(fullPath);
};

//------------------------------

const getFileContent = (fullPath) => {
  return new Promise((resolve,reject) => {
    fs.readFile(fullPath, 'utf-8', (err, data) => {
      if(err) {
        reject(err);
      }

      resolve(data);
    })
  });
};

//------------------------------

const fillColors = ({fullPath}) => {
  const extensions = ['.css', '.scss', '.js'];
  const needToRead = extensions.includes(path.extname(fullPath));

  if(!needToRead) {
    return;
  }

  files.push(fullPath);

  getFileContent(fullPath)
    .then(result => {

      const grepColors = result.match(/[ ']#[0-9a-f]{3,6}/igm);

      if(!grepColors) {
        return;
      }

      const grepColorsUpper = grepColors
        .map(item => {
          let color = normalizeName(item);

          color = getFullHex(color);

          const RGB = HEXtoRGB(color);
          const lightness = Object.keys(RGB)
            .reduce((prev, item) => {
              prev += RGB[item];
              return prev
            }, 0);

          const isDark = lightness < 100 * 3;

          if(!colors[color]) {
            colors[color] = {
              name: color,
              fullPath: fullPath,
              RGB,
              isDark,
              hsl: RGBtoHSL(RGB),
              counter: 1
            };
          }
          else {
            colors[color].counter++;
          }
        });
    })
    .catch(err => {
      console.log('\nError in reading file: ', err);
      console.log('Path:', fullPath);
    })
};

//------------------------------

const checkIsNew = (mtimeMs) => {
  if(!notOlderThan || !notOlderThan.year) {
    return true;
  }

  const dateParts = [
    notOlderThan.year
  ];
  if(notOlderThan.month) {
    dateParts.push(notOlderThan.month - 1);

    if(notOlderThan.day) {
      dateParts.push(notOlderThan.day);
    }
  }

  const fileDateMS = parseInt(mtimeMs);
  const dateOfOldFilesMS = new Date(...dateParts).getTime();

  return dateOfOldFilesMS <= fileDateMS;
}

//------------------------------

const fillIndex = () => {
  fs.readFile(`${filesPath}/index-src.html`, 'utf-8', (err, data) => {
    if(err) {
      console.log(`Error: check if this folder name is ${projectName}`);
      throw err;
    }

    const colorsKeys = Object.keys(colors);

    colorsKeys.sort(sortColors);
    let colorsItems = colorsKeys;

    if(popularityThreshold && popularityThreshold > 0) {
      const initialLength = colorsItems.length;

      colorsItems = colorsItems
        .filter(color => {
          const {counter} = colors[color];
          return counter >= popularityThreshold;
        });

      console.log(`Filter by popularity: ${initialLength} > ${colorsItems.length}`);
    }

    colorsItems = colorsItems
      .map(color => {
        const {name, fullPath, isDark, counter, hsl} = colors[color];
        const fileUrl = fullPath
          .replace(initialPath, '');
        let result = '';
        const classIsDark = isDark ? 'color--dark' : '';
        const classIsPopular = counter > 5 ? 'color--most-popular' : counter > 3 ? 'color--popular' : '';

        result += `<li class="color ${classIsDark} ${classIsPopular}" style="background: #${name}" title="${fullPath}">
          <span class="color__name">#${name}</span>
          <span class="color__counter">${counter}</span>
        </li>`;

        return result;
      });

    const colorsList = `<ul class="colors">
  ${colorsItems.join('')}
</ul>`;
    const newMarkup = data.replace('<!-- content -->', colorsList);

    fs.writeFile(`${filesPath}/index.html`, newMarkup, (err, data) => {
      if(err) {
        console.log(`Error: check if this folder name is ${projectName}`);
        throw err;
      }

      console.log(`Index was written and can be opened: YOUR_PATH/${projectName}/index.html`);
      console.log('------------------------------');
    });
  });
};

//------------------------------

const writeFilesList = () => {
  fs.writeFile(`${filesPath}/files.json`, JSON.stringify(files,null,'\t'), (err, data) => {
    if(err) {
      console.log(`Error: check if this folder name is ${projectName}`);
      throw err;
    }

    console.log('Files list was written to files.json');
  })
}

//------------------------------

const normalizeName = (name) => {
  const result = name
    .trim()
    .toUpperCase()
    .replace('#', '')
    .replace(/[;,)\']/, '');

  return result;
}

//------------------------------

const getFullHex = (hex) => {
  if(hex.length === 3) {
    hex = hex
      .split('')
      .map(char => {
        return `${char}${char}`
      })
      .join('');
  }

  return hex;
}

//------------------------------

const HEXtoRGB = (hex) => {
  const R = hex.slice(0,2);
  const G = hex.slice(2,4);
  const B = hex.slice(4,6);

  return {
    r: parseInt(R, 16),
    g: parseInt(G, 16),
    b: parseInt(B, 16)
  };
}

//------------------------------

const sortColors = (a, b) => {
  const a_hsl = colors[a].hsl;
  const b_hsl = colors[b].hsl;

  const a_sl_sum = a_hsl.s + a_hsl.l;
  const b_sl_sum = b_hsl.s + b_hsl.l;

  // L
  if (a_hsl.l < b_hsl.l) {
    return -1;
  }
  if (a_hsl.l > b_hsl.l) {
    return 1;
  }

  // H
  if (a_hsl.h < b_hsl.h) {
    return -1;
  }
  if (a_hsl.h > b_hsl.h) {
    return 1;
  }

  // S
  if (a_sl_sum < b_sl_sum) {
    return -1;
  }
  if (a_sl_sum > b_sl_sum) {
    return 1;
  }

  return 0;
}

//------------------------------
// Source: https://github.com/eligrey/color.js/blob/master/color.js

const RGBtoHSL = function ({r,g,b}) {
  r /= 255;
  g /= 255;
  b /= 255;

  var max = Math.max(r, g, b),
    min = Math.min(r, g, b),
  h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // Edited by me
  h *= 360;
  s *= 100;
  l *= 100;

  return {
    h,
    s,
    l
  };
};

//------------------------------

readDir(initialPath);
