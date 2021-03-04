//------------------------------

module.exports.checkIfAlphaLow = ({hsla, alphaUnits}) => {
  let alpha = hsla.a;

  if(alpha === undefined)
    return false;

  return alpha < .5;
}

//------------------------------

module.exports.checkIfHslaValid = (hsla) => {
  const colorValues = Object.values(hsla);

  return colorValues.every(value => value === undefined
    ? true
    : !isNaN(value));
}

//------------------------------

module.exports.prettifyColor = ({initialColor, format}) => {
  if(format === 'hex')
    initialColor = initialColor.toUpperCase();

  return initialColor
    .replace(/ /g, '')
    .replace(/(0\.)/g, '.')
}
