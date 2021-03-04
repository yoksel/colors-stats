const { colorToHsla } = require("./color-to-hsl");
const { getColorData } = require("./get-color-data");

//------------------------------

module.exports.getColorsFromContent = (fileContent) => {
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

const checkIfAlphaLow = ({hsla}) => {
  let alpha = hsla.a;

  if(alpha === undefined)
    return false;

  return alpha < .5;
}

module.exports.checkIfAlphaLow = checkIfAlphaLow;

//------------------------------

const checkIfHslaValid = (hsla) => {
  if(!hsla) {
    return false;
  }

  const colorValues = Object.values(hsla);

  return colorValues.every(value => value === undefined
    ? true
    : !isNaN(value));
};

module.exports.checkIfHslaValid = checkIfHslaValid;

//------------------------------

module.exports.prettifyColor = ({initialColor, format}) => {
  if(format === 'hex')
    initialColor = initialColor.toUpperCase();

  return initialColor
    .replace(/ /g, '')
    .replace(/(0\.)/g, '.')
}

//------------------------------

module.exports.checkColor = (str) => {
  const {format, alphaUnits} = getColorData(str);

  if(!format)
    return {isColor: false};

  const hsla = colorToHsla({color: str, format});

  return {
    hsla,
    alphaUnits,
    isColor: checkIfHslaValid(hsla)
  };
}

//------------------------------

module.exports.checkIsDark = ({hsla, alphaUnits}) => {
  const isAlphaLow = checkIfAlphaLow({hsla, alphaUnits})
  return hsla.l < 50 && !isAlphaLow;
}
