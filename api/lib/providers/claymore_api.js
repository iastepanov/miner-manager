//Get stats data from Claymore API
//parameters: ipadress, port
//

module.exports.getMinerStatsAPI=function (ip,port){
var net = require('net');
// Create an empty object for stats data

var body = {
	"devs": {},
	"pools": {},
	"minerUp": true,
	"minerDown": false, 
	"dtot": {},	
	"pi": {},
	"uptime": 0,
    "time": 0
};

console.log(ip+':'+port);

var client = new net.Socket();


client.connect(3333,'192.168.10.109', function() {
    console.log('Connected');
    const a='{"id":1,"jsonrpc":"2.0","method":"miner_getstat2"}';
	client.write(a);
});

client.on('data', function(data){
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
	data=JSON.parse(data);
	console.log();
	
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
	
	_devs.forEach(function(item,i) 
	{
		body.devs[i]={
		  "ASC": i,
          "Name": data.result[0],
          "ID": i,
          "Enabled": (item==='off'? "No":"Y"),
          "Status": (item==='off'? 'Not used': "Alive"),
          "Temperature": _devs_temp[2*i],
          "MHSav": (item==='off'? '0': item),
          "MHS5s": (item==='off'? '0': item),
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
	
	
	//};
	//console.log(body.devs);	
	//End body.devs
	
	//Start body.dtot
	body.dtot= {
        "devices": _devs.length,
        "MHS5s": parseInt(data.result[2].split(";")[0])+parseInt(data.result[4].split(";")[0]),
        "MHSav": parseInt(data.result[2].split(";")[0])+parseInt(data.result[4].split(";")[0]),
        "KHS5s": "",
        "KHSav": "",
        "Accepted": parseInt(data.result[2].split(";")[1])+parseInt(data.result[4].split(";")[1]),
        "Rejected": parseInt(data.result[2].split(";")[2])+parseInt(data.result[4].split(";")[2]),
        "HardwareErrors": 0,
        "Utility": 0,
		
	};
	
	body.dtot.TotalShares = body.dtot.Accepted+body.dtot.Rejected;
	//End body.dtot
	
	//Start body.pools
	pools=data.result[7].split(";");
	
	pools.forEach(function(item,i)
	{
		body.pools[i]={
		  "POOL": i,
          "Name": item,
          "URL": item,
          "Profile": "",
          "Algorithm": (i===0 ? "ETH" : "2ndAlgo"),
          "AlgorithmType": (i===0 ? "ETH" : "2ndAlgo"),
          "Description": "",
          "Status": (_devs[i*_devs.length]==="off" ? "Dead" :"Alive"),
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
          "LastShareTime": (_devs[i*_devs.length]==="off" ? 0 :Math.floor((new Date()-0)/1000)),
          "Diff1Shares": 0,
          "ProxyType": "",
          "Proxy": "",
          "DifficultyAccepted": "???",
          "DifficultyRejected": "???",
          "DifficultyStale": "???",
          "LastShareDifficulty": "???",
          "HasStratum": true,
          "StratumActive": (_devs[i*_devs.length]==="off" ? false : true),
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
	body.pi = {
		"load": "???",
        "uptime": data.result[1]*60,
		//"temp": Math.max.apply(null,_devs_temp),
		"temp": max_temp
	};

	console.log(body.pi);
	//End body.pi
	body.minerUp = true;
	body.minerDown = false;
	body.uptime = body.pi.uptime;
	body.time = Math.floor((new Date()-0)/1000);

	
	//console.log(JSON.stringify(stats,null,2));

	/*a=data.result[7];
	b=a.split(';');
	console.log(b[0]);
	*/
});

client.on('close', function() {
	console.log('Connection closed');
});

client.on('error', function(){
console.log('An error occurred: ', error);
});
console.log('ggg');
return JSON.stringify(body);
}


