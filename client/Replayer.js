import Character from "./Character.js";
import PositionAccumulator from "./PositionAccumulator.js";
import { ReplayerType } from "../js/Configuration.js";

const MaxKnownPositions = 120;
const MaxInterpolationTime = 100/*ms*/;

export default class Replayer extends Character {
    constructor(scene, x, y, texture, time) {
        super(scene, x, y, texture);
        const body = this.body;
        body.position.x = x - this.displayOriginX;
        body.position.y = y - this.displayOriginY;
        body.prevPosition.copy(body.position);
        this.positions = new PositionAccumulator(MaxKnownPositions);
        this.type = ReplayerType;
    }

    update(time, delta, serverTime, avgLag) {
        // console.log(serverTime);

        serverTime -= MaxInterpolationTime;
        const {previous, next} = this.positions.straddle(serverTime);

        if (previous === null) {
            this.anims.play('stop');
            return;
        }

        const divisor = serverTime - previous.time;
        const quotient = next.time - previous.time;
        // const perc = quotient == 0 ? 0 : (divisor / quotient);

        const pos = Phaser.Math.LinearXY(previous, next, quotient == 0 ? 0 : (divisor / quotient)); // checar isso aqui!
        this.x = pos.x;
        this.y = pos.y;

        // console.log(previous.time, serverTime, next.time, perc, previous.x, previous.y, '->', this.x, this.y, '->', next.x, next.y);

        // sync physics engine!
        const body = this.body;
        body.prevPosition.copy(body.position);
        body.position.x = pos.x - this.displayOriginX;
        body.position.y = pos.y - this.displayOriginY;
        body.velocity.copy(body.position);
        body.velocity.subtract(body.prevPosition);

        const velocity = body.velocity.length();

        if (velocity > 0) {
            this.anims.play(`walking-${this.getFace(body.velocity)}`, true);
        } else {
            this.anims.play('stop');
        }

        this.updateNameTag();
    }

    addKnownPosition(x, y, time) {
        this.positions.add(x, y, time);
    }
}