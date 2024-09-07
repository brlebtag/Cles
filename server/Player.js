import Sprite from "../js/Sprite.js";
import { Body } from '../js/Physics.js';
import { MAX_BUFFER_SIZE } from '../js/CommandTypes.js';
import CircularArray from '../js/CircularArray.js';
import { MaxSpeed, MaxTimeBuffer } from "../js/Configuration.js";
import Vector2 from "../js/Vector2.js";

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
        this.lags = new Array(MaxTimeBuffer).fill(0);
        this.lagIndex = 0;
        this.offsets = new Array(MaxTimeBuffer).fill(0);
        this.offsetIndex = 0;
        this.firstTimeSync = true;
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

        if (this.firstTimeSync) {
            const lags = this.lags;
            const offsets = this.offsets;
            
            for (let i = 0; i < MaxTimeBuffer; i++) {
                lags[i] = lag;
                offsets[i] = offset;
            }

            this.firstTimeSync = false;
        }

        this.lags[this.lagIndex++] = lag;

        if (this.lagIndex > MaxTimeBuffer) {
            this.lagIndex = 0;
        }

        this.offsets[this.lagIndex++] = offset;

        if (this.offsetIndex > MaxTimeBuffer) {
            this.offsetIndex = 0;
        }

        this.t1 = this.t2 = this.t3 = this.t4 = 0;
    }

    averageLag() {
        let sum = 0;
        for(let i = 0; i < MaxTimeBuffer; i++) {
            sum += this.lags[i];
        }
        return sum / MaxTimeBuffer;
    }

    averageOffset() {
        let sum = 0;
        for(let i = 0; i < MaxTimeBuffer; i++) {
            sum += this.offsets[i];
        }
        return sum / MaxTimeBuffer;
    }
}