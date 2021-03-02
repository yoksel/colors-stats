const fs = require('fs');

const sortColors = (colorA, colorB) => {
  const a_hsl = Object.assign({}, colorA.hsla);
  const b_hsl = Object.assign({}, colorB.hsla);;

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

  // A
  if(a_hsl.a === 1)
    a_hsl.a = undefined
  if(b_hsl.a === 1)
    b_hsl.a = undefined

  if(a_hsl.a && b_hsl.a) {
    if (a_hsl.a < b_hsl.a) {
      return -1;
    }
    if (a_hsl.a > b_hsl.a) {
      return 1;
    }
  }

  if(a_hsl.a && b_hsl.a === undefined) {
    return -1;
  }
  if (a_hsl.a === undefined && b_hsl.a) {
    return 1;
  }

  return 0;
}

//------------------------------

const getMarkup = ({colors, popularityThreshold}) => {
  let colorsValues = Object.values(colors);
    colorsValues.sort(sortColors);

    if (popularityThreshold && popularityThreshold > 0) {
      const initialLength = colorsValues.length;

      colorsValues = colorsValues
        .filter(color => {
          const { counter } = colors[color];
          return counter >= popularityThreshold;
        });

      console.log(`Filter by popularity: ${initialLength} > ${colorsValues.length}`);
    }

    const colorsItems = colorsValues
      .map((color) => {
        const { initialColor, fullPaths, isDark, counter } = color;
        let result = '';
        const classIsDark = isDark ? 'color--dark' : '';
        const classIsPopular = counter > 5 ? 'color--most-popular' : counter > 3 ? 'color--popular' : '';

        result += `<li class="color ${classIsDark} ${classIsPopular}" style="background-color: ${initialColor}">
          <span class="color__name">${initialColor}</span>
          <span class="color__counter">${counter} in ${fullPaths.size}</span>
        </li>`;

        return result;
      });

    const colorsList = `<ul class="colors">
  ${colorsItems.join('')}
</ul>`;

  return colorsList;
}

//------------------------------

const getFilesPromises = ({filesPath, projectName}) => {
  const htmlPromise = new Promise((resolve, reject) => {
    fs.readFile(`${filesPath}/index-src.html`, 'utf-8', (err, data) => {
      if (err) {
        console.log(`Error: check if this folder name is ${projectName}`);
        reject(err);
      }

      resolve(data);
    });
  });

  const cssPromise = new Promise((resolve, reject) => {
    fs.readFile(`${filesPath}/styles.css`, 'utf-8', (err, data) => {
      if (err) {
        console.log(`Error: check if this folder name is ${projectName}`);
        reject(err);
      }

      resolve(data);
    });
  });

  return [htmlPromise, cssPromise];
}

//------------------------------

module.exports.fillIndex = async ({filesPath, projectName, colors,popularityThreshold}) => {
  const [template, styles] = await Promise.all(getFilesPromises({filesPath, projectName}));

  const markup = getMarkup({colors,popularityThreshold})
  const newMarkup = template
    .replace('<!-- styles -->', `<style>${styles}</style>`)
    .replace('<!-- content -->', markup);

  fs.writeFile(`${filesPath}/index.html`, newMarkup, (err) => {
    if (err) {
      console.log(`Error: check if this folder name is ${projectName}`);
      throw err;
    }

    console.log(`Index was written and can be opened: YOUR_PATH/${projectName}/index.html`);
    console.log('------------------------------');
  });
};
