const musicMetadata = require("music-metadata-browser");
export {Decrypt}

const audio_mime_type = {
    mp3: "audio/mpeg",
    flac: "audio/flac"
};

async function Decrypt(file) {
    let tag = await musicMetadata.parseBlob(file);
    let pic_url = "";
    if (tag.tags.picture !== undefined) {
        let pic = new Blob([new Uint8Array(tag.tags.picture.data)], {type: tag.tags.picture.format});
        pic_url = URL.createObjectURL(pic);
    }

    let file_url = URL.createObjectURL(file);


    let filename_no_ext = file.name.substring(0, file.name.lastIndexOf("."));
    let filename_array = filename_no_ext.split("-");
    let filename_ext = file.name.substring(file.name.lastIndexOf(".") + 1, file.name.length).toLowerCase();
    const mime = audio_mime_type[filename_ext];
    let title = tag.common.title;
    let artist = tag.common.artist;

    if (filename_array.length > 1) {
        if (artist === undefined) artist = filename_array[0].trim();
        if (title === undefined) title = filename_array[1].trim();
    } else if (filename_array.length === 1) {
        if (title === undefined) title = filename_array[0].trim();
    }

    const filename = artist + " - " + title + "." + filename_ext;
    return {
        filename: filename,
        title: title,
        artist: artist,
        album: tag.tags.album,
        picture: pic_url,
        file: file_url,
        mime: mime
    }
}
