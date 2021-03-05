const fs = require('fs');
const { checkIsColor } = require('./colors-helpers');

const sortColors = (colorA, colorB) => {
  const a_hsl = Object.assign({}, colorA.hsla);
  const b_hsl = Object.assign({}, colorB.hsla);;

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

const getColorsMarkup = ({colorsValues, popularityThreshold, isJSX}) => {
  colorsValues.sort(sortColors);

  if (popularityThreshold && popularityThreshold > 0) {
    const initialLength = colorsValues.length;

    colorsValues = colorsValues
      .filter(({ counter }) => {
        return counter
          ? counter >= popularityThreshold
          : true;
      });

    console.log(`Filter by popularity: ${initialLength} > ${colorsValues.length}`);
  }

  const colorsItems = colorsValues
    .map((color) => {
      const { initialColor, name, fullPaths, isDark, counter } = color;
      let result = '';
      const classIsDark = isDark ? 'color--dark' : '';
      const classIsPopular = counter > 5 ? 'color--most-popular' : counter > 3 ? 'color--popular' : '';

      const counterValue = counter ? ` ${counter} in ${fullPaths.size}` : '';
      const counterMarkup = counterValue ? `<span class="color__counter">${counterValue}</span>` : '';
      let styleValue = `"background-color: ${initialColor}"`;

      if(isJSX)
        styleValue = `{{'backgroundColor': '${initialColor}'}}`;

      result += `<li class="color ${classIsDark} ${classIsPopular}" style=${styleValue}>
  <span class="color__name"> ${name ? `${name}<br/>` : ''} ${initialColor}</span>${counterMarkup}
</li>`;

      return result;
    });

  const colorsList = `<ul class="colors">
  ${colorsItems.join('\n')}
</ul>`;

  return colorsList;
}

//------------------------------

const getVariablesMarkup = ({variables, popularityThreshold, isJSX}) => {
  let markup = '';

  const filesMarkup = Object.values(variables).map(fileData => {
    markup += `<h3>${fileData.fullPath}</h3>`;

    markup += getColorsMarkup({
      colorsValues: fileData.colors,
      popularityThreshold,
      isJSX
    });

    markup += '\n\n';

    markup += getVariablesValuesMarkup({
      variablesValues: fileData.values,
      popularityThreshold,
      isJSX
    });
  });

  return markup;
}
//------------------------------

const getVariablesValuesMarkup = ({variablesValues, popularityThreshold}) => {
  // variablesValues.sort(sortColors);

  const variablesItems = variablesValues.map((variable) => {
    const { name, value } = variable;
    const isColorVarValue = value.includes('@c_');
    const colorVarClass = isColorVarValue ? 'variable--color' : '';
    return `<li class="variable ${colorVarClass}">
  ${name}: ${value}
</li>`;
  });

  const variablesList = `<ul class="variables">
  ${variablesItems.join('\n')}
</ul>`;

  return variablesList;
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

const getMarkup = ({colors, variables, popularityThreshold, isJSX}) => {
  const colorsValues = Object.values(colors);

  if (colorsValues.length > 0)
    return getColorsMarkup({colorsValues, popularityThreshold});

  const variablesValues = Object.values(variables);

  if (variablesValues.length > 0)
    return getVariablesMarkup({variables, popularityThreshold, isJSX});

  return '';
}

//------------------------------

module.exports.fillIndex = async ({filesPath, projectName, colors, variables,popularityThreshold, isJSX}) => {
  const [template, styles] = await Promise.all(getFilesPromises({filesPath, projectName}));

  const markup = getMarkup({colors, variables, popularityThreshold, isJSX})
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
