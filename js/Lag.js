export function lag(t1, t2, t3, t4) {
    return (t4 - t1) - (t3 - t2) / 2;
}

// t1 + lag + offset = t2
// t3 + lag + offset = t4

export function timeOffset(t1, t2, t3, t4) {
    return (t2 - t4) + (t3 - t1);
}