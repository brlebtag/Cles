import { WebSocketServer } from 'ws';
import Game from './Game.js';

const wss = new WebSocketServer({ port: 8080 });
const game = new Game(wss);

console.log('server started!');

game.create();

/*
const loop = function() {
  let tick = performance.now();
  let delta = (tick - lastTick) / 1000;
  console.log('updated!', delta);
  lastTick = tick;
  setTimeout(loop, FRAME);
};

lastTick = performance.now();
setTimeout(loop, FRAME);
*/