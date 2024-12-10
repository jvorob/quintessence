"use strict"


const quine_body = `
#QUINE_INSERT
`;

#QUINE_START
// Lets make zip files!
// First let's set up some tools for working with Uint8Arrays
//
// fmtBytes(arr, offset, len)
//   returns a string containing `len` hex bytes starting at offset
// dump(arr, offset, len)
//   hexdump with addresses
// dump(arr)

// Given a Uint8Array, write a value at a given offset
function writeLE(n, arr, offset, num_bytes) {
    assert(n >= 0, "can only write unsigned ints (>= 0)");
    assert(offset + num_bytes <= arr.length,  // 1-byte write at offset 0 requires a len of 1
        `U8Arr of length ${arr.length} doesn't have room for ${num_bytes}-byte write at offset ${offset}`)

    for (let byte_i = 0; byte_i < num_bytes; byte_i++) {
        arr[offset + byte_i] = (n >> (8 * byte_i)) & 0xFF;
    }
}
// readLE(n, arr, offset, num_bytes)

// Given an array of Uint8Arrays, returns a contatenated u8array
function concatU8Arrays(chunks) {
    const size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    let out = new Uint8Array(size);

    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out;
}

// STOLEN FROM STACKOVERFLOW: https://stackoverflow.com/questions/18638900/javascript-crc32
const crc32 = (function() {
    let table = new Uint32Array(256);

    // Pre-generate crc32 polynomial lookup table
    // http://wiki.osdev.org/CRC32#Building_the_Lookup_Table
    // ... Actually use Alex's because it generates the correct bit order
    //     so no need for the reversal function
    for(let i=256; i--;) {
        let tmp = i;
        for(let k=8; k--;) {
            tmp = tmp & 1 ? 3988292384 ^ tmp >>> 1 : tmp >>> 1;
        }
        table[i] = tmp;
    }

    // crc32b
    // Example input        : [97, 98, 99, 100, 101] (Uint8Array)
    // Example output       : 2240272485 (Uint32)
    return function( data ) {
        let crc = -1; // Begin with all bits set ( 0xffffffff )

        for(let i=0, l=data.length; i<l; i++) {
            crc = crc >>> 8 ^ table[ crc & 255 ^ data[i] ];
        }
        return (crc ^ -1) >>> 0; // Apply binary NOT
    };
})();

// Takes an array of files and their names
// - files are uint8Arrays
// - filename are strings
function makeZip(files_and_names) {
    const files     = files_and_names.map(fn => fn[0]);
    const filenames = files_and_names.map(fn => fn[1]);

    assert(files.length == filenames.length, "number of files and filenames must match")

    // Documentation:
    // 2006 version of ZIP spec
    //      https://pkwaredownloads.blob.core.windows.net/pkware-general/Documentation/APPNOTE-6.3.0.TXT

    // === General notes:
    // version made by: upper byte is OS (20-255 unused?). (Lower byte is 10*major version + minor verison)
    // version needed to extract: 2.0 should be fine? allows DEFLATE. 6.3 is LZMA
    // compression method: 0 = none, 8 = DEFLATE?
    // bit 3 of general purpose flags: 12-byte or 16-byte data descriptor follows data
    // bit 11: filenames are utf8
    //
    // dates and times are standard ms-dos format
    // crc-32: magic number 0xdebb20e3, precondition 0xffffffff, post-condition with 1-complement of residual
    //

    console.log(`Creating zip data containing ${files.length} files`)

    const enc = new TextEncoder();

    let file_data = []; // we'll accumulate file headers and data into here
    let cdir_data = []; // we'll accumulate the end headers into here
    let file_offset = 0; // offset we're at (only counts files and local file headers)
    let cdir_size = 0; // size of central directory so far

    // === Constants
    const FHDR_SIG = 0x04034b50;
    const EHDR_SIG = 0x02014b50;
    const EOCD_SIG = 0x06054b50;
    const MIN_VERSION = 20; // min version needed to extrace, 2.0 should be fine
    //const ZIP_VERSION = 0xff20; // what zip version are we? (hibyte is system, lobyte is version)

    for (let i = 0; i < files.length; i++) {
        const msg = files[i];
        const filename = filenames[i];
        console.log(`- adding file "${filename}", containing ${msg.length} bytes`);
        assert(msg instanceof Uint8Array, "msg must be a Uint8Array")


        // Local file header
        const fhdr = new Uint8Array(30); // up to (excl.) name field
        const fname = enc.encode(filename);

        // Central directory header
        const ehdr = new Uint8Array(46); // up to (excl.) name field


        // ==== per-file info
        const filesize = msg.length;
        const crc = crc32(msg); 
        const fhdr_offset = file_offset;

        // ==== Write the data for this current file:

        // Structure:
        // - local file header
        writeLE(FHDR_SIG,         fhdr,   0,  4); // signature (0x04034b50)
        writeLE(MIN_VERSION,      fhdr,   4,  2); // min version needed to extract
        //                               6    2   // bit flag
        //                               8    2   // compression method (0 = none)
        //                               10   2   // last mod time
        //                               12   2   // last mod date
        writeLE(crc,              fhdr,  14,  4); // crc32 of raw data 
        writeLE(filesize,         fhdr,  18,  4); // comp. size
        writeLE(filesize,         fhdr,  22,  4); // uncomp. size
        writeLE(fname.length,     fhdr,  26,  2); // (n) name length
        //                               28   2   // (m) extra field length
        //                               30   n   // name
        //                               30+n m   // extra field


        // - file contents
        // - ... (more local files)
        // - central directory header
        writeLE(EHDR_SIG,         ehdr,   0,    4); // signature (0x02014b50)
        //                                4     2   // zip version created
        writeLE(MIN_VERSION,      ehdr,   6,    2); // zip version needed to extract
        //                                8     2   // bit flag?
        //                               10     2   // compression method
        //                               12     2   // mod time
        //                               14     2   // mod date
        //                               16     4   // crc32 of data
        writeLE(filesize,         ehdr,  20,    4); // comp. size
        writeLE(filesize,         ehdr,  24,    4); // raw size
        writeLE(fname.length,     ehdr,  28,    2); // (n) name length
        //                               30     2   // (m) extra field length
        //                               32     2   // (k) file comment length
        //                               34     2   // disk number of file start
        //                               36     2   // internal file attrs (bit 1: ascii/text?, bit 2:  extra 4-byte control field?)
        //                               38     4   // extern file attrs (os attrs? can be 0)
        writeLE(fhdr_offset,      ehdr,  42,    4); // offset of local file header (all slashes should be /)
        //                               46     n   // name
        //                               46+n   m   // extra field
        //                               46+n+m k   // file comment
        // - ...  ( more central directory entries)

        // === Add data to arrays: adjust file offset
        file_data.push(fhdr, fname, msg);
        file_offset += fhdr.length + fname.length + msg.length;

        cdir_data.push(ehdr, fname);
        cdir_size += ehdr.length + fname.length;
    }

    // We've now added all the files:
    // let's set up the central directory

    let eocd = new Uint8Array(22);

    // === EOCD info
    const cdir_numrec = files.length; // one cdir record per file
    // cdir_size: includes all cdir headers but not EOCD
    const cdir_offset = file_offset; // cdir starts after end of all local headers/file data




    //Then: finish off with the eocd
    // - end of central directory
    writeLE(EOCD_SIG,         eocd,   0,    4); // signature (0x06054b50)
    //                                4     2   // curr disk number (0?)
    //                                6     2   // disk where central dir starts (0?)
    writeLE(cdir_numrec,      eocd,   8,    2); // number of central dir records (on curr disk)
    writeLE(cdir_numrec,      eocd,  10,    2); // number of central dir records (total)
    writeLE(cdir_size,        eocd,  12,    4); // size of central dir (bytes)
    writeLE(cdir_offset,      eocd,  16,    4); // offset of start of central dir from start of archive
    //                               20     2   // (n) comment length
    //                               22     n   // comment
    //


    // stitch all arrays together into 1
    return concatU8Arrays([...file_data, ...cdir_data, eocd]);
}


// =======================================
//
//              MAIN
//
// =======================================
//

// ======= GRAB THE HTML BEFORE WE GO
const html_text = "<!DOCTYPE html>\n" +  document.documentElement.outerHTML;
console.log(`Grabbed html doc: ${html_text.length} chars`)

// ======= GRAB OUR OWN SOURCE?

const our_src = document.currentScript;

// ======== MAKE A PNG
const img_raw = `
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9
kT1Iw0AcxV9TRdGKgx2qOGSoThZERRy1CkWoEGqFVh1MLv2CJg1Jiouj4Fpw8GOx6uDirKuDqyAI
foA4OzgpukiJ/0sKLWI8OO7Hu3uPu3eAUC8zzeoYBzTdNlOJuJjJropdr+hFBAIGEZOZZcxJUhK+
4+seAb7exXiW/7k/R5+asxgQEIlnmWHaxBvE05u2wXmfOMyKskp8Tjxm0gWJH7muePzGueCywDPD
Zjo1TxwmFgttrLQxK5oa8RRxVNV0yhcyHquctzhr5Spr3pO/MJTTV5a5TnMYCSxiCRJEKKiihDJs
xGjVSbGQov24j3/I9UvkUshVAiPHAirQILt+8D/43a2Vn5zwkkJxoPPFcT5GgK5doFFznO9jx2mc
AMFn4Epv+St1YOaT9FpLix4B/dvAxXVLU/aAyx0g8mTIpuxKQZpCPg+8n9E3ZYGBW6BnzeutuY/T
ByBNXSVvgINDYLRA2es+7+5u7+3fM83+fgB/nHKsAvTb9gAAAAlwSFlzAAAuIwAALiMBeKU/dgAA
AAd0SU1FB+gLGAIbCp7Zi8QAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAC
cElEQVQoz3WRO1MTYRiF3++ymw0bCVGSAKFQJ6PcHUctHAsLZvgBVpaOBZ0F/8nOWi1oEBkGUGdE
B3SSIGYD4ZKEXHY3+Xb32/e1wHEs9KnPKc55mH96Cn8gQq0BgEsJjMG/4H+nI9f1HEc1GhhF8B/k
9t6HQIdjmWwKJDt0VK3WCb1roxPGkJ0sFIaLRW4YAEAErhfXzwP2YGWBgGaHby8kcnfdxDF2yoOj
OVkoyqwwTDOXS01Npaen/VC8XWvtH4RC3keFfQvFCIrIMj/ybhv7B9DxDZogG7quqlYjZOVuenXL
Lx1puTyznOBiOpmjSvl1+1PNZCikF3t1rB/Z/KkoWr1BddvZ1JlvTuLUI7ny5AXF8dn6elntDUCr
mHrUbUcXnIm27rnD+rl1o3Fi757QaUAxAQcA1WwODg8N4DETCiJXuwSIFCNhyf2xilUE3ieBBHR5
a+S6qNRVbs+KPAcmmcGAmTwhmWDAEsiIYACcLj3UGyctSwwKWZ/Cx/L6Q+tmRqaGuM2BqdhPop6P
s80g1dG/jYlmvrFR2nKoX4uaWS3vQbYet8v6SJGvUU1jvoCLG+eTTmjgZUHNe42g0ey3XMGyycwk
Dk2KdCWq9ynMsxEO47tB2MVcT6WQGADIpcJSKpG6lS9OZMbmCsXoe0nu7z3Tj96or0CSG7yfdMts
J/YXoZ/mAKzl/ARgpmFwxgEAtW5VnM0v+lVp/RgrggvGpBncOavNBxFnDKRlWgAQI523QkRCgrXS
lZfv3At7xLe4JNsOZ5g3YzIRAhGAvNzevIje73RVQDqmz6WgPSBUMzwtjGCcglEPuSYwBQOCX5l+
Zo4jl1GbAAAAAElFTkSuQmCC`

const whitespace = /\s/g
const img = img_raw.replaceAll(whitespace,"");


const assert = function(condition, message) {
        if (!condition)
                throw Error('Assert failed: ' + (message || ''));
};


// let's decode the base64 into raw bytes
let strbytes = atob(img); // atob parses base64 string to raw bytes as a bare js string (each charCodeAt is a byte, 16-bit codepoint)
// === OLD WRONG CODE: encodes as utf8
//let enc = new TextEncoder(); // defaults to utf8?
// let bytes = enc.encode(strbytes) //atob parses base64 to a binary js string?

let imgBytes = Uint8Array.from(strbytes, c => c.charCodeAt(0));

// let blob = new Blob([imgBytes], {type:"image/png"}); //don't set mime type
// let tgturl= URL.createObjectURL(blob);
// //use URL.revokeObjectURL() to free
// 
// let e = document.createElement("a");
// e.setAttribute("href",tgturl);
// e.setAttribute("download","img.png"); // sets suggested download neme
// e.innerText = "Download programmatic file"
// 
// let tgt = document.querySelector("#tgt")
// tgt.appendChild(e);

// ======== MAKE A ZIP FILE

const jsStr = `"use strict"
let str = "hello from the inside";
let blob = new Blob([new TextEncoder().encode(str)], {type:"text/plain"});
let tgturl = URL.createObjectURL(blob);
let e = document.createElement("a");
e.setAttribute("href", tgturl);
e.setAttribute("download", "inside.txt");
e.innerText = "Download the innermost secret";
document.querySelector("#tgt").appendChild(e);
`;
const jsBytes = new TextEncoder().encode(jsStr);


function js_escape(str) {
    const MARKER = "XXX" + "XXX" + "42"; // can't put this in verbatim
    str = str.replaceAll("\\", MARKER);
    str = str.replaceAll("`", "\\`");
    str = str.replaceAll("$", "\\$");
    str = str.replaceAll(MARKER, "\\\\");
    return str;
}
const quineStr = `"use strict"
const quine_body = \`
${js_escape(quine_body)}
\`;
${quine_body}`;

const quineBytes = new TextEncoder().encode(quineStr);

// update html
console.log("");
const zqreg = /zq([0-9]+)/;
const zqreg_global = /zq([0-9]+)/g;
const found = html_text.match(zqreg);
const iter = Number(found[1]);
const newlevel = `zq${iter+1}`;
console.log(`Found zq match: ${found[0]}, next iteration is ${newlevel}`);


let final_html = html_text.replaceAll(zqreg_global, newlevel)
const htmlBytes = new TextEncoder().encode(final_html);

let named_files = [];
named_files.push([ imgBytes,   "img.png"]);
const helloBytes = new TextEncoder().encode("hello");
named_files.push([ helloBytes, "hello.txt"]);
named_files.push([ htmlBytes,  "index.html"]);
named_files.push([ quineBytes, `${newlevel}.js`]);
named_files.push([ jsBytes,    `inner.js`]);

const testZip = makeZip(named_files);


let zipBlob = new Blob([testZip], {type:"application/zip"}); //don't set mime type
let zipUrl= URL.createObjectURL(zipBlob); //use URL.revokeObjectURL() to free

let e = document.createElement("a");
e.setAttribute("href",zipUrl);
e.setAttribute("download",`${newlevel}.zip`); // sets suggested download neme
e.innerText = "Download zip file"

//let tgt = document.querySelector("#tgt")
tgt.appendChild(e);

#QUINE_END
