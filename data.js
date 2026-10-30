// My Whisky - starter data.
// Each distillery: [name, country, region, year founded]
// Founding years are the commonly quoted ones; double-check any you care about.
// You can add your own distilleries from inside the app (Add tab).

window.REGION_COLORS = {
  Speyside: '#c8922a',
  Highlands: '#5a8f4e',
  Islay: '#3b6ea5',
  Islands: '#2f8f9d',
  Lowlands: '#8a6fb0',
  Campbeltown: '#b5543c',
  Japan: '#d64550',
  Ireland: '#2e9b5f',
  Wales: '#c8102e',
  USA: '#4a6fa5',
  England: '#7a5a8a',
  India: '#e07b24',
  Taiwan: '#1f9aa8',
  Australia: '#c9892f',
  Sweden: '#3f7cac',
  Other: '#b08a3e'
};

window.SCOTCH_REGIONS = ['Speyside', 'Highlands', 'Islay', 'Islands', 'Lowlands', 'Campbeltown'];

window.DIST_RAW = [
  // Speyside
  ['Glenfiddich', 'Scotland', 'Speyside', 1887],
  ['The Glenlivet', 'Scotland', 'Speyside', 1824],
  ['The Macallan', 'Scotland', 'Speyside', 1824],
  ['The Balvenie', 'Scotland', 'Speyside', 1892],
  ['Aberlour', 'Scotland', 'Speyside', 1879],
  ['Cardhu', 'Scotland', 'Speyside', 1824],
  ['Cragganmore', 'Scotland', 'Speyside', 1869],
  ['Glenfarclas', 'Scotland', 'Speyside', 1836],
  ['Glen Grant', 'Scotland', 'Speyside', 1840],
  ['Mortlach', 'Scotland', 'Speyside', 1823],
  ['Strathisla', 'Scotland', 'Speyside', 1786],
  ['Glen Moray', 'Scotland', 'Speyside', 1897],
  ['BenRiach', 'Scotland', 'Speyside', 1898],
  ['The GlenDronach', 'Scotland', 'Speyside', 1826],
  ['The Glenrothes', 'Scotland', 'Speyside', 1879],
  ['Tamdhu', 'Scotland', 'Speyside', 1897],
  ['Knockando', 'Scotland', 'Speyside', 1898],
  ['Speyburn', 'Scotland', 'Speyside', 1897],
  ['Benromach', 'Scotland', 'Speyside', 1898],
  ['Craigellachie', 'Scotland', 'Speyside', 1891],
  ['Glenallachie', 'Scotland', 'Speyside', 1967],
  ['Tomintoul', 'Scotland', 'Speyside', 1964],
  ['Linkwood', 'Scotland', 'Speyside', 1821],
  ['Longmorn', 'Scotland', 'Speyside', 1894],
  ['Glen Elgin', 'Scotland', 'Speyside', 1898],
  ['Benrinnes', 'Scotland', 'Speyside', 1826],
  ['Aultmore', 'Scotland', 'Speyside', 1897],
  ['Auchroisk', 'Scotland', 'Speyside', 1974],
  // Highlands
  ['Glenmorangie', 'Scotland', 'Highlands', 1843],
  ['Dalmore', 'Scotland', 'Highlands', 1839],
  ['Oban', 'Scotland', 'Highlands', 1794],
  ['Clynelish', 'Scotland', 'Highlands', 1967],
  ['Old Pulteney', 'Scotland', 'Highlands', 1826],
  ['Balblair', 'Scotland', 'Highlands', 1790],
  ['Glengoyne', 'Scotland', 'Highlands', 1833],
  ['Aberfeldy', 'Scotland', 'Highlands', 1896],
  ['Edradour', 'Scotland', 'Highlands', 1825],
  ['Tomatin', 'Scotland', 'Highlands', 1897],
  ['Dalwhinnie', 'Scotland', 'Highlands', 1897],
  ['Deanston', 'Scotland', 'Highlands', 1966],
  ['Fettercairn', 'Scotland', 'Highlands', 1824],
  ['Glen Garioch', 'Scotland', 'Highlands', 1797],
  ['Royal Lochnagar', 'Scotland', 'Highlands', 1845],
  ['Ardmore', 'Scotland', 'Highlands', 1898],
  ['Blair Athol', 'Scotland', 'Highlands', 1798],
  ['Glen Ord', 'Scotland', 'Highlands', 1838],
  ['Teaninich', 'Scotland', 'Highlands', 1817],
  ['Wolfburn', 'Scotland', 'Highlands', 2013],
  ['Ardnamurchan', 'Scotland', 'Highlands', 2014],
  // Islands
  ['Talisker', 'Scotland', 'Islands', 1830],
  ['Highland Park', 'Scotland', 'Islands', 1798],
  ['Scapa', 'Scotland', 'Islands', 1885],
  ['Jura', 'Scotland', 'Islands', 1810],
  ['Tobermory', 'Scotland', 'Islands', 1798],
  ['Arran', 'Scotland', 'Islands', 1995],
  ['Abhainn Dearg', 'Scotland', 'Islands', 2008],
  // Islay
  ['Laphroaig', 'Scotland', 'Islay', 1815],
  ['Lagavulin', 'Scotland', 'Islay', 1816],
  ['Ardbeg', 'Scotland', 'Islay', 1815],
  ['Bowmore', 'Scotland', 'Islay', 1779],
  ['Bruichladdich', 'Scotland', 'Islay', 1881],
  ['Bunnahabhain', 'Scotland', 'Islay', 1881],
  ['Caol Ila', 'Scotland', 'Islay', 1846],
  ['Kilchoman', 'Scotland', 'Islay', 2005],
  ['Port Ellen', 'Scotland', 'Islay', 1825],
  // Lowlands
  ['Auchentoshan', 'Scotland', 'Lowlands', 1823],
  ['Glenkinchie', 'Scotland', 'Lowlands', 1837],
  ['Bladnoch', 'Scotland', 'Lowlands', 1817],
  ['Rosebank', 'Scotland', 'Lowlands', 1840],
  ['Daftmill', 'Scotland', 'Lowlands', 2005],
  ['Annandale', 'Scotland', 'Lowlands', 2014],
  // Campbeltown
  ['Springbank', 'Scotland', 'Campbeltown', 1828],
  ['Glen Scotia', 'Scotland', 'Campbeltown', 1832],
  ['Kilkerran (Glengyle)', 'Scotland', 'Campbeltown', 2004],
  // Japan
  ['Yamazaki', 'Japan', 'Japan', 1923],
  ['Hakushu', 'Japan', 'Japan', 1973],
  ['Yoichi', 'Japan', 'Japan', 1934],
  ['Miyagikyo', 'Japan', 'Japan', 1969],
  ['Chichibu', 'Japan', 'Japan', 2008],
  ['Fuji', 'Japan', 'Japan', 1973],
  // Ireland
  ['Midleton', 'Ireland', 'Ireland', 1975],
  ['Bushmills', 'Ireland', 'Ireland', 1608],
  ['Cooley', 'Ireland', 'Ireland', 1987],
  ['Kilbeggan', 'Ireland', 'Ireland', 1757],
  ['Teeling', 'Ireland', 'Ireland', 2015],
  ['Dingle', 'Ireland', 'Ireland', 2012],
  ['Tullamore', 'Ireland', 'Ireland', 2014],
  // Wales
  ['Penderyn', 'Wales', 'Wales', 2000],
  ['Aber Falls', 'Wales', 'Wales', 2017],
  // England
  ['Cotswolds', 'England', 'England', 2014],
  ['The English Distillery', 'England', 'England', 2006],
  // USA
  ['Jack Daniel\'s', 'USA', 'USA', 1866],
  ['Maker\'s Mark', 'USA', 'USA', 1953],
  ['Four Roses', 'USA', 'USA', 1888],
  // Rest of the world
  ['Amrut', 'India', 'India', 1948],
  ['Kavalan', 'Taiwan', 'Taiwan', 2005],
  ['Sullivans Cove', 'Australia', 'Australia', 1994],
  ['Mackmyra', 'Sweden', 'Sweden', 1999]
];

// Common expression names offered as suggestions when adding a whisky.
window.EXPRESSIONS = [
  '10 Year Old', '12 Year Old', '14 Year Old', '15 Year Old', '16 Year Old',
  '18 Year Old', '21 Year Old', '25 Year Old', 'Cask Strength', 'Single Cask',
  'Sherry Cask', 'Bourbon Cask', 'Port Cask', 'Non-age statement', 'Independent bottling'
];
