# Quintessence

Messing around with quiney things

#### Chapter 1: zq.js
Dec 2024: initial proof of concept:
zipped webpage that has a download link with the same zip!
(except with minor changes like the version number incrementing each time)

Trivial quine (duplicates all of source in a string)
Minimal edits (does a find and replace on a string in index.html
Has image.png made from a base64 string in js file
js file can escape itself for quining, but not much else

`make` should create the quined js file, and also the initial zq.zip

#### Chapter 2: zq wasm

Lets try and make a rust wasm binary that does this, with explicit
data/state inputs that can be transformed

Goals:
- encrypt/compress representation of self, data, etc?
- Have some simple moving around (levels? interactivity? secrets?)
- Add modifications to components (image changing? filenames changing? shrinking/growing?)
- Have a mode switch (web to elf binary to back to web? steganography (png/smaller binary/back to original zip))

Phase 1:
- wasm binary, embedded in webpage, that emits anything
- wasm binary, embedded in webpage, that emits a zip of itself
