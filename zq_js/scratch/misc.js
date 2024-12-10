"use strict"

// misc / untested code

function hexstr(n) {
    return n.toString(16);
}


const c_a = "a".charCodeAt(0);
const c_z = "z".charCodeAt(0);
const c_A = "A".charCodeAt(0);
const c_Z = "Z".charCodeAt(0);
const c_0 = "0".charCodeAt(0);
const c_9 = "9".charCodeAt(0);
const c_plus  = "+".charCodeAt(0);
const c_slash = "/".charCodeAt(0);
const c_eq = "=".charCodeAt(0);

// Given the codepoint of a b64 char, gives the corresponding 0..63 value
function b64_charval(cp) {
    //TODO: UNTESTED
    assert(Number.isInteger(n), "n must be an int");

    // A=0  .. Z=25
    // a=26 .. z=51
    // 0=52 .. 9=61
    // +=62
    // /=63
    // = is padding

    let res = -1;
    if      (cp >= c_A && cp <= c_Z) { res = cp - c_A +  0; }
    else if (cp >= c_a && cp <= c_z) { res = cp - c_a + 26; }
    else if (cp >= c_0 && cp <= c_9) { res = cp - c_0 + 52; }
    else if (cp == c_plus)  { res = 62; }
    else if (cp == c_slash) { res = 63; }
    
    return res;
}

// Takes a b64-encoded string
// Ignores whitespace
// otherwise will crash on invalid characters 
// returns a UINT8_array of the data, or null
function b64_decode(str) {
    //TODO: NOT FINISHED
    for (let i = 0; i < str.length; i++) {
        let cp = str.charCodeAt(i);

    }
}

