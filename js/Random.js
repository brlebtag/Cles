const m = 4294967296;
const c = 1013904223;
const a = 1664525;

export function nextInteger(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function nextFloat(min, max) {
    return Math.random() * (max - min) + min;
}

export function nextValue() {
    return Math.random();
}

export class Random {
    constructor(s) {
        this.seed = s >>> 0;
    }

     nextValue() {
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;     
    }

    nextInteger(min, max) {
        return Math.floor(this.nextValue() * (max - min)) + min;
    }
    
    nextFloat(min, max) {
        return this.nextValue() * (max - min) + min;
    }
}