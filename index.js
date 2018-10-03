const fs = require('fs');

const directories = [];
const files = [];
let colors = {};

const {initialPath, ignoreDirs = [], ignoreFiles = []} = require('./config.js')

//------------------------------

const readDir = (path) => {
  const readDirPromise = new Promise((resolveReadDir, rejectReadDir) => {
    fs.readdir(path, (err, data) => {
      if (err) {
        rejectReadDir(err);
      }

      const filtered = data
        .filter((item) => {
          if(item.startsWith('.') < 0 || item.indexOf('.gif') > -1) {
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
          console.log('Error in processing of filtered: ', err);
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
        fillIndex();
        writeFilesList();
      }
    })
    .catch(err => {
      console.log('Error while reading dir', err);
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
              // Ignore olfd files
              const fileDateMS = parseInt(stats.mtimeMs);
              const dateOfOldFilesMS = new Date(2018, 0, 1).getTime();
              const isNew = dateOfOldFilesMS <= fileDateMS;

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
          console.log('Error in reading file stats: ', err);
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
  if(fullPath.indexOf('.css') < 0) {
    return;
  }

  files.push(fullPath);

  getFileContent(fullPath)
    .then(result => {

      const grepColors = result.match(/ #[0-9a-f]{3,6}/igm);

      if(!grepColors) {
        return;
      }

      const grepColorsUpper = grepColors
        .map(item => {
          let color = item
            .trim()
            .toUpperCase()
            .replace(/[;,)]/,'');

          color = getFullHex(color);

          const RGB = getRGB(color);
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
      console.log('Error in reading file: ', err);
      console.log('Path:', fullPath);
    })
};

//------------------------------

const fillIndex = () => {
  fs.readFile(`${initialPath}/findColors/index-src.html`, 'utf-8', (err, data) => {
    if(err) {
      throw err;
    }

    const colorsCodes = Object.keys(colors);

    colorsCodes.sort(sortColors);

    const colorsItems = colorsCodes
      .map(color => {
        const {name, fullPath, isDark, counter, hsl} = colors[color];
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

    fs.writeFile(`${initialPath}/findColors/index.html`, newMarkup, (err, data) => {
      if(err) {
        console.log(err);
      }

      console.log('Index was written');
    });
  });
};

//------------------------------

const writeFilesList = () => {
  fs.writeFile(`${initialPath}/findColors/files.json`, JSON.stringify(files,null,'\t'), (err, data) => {
    if(err) {
      console.log(err);
    }

    console.log('files was written');
  })
}

//------------------------------

const getFullHex = (hex) => {
  let trimed = hex.slice(1);

  if(trimed.length === 3) {
    trimed = trimed
      .split('')
      .map(char => {
        return `${char}${char}`
      })
      .join('');
  }

  return trimed;
}

//------------------------------

const getRGB = (hex) => {
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

  // L
  if (a_hsl.l < b_hsl.l) {
    return -1;
  }
  if (a_hsl.l > b_hsl.l) {
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

const textColor = getRGB('807E7E');
const hsl = RGBtoHSL(textColor);
console.log(textColor);
console.log();
const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
console.log(hslStr);

//------------------------------

readDir(initialPath);
