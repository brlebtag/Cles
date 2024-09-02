import Sprite from "./Sprite";
import { Body } from '../js/Physics';
import { MAX_BUFFER_SIZE } from '../js/CommandTypes.js';
import CircularArray from '../js/CircularArray.js';
import { MaxSpeed } from "../js/Configuration.js";

const MaxBuffer = 10;

export default class Player extends Sprite {
    constructor(scene, x, y, width, height) {
        super(scene, x, y, width, height);
        this.name = '';
        this.lastProcessedFrame = this.lastFrame = this.id = -1;
        this.buffer = new CircularArray(MAX_BUFFER_SIZE);
        this.body = new Body(this);
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.lags = new Array(MaxBuffer).fill(0);
        this.lagIndex = 0;
        this.offsets = new Array(MaxBuffer).fill(0);
        this.offsetIndex = 0;
        this.tempVet = new Phaser.Math.Vector2(0, 0);
    }

    update(delta) {
        const { body, tempVet } = this;
        const { left, right, down, up } = this.scene.inputs;

        tempVet.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        tempVet.setLength(MaxSpeed);
        body.setVelocity(tempVet.x, tempVet.y);
        body.update(delta);
    }

    addNewLag(lag) {
        this.lags[this.lagIndex++] = lag;

        if (this.lagIndex > MaxBuffer) {
            this.lagIndex = 0;
        }
    }

    addNewOffset() {
        this.offsets[this.lagIndex++] = lag;

        if (this.offsetIndex > MaxBuffer) {
            this.offsetIndex = 0;
        }
    }

    averageLag() {
        let sum = 0;
        for(let i = 0; i < MaxBuffer; i++) {
            sum += this.offsets[i];
        }
        return sum / MaxBuffer;
    }

    averageOffset() {
        let sum = 0;
        for(let i = 0; i < MaxBuffer; i++) {
            sum += this.addNewOffset[i];
        }
        return sum / MaxBuffer;
    }
}