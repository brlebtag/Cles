import Sprite from "../js/Sprite.js";
import { Body } from '../js/Physics.js';
import CircularArray from '../js/CircularArray.js';
import { MaxSpeed, MaxTimeSyncSamples, MaxCommandsSize } from "../js/Configuration.js";
import Vector2 from "../js/Vector2.js";
import Accumulator from "../js/Accumulator.js";

export const PLAYER_DISCONNECTED_STATE = 0;
export const PLAYER_PLAYING_STATE = 1;
export const PLAYER_RESYNCING_STATE = 2;


export default class Player extends Sprite {
    constructor(scene, x, y, width, height) {
        super(scene, x, y, width, height);
        this.name = '';
        this.lastReceivedFrame = this.lastProcessedFrame = 0;
        this.id = -1;
        this.commands = new CircularArray(MaxCommandsSize);
        this.body = new Body(this);
        this.temp = new Vector2(0, 0);
        this.t1 = this.t2 = this.t3 = this.t4 = 0;
        this.lags = new Accumulator(MaxTimeSyncSamples);
        this.offsets = new Accumulator(MaxTimeSyncSamples);
        this.color = 0xFFFFFF;
        this.dirty = true;
        this.state = PLAYER_DISCONNECTED_STATE;
        this.lastClientUpdate = performance.now();
        this.emptyCommandsTrys = 0;
    }

    update(time, delta) {
        const { body, temp } = this;
        const { left, right, down, up } = this.scene.inputs;

        temp.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        temp.setLength(MaxSpeed);
        body.velocity.set(temp.x, temp.y);
        body.update(time, delta);

        this.dirty =
            body.position.x !== body.prevPosition.x && 
            body.position.y !== body.prevPosition.y
            ;
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
        this.state = PLAYER_DISCONNECTED_STATE;
        this.resync();    
    }

    resync() {
        this.lastReceivedFrame = this.lastProcessedFrame = 0;
        this.commands.reset();
        this.commands.clear();
    }

    playing() {
        this.state = PLAYER_PLAYING_STATE;
    }

    resyncing() {
        this.state = PLAYER_RESYNCING_STATE;
    }
}