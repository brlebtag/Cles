import { GameUpdateFPS, GameUpdateRate } from "../js/Configuration.js";
const MinFPS = 5;
const DeltaSmoothingMax = 10;
const MinFrameRate = 1000 / MinFPS;

export default class TimeStep {
    constructor() {
        this.started = false;
        this.running = false;
        this.actualFps = GameUpdateFPS;
        this.nextFpsUpdate = 0;
        this.framesThisSecond = 0;
        this.deltaHistory = new Array(DeltaSmoothingMax);
        this.time = 0;
        this.startTime = 0;
        this.delta = 0;
        this.deltaIndex = 0;
        this.lastTime = 0;
        this.frame = 0;
        this.rawDelta = 0;
        // https://github.com/phaserjs/phaser/blob/v3.80.0/src/core/TimeStep.js
    }

    start(callback) {
        this.started = true;
        this.running = true;

        for (var i = 0; i < DeltaSmoothingMax; i++) {
            this.deltaHistory[i] = GameUpdateRate;
        }

        this.resetDelta();

        this.startTime = performance.now();

        this.callback = callback;
        
        this.timer = setInterval(() => this.step(performance.now()), GameUpdateRate);
    }

    resetDelta() {
        let now = performance.now();
        this.time = now;
        this.lastTime = now;
        this.nextFpsUpdate = now + 1000;
        this.framesThisSecond = 0;

        for (var i = 0; i < DeltaSmoothingMax; i++) {
            this.deltaHistory[i] = Math.min(GameUpdateRate, this.deltaHistory[i]);
        }

        this.delta = 0;
        this.deltaIndex = 0;
    }

    smoothDelta(delta) {
        let idx = this.deltaIndex;
        let history = this.deltaHistory;

        if (delta > MinFrameRate)
        {
            //  Probably super bad start time or browser tab context loss,
            //  so use the last 'sane' delta value

            delta = history[idx];

            //  Clamp delta to min (in case history has become corrupted somehow)
            delta = Math.min(delta, MinFrameRate);
        }

        //  Smooth out the delta over the previous X frames

        //  add the delta to the smoothing array
        history[idx] = delta;

        //  adjusts the delta history array index based on the smoothing count
        //  this stops the array growing beyond the size of deltaSmoothingMax
        this.deltaIndex++;

        if (this.deltaIndex >= DeltaSmoothingMax)
        {
            this.deltaIndex = 0;
        }

        //  Loop the history array, adding the delta values together
        var avg = 0;

        for (var i = 0; i < DeltaSmoothingMax; i++)
        {
            avg += history[i];
        }

        //  Then divide by the array length to get the average delta
        avg /= DeltaSmoothingMax;

        return avg;
    }

    step(time) {
        this.now = time;

        //  delta time (time is in ms)
        //  Math.max because Chrome will sometimes give negative deltas
        var delta = Math.max(0, time - this.lastTime);

        this.rawDelta = delta;

        //  Real-world timer advance
        this.time += this.rawDelta;

        // if (this.smoothStep)
        // {
            delta = this.smoothDelta(delta);
        //}

        //  Set as the world delta value (after smoothing, if applied)
        this.delta = delta;

        if (time >= this.nextFpsUpdate)
        {
            this.updateFPS(time);
        }

        this.framesThisSecond++;

        this.callback(time, delta);

        //  Shift time value over
        this.lastTime = time;

        this.frame++;
    }

    updateFPS(time) {
        this.actualFps = 0.25 * this.framesThisSecond + 0.75 * this.actualFps;
        this.nextFpsUpdate = time + 1000;
        this.framesThisSecond = 0;
    }

    stop() {
        this.running = false;
        this.started = false;
        clearInterval(this.timer);
        return this;
    }
}