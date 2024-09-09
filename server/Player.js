import Sprite from "../js/Sprite.js";
import { Body } from '../js/Physics.js';
import { MAX_BUFFER_SIZE } from '../js/CommandTypes.js';
import CircularArray from '../js/CircularArray.js';
import { MaxSpeed, MaxTimeBuffer } from "../js/Configuration.js";
import Vector2 from "../js/Vector2.js";
import Accumulator from "../js/Accumulator.js";

export default class Player extends Sprite {
    constructor(scene, x, y, width, height) {
        super(scene, x, y, width, height);
        this.name = '';
        this.lastReceivedFrame = this.lastProcessedFrame = 0;
        this.id = -1;
        this.buffer = new CircularArray(MAX_BUFFER_SIZE);
        this.body = new Body(this);
        this.temp = new Vector2(0, 0);
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.lags = new Accumulator(MaxTimeBuffer);
        this.offsets = new Accumulator(MaxTimeBuffer);
        this.isDisconnected = false;
    }

    update(time, delta) {
        const { body, temp: temp } = this;
        const { left, right, down, up } = this.scene.inputs;

        temp.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        temp.setLength(MaxSpeed);
        body.velocity.set(temp.x, temp.y);
        body.update(time, delta);
    }

    computeTick() {
        const lag = (this.t4 - this.t1) - (this.t3 - this.t2) / 2;
        const offset = (this.t2 - this.t4) + (this.t3 - this.t1);

        this.lags.add(lag);
        this.offsets.add(offset);

        this.t1 = this.t2 = this.t3 = this.t4 = 0;
    }

    averageLag() {
        return this.lags.average();
    }

    averageOffset() {
        return this.offsets.average();
    }

    disconnect() {
        this.isDisconnected = true;
        this.lastReceivedFrame = this.lastProcessedFrame = 0;
        this.body.velocity.set(0, 0);
    }
}