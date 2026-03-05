export const getSeason = (date = new Date()) => {
  const start = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${(start + 1).toString().slice(-2)}`;
};
