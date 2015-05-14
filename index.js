var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('underscore');

var players = [];

app.use(express.static('public'));

io.on('connection', function(socket){
	var player = {
		socket: socket,
		id: players.length
	};
	console.log(player.id + " joined");
	players.push(player);
	player.status = "paused";
	player.socket.emit("paused");
 
  	player.socket.on("disconnect", function(){
		if(typeof player.game !== "undefined"){
  			player.opponent.status = "paused";
  			player.opponent.socket.emit("opponent disconnected");
  			console.log(player.id + " left");

  			//remove player from players array
  			var index = players.indexOf(player);
			if(index != -1){
				players.splice(index, 1);
			}
  		}
  	});
  	player.socket.on("clicked", function(data){
  		console.log(player.game.squares);
  		console.log(data);
  		if(typeof player.game.currentTurn !== "undefined" 
  			&& player.game.currentTurn.id === player.id 
  			&& player.game.squares[data.x][data.y] === ''){
  				player.socket.emit("fill square", {
  					x: data.x,
  					y: data.y,
  					type: player.piece,
  					other: 'other'
  				});
		  		player.opponent.socket.emit("fill square", {
		  			x: data.x,
		  			y: data.y,
		  			type: player.piece,
		  			other: 'other'
		  		});
		  		player.socket.emit("not your turn", {});
		  		player.opponent.socket.emit("your turn", {});
		  		player.game.squares[data.x][data.y] = player.id;
		  		player.game.currentTurn = player.opponent;
		  		player.game.moves++;
		  		checkForWin(player.game, {x: data.x, y: data.y, type: player.id});
  		}
  });
  player.socket.on('ready', function(data){
  	if(player.status == "paused"){
	  	player.status = "waiting";
	  	matchPlayers(player, players);
  	}
  });
});

function checkForWin(game, data){
	//takes at least 5 moves for anyone to have won
	if(game.moves < 5){
		return;
	}
	var winner = '';
	//check for column like:
	// + _ _ 
	// + _ _ 
	// + _ _ 
	for(i=0;i<3;i++){
		if(game.squares[data.x][i] !== data.type ){
			break;
		}
		if(i == 2){
			winner = data.type;
		}
	}
	//check for row like:
	// + + +
	// _ _ _
	// _ _ _
	if(winner === ''){
		for(i=0;i<3;i++){
			if(game.squares[i][data.y] !== data.type ){
				break;
			}
			if(i == 2){
				winner = data.type;
			}
		}
	}
	//check for: 
	// + _ _
	// _ + _
	// _ _ +
	if(winner === '' && data.x === data.y){
		for(i=0; i<3; i++){
			if(game.squares[i][i] !== data.type){
				break;
			}
			if(i == 2){
				winner = data.type;
			}
		}
	}
	//check for:
	// _ _ +
	// _ + _
	// + _ _
	if(winner === '' && data.x === (2 - data.y)){
		for(i=0;i<3;i++){
			if(game.squares[i][2-i] !== data.type){
				break;
			}
			if(i == 2){
				winner = data.type;
			}
		}
	}
	//winner found? tell the players
	if(winner !== ''){
		for(id in game.players){
			if(game.players[id].id === data.type){
				game.players[id].socket.emit("winner");
				game.players[id].opponent.socket.emit("loser");
			}
		}
		game.players[0].status = "paused";
		game.players[1].status = "paused";
		pausePlayer(game.players[0]);
		pausePlayer(game.players[1]);
	//no moves left? Tell the players
	} else if(game.moves === 9){
		game.players[0].socket.emit("draw");
		game.players[1].socket.emit("draw");
		pausePlayer(game.players[0]);
		pausePlayer(game.players[1]);
	}
}

function pausePlayer(player){
	player.status = "paused";
	player.socket.emit('paused');
}

function matchPlayers(curPlayer, players){
	if(curPlayer.status !== "waiting"){
		return;
	}
	curPlayer.socket.emit("looking for opponent");
	var player = _.find(players, function(plyr){ 
		return plyr !== curPlayer && plyr.status === "waiting"; 
	});

	if(typeof player === "undefined"){
		return;
	}
	
	player.opponent = curPlayer;
	player.status = "playing";

	curPlayer.opponent = player;
	curPlayer.status = "playing";

	startGame(player, curPlayer);
}

function startGame(player1, player2){
	var game = {
		players: [player1, player2],
		state: "Started",
		squares: {
			0: {
				0: '',
				1: '',
				2: ''
			},
			1: {
				0: '',
				1: '',
				2: ''
			},
			2: {
				0: '',
				1: '',
				2: ''
			}
		},
		moves: 0,
		currentTurn: player1
	}
	player1.game = game;
	player2.game = game;

	if(Math.random() >= 0.5){
		player1.socket.emit("not your turn");
		player1.piece = 'O';
		player2.socket.emit("your turn");
		player2.piece = 'X';
		game.currentTurn = player2;
	} else {
		player1.socket.emit("your turn");
		player1.piece = 'X';
		player2.socket.emit("not your turn");
		player2.piece = 'O';
		game.currentTurn = player1;
	}
	console.log("game starting between " + player1.id + " (" + player1.piece + ") and " + player2.id + " (" + player2.piece + ") , " + game.currentTurn.id + " to start.");
}

http.listen(8080, function(){ console.log("ready!")});
