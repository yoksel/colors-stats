module.exports.colorToHsla = ({ color, format, alphaUnits }) => {
  color = color.toLowerCase();

  let hsla;

  if (format === 'keyword') {
    hsla = color;
  }
  else if (format.includes('hsl')) {
    hsla = hslaFromString(color);
  }
  else if (format.includes('rgb')) {
    hsla = RGBToHSL(rgbaFromString(color));
  }
  else {
    hsla = RGBToHSL(hexToRGB(color))
  }

  if(alphaUnits === '%' && hsla.a)
    hsla.a /= 100;

  return hsla;
};

const hslaFromString = (str) => {
  const colorMatch = str.match(/\(((.*))\)/);
  const colorStr = colorMatch[1];
  const colorParts = colorStr.split(',');

  const colorPartsAsNums = colorParts.map(item => {
    return +item.trim()
      .replace('%', '')
      .replace('deg', '');
  });
  const [h, s, l, a] = colorPartsAsNums;

  return { h, s, l, a };
};

const rgbaFromString = (str) => {
  const colorMatch = str.match(/\(((.*))\)/);
  const colorStr = colorMatch[1];
  const colorParts = colorStr.split(',');

  const colorPartsAsNums = colorParts.map(item => {
    return +item.trim().replace('%', '');
  });
  const [r, g, b, a] = colorPartsAsNums;

  return { r, g, b, a };
};

// ---------------------------------------------
// https://css-tricks.com/converting-color-spaces-in-javascript/

const hexToRGB = (hex) => {
  let r = '';
  let g = '';
  let b = '';
  let a = '';

  // 3 digits
  if (hex.length < 5) {
    r = '0x' + hex[1] + hex[1];
    g = '0x' + hex[2] + hex[2];
    b = '0x' + hex[3] + hex[3];

    if (hex[4]) {
      a = '0x' + hex[4] + hex[4];
    }

  // 6 digits
  } else if (hex.length > 5) {
    r = '0x' + hex[1] + hex[2];
    g = '0x' + hex[3] + hex[4];
    b = '0x' + hex[5] + hex[6];

    if (hex[7]) {
      a = '0x' + hex[7] + hex[8];
    }
  }

  if (a) {
    a = (parseInt(a, 16) / 255).toFixed(1);
  }

  return {
    r: +r,
    g: +g,
    b: +b,
    a: a? +a : undefined
  };
};

const RGBToHSL = ({ r, g, b, a }) => {
  // Make r, g, and b fractions of 1
  r /= 255;
  g /= 255;
  b /= 255;

  // Find greatest and smallest channel values
  const cmin = Math.min(r, g, b);
      const cmax = Math.max(r, g, b);
      const delta = cmax - cmin;
      let h = 0;
      let s = 0;
      let l = 0;

  if (delta === 0) {
    h = 0;
  } else if (cmax === r) {
    // Red is max
    h = ((g - b) / delta) % 6;
  } else if (cmax === g) {
    // Green is max
    h = (b - r) / delta + 2;
  } else {
    // Blue is max
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);

  // Make negative hues positive behind 360°
  if (h < 0) { h += 360; }

  // Calculate lightness
  l = (cmax + cmin) / 2;

  // Calculate saturation
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  // Multiply l and s by 100
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l, a };
};
