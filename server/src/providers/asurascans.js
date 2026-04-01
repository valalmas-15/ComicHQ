const axios = require('axios');
const cheerio = require('cheerio');
const GenericWPProvider = require('./genericProvider');

class AsuraScans extends GenericWPProvider {
  constructor() {
    super("Asura Scans", "https://asuratoon.com", {
      item: ".listupd .bs, .bsx, .series-card, .grid > a, .divide-y > div",
      title: ".tt, h3, .font-medium, .text-sm.font-bold",
      link: "a",
      image: "img",
      searchPath: "/browse?search="
    });
    this.mirrors = [
      "https://asurascans.com",
      "https://asuracomic.net",
      "https://asuratoon.com",
      "https://asura.nacmanga.com"
    ];
  }
}

module.exports = new AsuraScans();
