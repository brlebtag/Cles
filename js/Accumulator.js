export default class Accumulator {
    constructor(size) {
        this.data = new Array(size);
        this.firstTime = true;
        this.index = 0;
    }

    add(value) {
        const data = this.data;
        const len = data.length;

        if (this.firstTime) {
            this.firstTime = false;

            for(let i = 0; i <len; i++) {
                data[i] = value;
            }
            return;
        }

        data[this.index++] = value;

        if (this.index >= len) {
            this.index = 0;
        }
    }

    average() {
        let mean = 0;
        const data = this.data;
        const len = data.length;

        for(let i = 0; i < len; i++) {
            mean += data[i];
        }

        return mean / len;
    }

    clear() {
        this.firstTime = true;
    }
};