"use strict";

const https = require('https');
const http = require('http');

var fs = require('fs');
var path = require('path');
var colors = require('colors/safe');



var configModule = require(__basedir + 'api/modules/configModule');

var stats = {
  // ShowUnusedDevices:false,
  // ShowUnusedPools:false,
  entries:{}
  
};

var interval=null;




function getStats(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(stats));
}


function getMinerStats(device) {
  
  var arr = device.hostname.split(":");
  switch(device.protocol){
    case "http":
      var req= http.request({
        host: arr[0],
        path: '/f_status.php?all=1',
	      method: 'GET',
        port: arr[1],
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }, function (response) {
        response.setEncoding('utf8');
        var body = '';

        response.on('data', function (d) {
          body += d;
        });
        response.on('end', function () {
          
          var parsed = null;
          

          try{
            parsed=JSON.parse(body);
            
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
            console.log(error);
          }
          if (parsed != null){
            if (parsed.status!==false){
              parsed.status.name=device.name;
              parsed.status.hostname=device.hostname;
              parsed.status.hashrate=device.hashrate;
              parsed.status.units=device.units;
              parsed.status.tmin=device.tmin;
              parsed.status.tmax=device.tmax;
              
              parsed.status.pools = [...parsed.status.pools];
              
              /*parsed.status.pools = [...parsed.status.pools].filter(function(item,i){
                return item.StratumActive
              });
              */
              // parsed.status.devs = [...parsed.status.devs];
              
              stats.entries[device.id]=parsed.status;
              // console.log(JSON.stringify(stats,null,2));
            }
          }
        });
      }).on("error", function(error) {
        console.log(colors.red("["+device.name+"] Error: Unable to deploy config"));
        console.log(error);
      });
      req.end();

      break;
    case "https":
      var req= https.request({
        host: arr[0],
        path: '/f_status.php?all=1',
        method: 'GET',
        port: arr[1],
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }, function (response) {
        response.setEncoding('utf8');
        var body = '';
        response.on('data', function (d) {
          body += d;
        });
        response.on('end', function () {
          
          var parsed = null;
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
            console.log(error);
          }
          if (parsed != null){
            if (parsed.status!==false){
              parsed.status.name=device.name;
              parsed.status.hostname=device.hostname;
              parsed.status.hashrate=device.hashrate;
              parsed.status.units=device.units;
              parsed.status.tmin=device.tmin;
              parsed.status.tmax=device.tmax;
              stats.entries[device.id]=parsed.status;
            }
            
          }
        });
      }).on("error", function(error) {
        console.log(colors.red("["+device.name+"] Error: Unable to deploy config"));
        console.log(error);
      });
      req.end();
      break;

      case "ClaymoreAPI":
      
      var net = require('net');
      // Create an empty object for stats data

      var body = {
	      "status":{
          "devs": [],
	        "pools": [],
	        "minerUp": true,
	        "minerDown": false, 
	        "dtot": [],	
	        "pi": [],
	        "uptime": 0,
          "time": 0
      }
    };
    // Sets default values
    body.status.name=device.name;
    body.status.hostname=device.hostname;
    body.status.hashrate=device.hashrate;
    body.status.units=device.units;
    body.status.tmin=device.tmin;
    body.status.tmax=device.tmax;
    body.status.time = Math.floor((new Date()-0)/1000);

    body.status.devs[0] = {
      LastShareTime:Math.floor((new Date()-0)/1000)-6*60+1,
      Algo: "Unknown",
      Temperature:0
     };

    body.status.dtot= {
      MHSav : 0,
      MHS5s : 0,
      devices : 0,
      HardwareErrors : 1,
      Rejected :1,
      TotalShares : 1
    };
    body.status.pi = {
      load: 0,
      uptime:0,
      temp:0
    };
   
    // End default values

    stats.entries[device.id]=body.status;

      var client = new net.Socket();
      
     
      client.on('error', function(error){
        console.log('An error occurred: '+ error);
        client.destroy();
      });
      
      client.setTimeout (configModule.config.RefreshStatsInterval*1000*0.4);
      
      client.on('timeout', function(){
        console.log('Timeout');
        client.destroy(); // kill client if server does not response
      });
      
      client.on('close', function() {
        console.log('Connection closed');
      });
      
      client.connect(arr[1],arr[0], function() {
          
        console.log('Connected');
          const a='{"id":1,"jsonrpc":"2.0","method":"miner_getstat2"}';
	        client.write(a);
        });
      
      

      client.on('data', function(data){
	      //console.log('Received: ' + data);
	      client.destroy(); // kill client after server's response
	      data=JSON.parse(data);
	     
		    //Start body.devs
        var _devs = (data.result[3]+';'+data.result[5]).split(";");
        var _devs_temp=(data.result[6]+";"+data.result[6]).split(";");

        var _devs_accepted=(data.result[9]+";"+data.result[12]).split(";");
        var _devs_rejected=(data.result[10]+";"+data.result[13]).split(";");
        var max_temp=-99;
        //Как-то неправильно поступаю с определением _devs_algo_1
        var _devs_algo_1 = data.result[3].split(";").map(function(name) {return 'ETH';});
        var _devs_algo_2 = data.result[3].split(";").map(function(name) {return '2ndAlgo';});
        
        var _devs_algo=_devs_algo_1.concat(_devs_algo_2);
        
        var pools=(data.result[7]).split(';');
        
        pools=(Object.keys(pools).length ==1 ? pools.concat('2ndAlgo'): pools);
        
        

        _devs.forEach(function(item,i){
          body.status.devs[i]={
            "ASC": i,
            "Name": data.result[0],
            "ID": i,
            "Enabled": (item==='off'? "No":"Y"),
            "Status": (item==='off'? 'Not used': "Alive"),
            "Temperature": _devs_temp[2*i],
            "MHSav": (item==='off'? 0: item/1000),
            "MHS5s": (item==='off'? 0: item/1000),
            "Accepted": parseInt(_devs_accepted[i]),
            "Rejected": parseInt(_devs_rejected[i]),
            "HardwareErrors": 0,
            "Utility": "???",
            "LastSharePool": "???",
            "LastShareTime": (item==='off' ? 0 : Math.floor((new Date()-0)/1000)),
            "TotalMH": (item==='off'? '0': item),
            "Diff1Work": "???",
            "DifficultyAccepted": "???",
            "DifficultyRejected": "???",
            "LastShareDifficulty": "???",
            "NoDevice": false,
            "LastValidWork": (item==='off'? 0:Math.floor((new Date()-0)/1000)),
            "DeviceHardware%": 0,
            "DeviceRejected%": (parseInt(_devs_accepted[i])===0 ? 0 : 100*parseInt(_devs_rejected[i])/parseInt(_devs_accepted[i])).toFixed(4),
            "DeviceElapsed": "???",
            "Chips": 1,
            "Clock": 100,
            "Algo": _devs_algo[i],
            "TotalShares": _devs_accepted[i]-_devs_rejected[i]
          };
        max_temp=max_temp > _devs_temp[2*i] ? max_temp : _devs_temp[2*i];
    
        });
        
        //End body.devs
    
        //Start body.dtot
        body.status.dtot= {
          "devices": body.status.devs.length,
          "MHS5s": (parseInt(data.result[2].split(";")[0])+parseInt(data.result[4].split(";")[0]))/1000,
          "MHSav": (parseInt(data.result[2].split(";")[0])+parseInt(data.result[4].split(";")[0]))/1000,
          "KHS5s": "",
          "KHSav": "",
          "Accepted": parseInt(data.result[2].split(";")[1])+parseInt(data.result[4].split(";")[1]),
          "Rejected": parseInt(data.result[2].split(";")[2])+parseInt(data.result[4].split(";")[2]),
          "HardwareErrors": 0,
          "TotalShares":1,
          "Utility": 0,
      
        };
    
        body.status.dtot.TotalShares = body.status.dtot.Accepted+body.status.dtot.Rejected;
        //End body.dtot
    
        //Start body.pools
        
        
        pools.forEach(function(item,i){
        body.status.pools[i]={
          "POOL": i,
          "Name": item,
          "URL": item,
          "Profile": "",
          "Algorithm": (i===0 ? "ETH" : "2ndAlgo"),
          "AlgorithmType": (i===0 ? "ETH" : "2ndAlgo"),
          "Description": "",
          "Status": (_devs[i*_devs.length-1]==="off" ? "Dead" :"Alive"),
          "Priority": i,
          "Quota": 1,
          "LongPoll": "N",
          "Getworks": "???",
          "Accepted": parseInt(data.result[2*i+2].split(";")[1]),
          "Rejected": parseInt(data.result[2*i+2].split(";")[2]),
          "Works": "???",
          "Discarded": 0,
          "Stale": "???",
          "GetFailures": 0,
          "RemoteFailures": 0,
          "User": item + ".Unknown",
          "LastShareTime": (_devs[i*_devs.length-1]==="off" ? 0 :Math.floor((new Date()-0)/1000)),
          "Diff1Shares": 0,
          "ProxyType": "",
          "Proxy": "",
          "DifficultyAccepted": "???",
          "DifficultyRejected": "???",
          "DifficultyStale": "???",
          "LastShareDifficulty": "???",
          "HasStratum": true,
          "StratumActive": (_devs[i*_devs.length-1]==="off" ? false : true),
          "StratumURL": item,
          "HasGBT": false,
          "BestShare": "???",
          "PoolRejected%": 100*parseInt(data.result[2*i+2].split(";")[2])/parseInt(data.result[2*i+2].split(";")[1]),
          "PoolStale%": "???"
          };
        });
  
  
        //console.log(body.pools);
        //End body.pools
        //Start body.pi
        body.status.pi = {
          "load": "???",
          "uptime": data.result[1]*60,
          //"temp": Math.max.apply(null,_devs_temp),
           "temp": max_temp
        };
  
        //console.log(body.pi);
        //End body.pi
        body.status.minerUp = true;
        body.status.minerDown = false;
        body.status.uptime = body.status.pi.uptime;
        body.status.time = Math.floor((new Date()-0)/1000);
        
        var parsed = null;
        parsed=body;
        //console.log(JSON.stringify(parsed,2,null))
        
        if (parsed != null){
          if (parsed.status!==false){
            /*parsed.status.name=device.name;
            parsed.status.hostname=device.hostname;
            parsed.status.hashrate=device.hashrate;
            parsed.status.units=device.units;
            parsed.status.tmin=device.tmin;
            parsed.status.tmax=device.tmax;
            */
            stats.entries[device.id]=parsed.status;
          }
          
        }

     

      

      });
      break;

  };
}

function getAllMinerStats(){
  
  stats = {
    // ShowUnusedDevices:configModule.config.ShowUnusedDevices,
    // ShowUnusedPools:configModule.config.ShowUnusedPools,
    entries:{}
    
  };
  //console.log(stats.ShowUnusedDevices,configModule.config.ShowUnusedDevices);

  for(var i=0;i<configModule.config.devices.length;i++){
    
    
    var device=configModule.config.devices[i];
    
    if (device.enabled){
    (function(device){
      getMinerStats(JSON.parse(JSON.stringify(device)));
    })(device);
  }
  
  }
    
  
}

function restartInterval(){
  if (interval!==null)
    clearInterval(interval);
  // if (configModule.config.statsEnabled) {
    // interval = setInterval(getAllMinerStats, 10*1000);
    interval = setInterval(getAllMinerStats, configModule.config.RefreshStatsInterval*1000);
  //  }
}

function init() {
  //  if (configModule.config.statsEnabled){
    getAllMinerStats();
    interval=setInterval(getAllMinerStats,configModule.config.RefreshStatsInterval*1000);
    
  //  }
}

setTimeout(init, 1000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
