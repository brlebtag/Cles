export default class PositionAccumulator {
    constructor(size) {
        this.positions = new Array(size);
        this.index = 0;
        this.first = true;
        this.previous = this.next = null;

        for (let i = 0; i < size; i++) {
            this.positions[i] = new Phaser.Math.Vector2(0, 0);
            this.positions[i].time = 0;
        }
    }

    add(x, y, time) {
        const index = this.index;
        const positions = this.positions;
        const len = positions.length;

        if (this.first) {
            for (let i = 0; i < len; i++) {
                positions[0].x = x;
                positions[0].y = y;
                positions[0].time = time;
            }

            this.first = false;
        }

        positions[index].x = x;
        positions[index].y = y;
        positions[index].time = time;

        this.index++;

        if (this.index >= len) {
            this.index = 0;
        }
    }

    straddle(time) {
        const positions = this.positions;
        const len = positions.length;
        let next = this.index;
        let prev = next - 1;
        if (prev < 0) prev = len - 1;

        for (let i = 0; i < len; i++) {
            if (positions[prev].time < time) {
                this.previous = positions[prev];
                this.next = positions[next];
                return this;
            }

            next = next - 1;
            prev = next - 1;

            if (next < 0) {
                next = len - 1;
            }

            if (prev < 0) {
                prev = len - 1;
            }
        }

        this.previous = this.next = null;
        return this;
    }
}