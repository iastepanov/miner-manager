'use strict';

var colors = require('colors/safe');
var fs = require('fs');

var configPath="data/settings.json";

if (!fs.existsSync("data")){
  fs.mkdirSync("data");
}
var config = module.exports = {
  config: {
    entries:[],
    groups:[],
    devices:[],
    profitabilityServiceUrl:null,
    deployOnStartup:null,
    autoswitchInterval:3,
    RefreshStatsInterval:10,
    statsEnabled:null
  },
  configNonPersistent:{
    protocols:[
      "http",
      "https",
      "ClaymoreAPI"
    ],
    algos:[
      "x11",
      "lbry",
      "pascal",
      "blake256r8",
      "quark",
      "qubit",
      "ethash",
      "myriad-groestl",
      "nist5",
      "X11gost",
      "skein",
      "decred"
    ],
    regions:[
      "eu",
      "usa",
      "hk",
      "jp",
      "br"
    ]
  },
  getConfig: function () {
    var obj=config.config;
    obj.algos=config.configNonPersistent.algos;
    obj.protocols=config.configNonPersistent.protocols;
    obj.regions=config.configNonPersistent.regions;
    return obj;
  },
  setConfig: function (newConfig) {
    delete newConfig.algos;
    delete newConfig.protocols;
    delete newConfig.regions;
    config.config = newConfig;
  },
  saveConfig: function () {
    console.log(colors.grey("writing config to file.."));
    fs.writeFile(configPath, JSON.stringify(config.config,null,2), function (err) {
      if (err) {
        return console.log(err);
      }
    });
  },
  loadConfig: function () {
    fs.stat(configPath, function (err, stat) {
      if (err == null) {
        fs.readFile(configPath, 'utf8', function (err, data) {
          if (err) throw err;
          config.config = JSON.parse(data);
          if(config.config.deployOnStartup===undefined)
            config.config.deployOnStartup=false;
          if(config.config.autoswitchInterval===undefined)
            config.config.autoswitchInterval=3;
              
          if(config.config.RefreshStatsInterval===undefined)
            config.config.RefreshStatsInterval=10;  

            if(config.config.statsEnabled===undefined)
            config.config.statsEnabled=true;

        });
      } else if (err.code == 'ENOENT') {
        //default conf
        config.config.deployOnStartup=false;
        config.config.statsEnabled=true;
        config.config.autoswitchInterval=3;
        config.config.RefreshStatsInterval=10;
        config.saveConfig();
        setTimeout(function(){
          config.loadConfig();
        },500);
      }
    });
  }
};
console.log("initializing, please wait...");
config.loadConfig();
