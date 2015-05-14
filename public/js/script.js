var myTurn = false, socket;
$(document).ready(function(){
	socket = io();
	socket.on("your turn", function(data){
		myTurn = true;
		attachListeners();
		$("#notify").text("Your move");
	});
	socket.on("not your turn", function(data){
		myTurn = false; 
		detachListeners();
		$("#notify").text("Waiting for opponent to move");
	});
	socket.on("fill square", function(data){
		$(".square[data-x='" + data.x + "'][data-y='"+data.y+"']").text(data.type);
	});
	socket.on("opponent disconnected", function(data){
		clearBoard();
		$("#notify").text("Opponent disconnected");
		alert("Opponent disconnected, Ready for new game?");
		socket.emit("ready");
	});
	socket.on("winner", function(){
		$("#notify").text("You win!");
		clearBoard();
	});
	socket.on("loser", function(){
		$("#notify").text("You lose!");
		clearBoard();
	});
	socket.on("draw", function(){
		$("#notify").text("A draw!");
		clearBoard();
	});
	socket.on("paused", function(){
		alert("Ready?");
		socket.emit("ready");
	});
	socket.on("looking for opponent", function(){
		$('#notify').text("looking for opponent");
	});
});

function clearBoard(){
	$(".square").addClass("empty");
	$(".square").text('');
}

function clickedSquare(){
	socket.emit("clicked", {
		x: $(this).data('x'),
		y: $(this).data('y')
	});
}

function attachListeners(){
	$(".square.empty").on("click", clickedSquare);
	$("#board").addClass("enabled");
}

function detachListeners(){
	$(".square").off("click");
	$("#board").removeClass("enabled");
}