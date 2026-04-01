const apkomik = require('./apkomik');
const asurascans = require('./asurascans');
const shinigami = require('./shinigami');
const mangabat = require('./mangabat');
const ikiru = require('./ikiru');
const komiku = require('./komiku');
const westmanga = require('./westmanga');
const mangadex = require('./mangadex');

const providers = {
  [apkomik.name]: apkomik,
  [asurascans.name]: asurascans,
  [shinigami.name]: shinigami,
  [mangabat.name]: mangabat,
  [ikiru.name]: ikiru,
  [komiku.name]: komiku,
  [westmanga.name]: westmanga,
  [mangadex.name]: mangadex
};

module.exports = {
  providers,
  getProvider: (name) => providers[name]
};
