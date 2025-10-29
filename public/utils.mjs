export const formatCompact2Digits = (value = 0, location = 'en') =>
  new Intl.NumberFormat(location, {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);

export const formatCompact3Digits = (value = 0, location = 'en') => 
  new Intl.NumberFormat(location, {
    notation: 'compact',
    maximumFractionDigits: 3
  }).format(value);