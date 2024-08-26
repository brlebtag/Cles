// https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection
// https://box2d.org/posts/2023/10/simulation-islands/

export function isPointInsideAABB(point, box) {
    return (
      point.x >= box.minX &&
      point.x <= box.maxX &&
      point.y >= box.minY &&
      point.y <= box.maxY &&
      point.z >= box.minZ &&
      point.z <= box.maxZ
    );
  }

  export function isBoxesIntersected(a, b) {
    return (
      a.minX <= b.maxX &&
      a.maxX >= b.minX &&
      a.minY <= b.maxY &&
      a.maxY >= b.minY &&
      a.minZ <= b.maxZ &&
      a.maxZ >= b.minZ
    );
  }

  export function isPointInsideSphere(point, sphere) {
    // we are using multiplications because is faster than calling Math.pow
    const distance = Math.sqrt(
      (point.x - sphere.x) * (point.x - sphere.x) +
        (point.y - sphere.y) * (point.y - sphere.y) +
        (point.z - sphere.z) * (point.z - sphere.z),
    );
    return distance < sphere.radius;
  }
  
  export function isSpheresIntersected(sphere, other) {
    // we are using multiplications because it's faster than calling Math.pow
    const distance = Math.sqrt(
      (sphere.x - other.x) * (sphere.x - other.x) +
        (sphere.y - other.y) * (sphere.y - other.y) +
        (sphere.z - other.z) * (sphere.z - other.z),
    );
    return distance < sphere.radius + other.radius;
  }

  export function isSphereBoxIntersected(sphere, box) {
    // get box closest point to sphere center by clamping
    const x = Math.max(box.minX, Math.min(sphere.x, box.maxX));
    const y = Math.max(box.minY, Math.min(sphere.y, box.maxY));
    const z = Math.max(box.minZ, Math.min(sphere.z, box.maxZ));
  
    // this is the same as isPointInsideSphere
    const distance = Math.sqrt(
      (x - sphere.x) * (x - sphere.x) +
        (y - sphere.y) * (y - sphere.y) +
        (z - sphere.z) * (z - sphere.z),
    );
  
    return distance < sphere.radius;
  }