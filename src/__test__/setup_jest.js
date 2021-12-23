// Polyfill for node.
global.Blob = global.Blob || require("node:buffer").Blob;
