import { Body } from "../js/Physics.js";
import Sprite from "./Sprite.js";

const scene = {};

const sprite = new Sprite(scene, 0, 0, 100, 100);
sprite.body = new Body(sprite);
console.log(sprite.x, sprite.y, sprite.body.position.x, sprite.body.position.y);
sprite.body.update(0, ((1000/60)/1000));

for(let i = 0; i<10; i++) {
sprite.body.update(0, ((1000/60)/1000));
console.log(sprite.x, sprite.y, sprite.body.position.x, sprite.body.position.y);
}