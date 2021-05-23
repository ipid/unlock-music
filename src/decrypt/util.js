const ID3Writer = require("browser-id3-writer");


export const IXAREA_API_ENDPOINT = "https://stats.ixarea.com/apis"


export function GetFileInfo(artist, title, filenameNoExt, separator = "-") {
    let newArtist = "", newTitle = "";
    let filenameArray = filenameNoExt.split(separator);
    if (filenameArray.length > 1) {
        newArtist = filenameArray[0].trim();
        newTitle = filenameArray[1].trim();
    } else if (filenameArray.length === 1) {
        newTitle = filenameArray[0].trim();
    }

    if (typeof artist == "string" && artist !== "") newArtist = artist;
    if (typeof title == "string" && title !== "") newTitle = title;
    return {artist: newArtist, title: newTitle};
}



export async function GetWebImage(pic_url) {
    try {
        let resp = await fetch(pic_url);
        let mime = resp.headers.get("Content-Type");
        if (mime.startsWith("image/")) {
            let buf = await resp.arrayBuffer();
            let objBlob = new Blob([buf], {type: mime});
            let objUrl = URL.createObjectURL(objBlob);
            return {"buffer": buf, "src": pic_url, "url": objUrl, "type": mime};
        }
    } catch (e) {
    }
    return {"buffer": null, "src": pic_url, "url": "", "type": ""}
}

export async function WriteMp3Meta(audioData, artistList, title, album, pictureData = null, pictureDesc = "Cover", originalMeta = null) {
    const writer = new ID3Writer(audioData);
    if (originalMeta !== null) {
        artistList = originalMeta.common.artists || artistList
        title = originalMeta.common.title || title
        album = originalMeta.common.album || album
        const frames = originalMeta.native['ID3v2.4'] || originalMeta.native['ID3v2.3'] || originalMeta.native['ID3v2.2'] || []
        frames.forEach(frame => {
            if (frame.id !== 'TPE1' && frame.id !== 'TIT2' && frame.id !== 'TALB') {
                try {
                    writer.setFrame(frame.id, frame.value)
                } catch (e) {
                }
            }
        })
    }
    writer.setFrame('TPE1', artistList)
        .setFrame('TIT2', title)
        .setFrame('TALB', album);
    if (pictureData !== null) {
        writer.setFrame('APIC', {
            type: 3,
            data: pictureData,
            description: pictureDesc,
        })
    }
    writer.addTag();
    return writer.arrayBuffer;
}

