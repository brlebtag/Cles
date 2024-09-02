import { Body } from "../js/Physics";
import { MaxSpeed } from "../js/Configuration.js";

const MaxKnownPositions = 10;

export default class Replayer extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.body = new Body(scene, this);
        this.lastKnownPositions = new Array(MaxKnownPositions);
        this.lastKnownPositionIndex = 0;

        for (let i =0; i < MaxKnownPositions; i++) {
            this.lastKnownPositions[i] = new Phaser.Math.Vector2(x, y);
            this.lastKnownPositions[i].time = 0;
        }
    }

    update(delta) {
        this.body.update(delta);
    }

    addKnownPosition(x, y, time) {
        const lastKnownPosition = this.lastKnownPositions[this.lastKnownPositionIndex++];
        lastKnownPosition.x = x;
        lastKnownPosition.y = y;
        lastKnownPosition.time = time;

        if (this.lastKnownPositionIndex > MaxKnownPositions) {
            this.lastKnownPositionIndex = 0;
        }
    }
}