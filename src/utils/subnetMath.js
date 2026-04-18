// src/utils/subnetMath.js

// =========================================================
// IPv4 NETWORK CALCULATIONS (32-bit Logic)
// =========================================================

/**
 * Converts an IPv4 string (e.g., 192.168.1.1) to a 32-bit integer.
 * This is essential because subnet slicing is done mathematically using raw integers.
 */
export const ipToInteger = (ipStr) => {
    return ipStr.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
};

/**
 * Converts a 32-bit integer back to a human-readable IPv4 string.
 */
export const integerToIp = (ipInt) => {
    return [
        (ipInt >>> 24) & 255,
        (ipInt >>> 16) & 255,
        (ipInt >>> 8) & 255,
        ipInt & 255
    ].join('.');
};

/**
 * Finds the required subnet block size (nearest power of 2)
 * based on the number of actual hosts needed.
 */
export const calculateBlockSize = (hosts) => {
    // We add 2 for the Network address and Broadcast address overhead
    const requiredTotal = hosts + 2;
    // Find the next perfect power of 2
    return Math.pow(2, Math.ceil(Math.log2(requiredTotal)));
};


// =========================================================
// IPv6 NETWORK UTILITIES (128-bit Logic)
// =========================================================

/**
 * Validates if a given string is a properly formatted IPv6 address.
 * Uses a standard Regex to handle both full and shorthand (::) notations.
 */
export const validateIPv6 = (ipStr) => {
    // The official regex standard for capturing all valid IPv6 formats
    const regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return regex.test(ipStr);
};

/**
 * Note for Future Scaling:
 * If we ever want to do pure dynamic VLSM slicing for IPv6 in Version 2.0 of this app, 
 * we cannot use bitwise operators (<<, >>>) because JavaScript limits them to 32 bits. 
 * We will need to use JavaScript's `BigInt` object here instead.
 */