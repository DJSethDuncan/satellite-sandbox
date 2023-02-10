const cleanAndParseData = (data) => {
  return JSON.parse(data.replaceAll("&quot;", '"'));
};
