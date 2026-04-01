const GenericWPProvider = require('./genericProvider');

// APkomik: https://apkomik.cc/
const apkomik = new GenericWPProvider("APkomik", "https://apkomik.cc", {
  item: ".listupd .bs",
  title: ".tt, a",
  link: "a",
  image: "img"
});

module.exports = apkomik;
