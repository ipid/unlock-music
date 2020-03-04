//TODO: Use other method to fix this
// !! Only Temporary Solution
// it seems like that @babel/plugin-proposal-object-rest-spread not working
// to fix up the compatibility for Edge 18 and some older Chromium
// now manually edit the dependency files

const fs = require('fs');
const filePath = "./node_modules/file-type/core.js";
const regReplace = /{\s*([a-zA-Z0-9:,\s]*),\s*\.\.\.([a-zA-Z0-9]*)\s*};/m;
if (fs.existsSync(filePath)) {
    console.log("File Found!");
    let data = fs.readFileSync(filePath).toString();
    const regResult = regReplace.exec(data);
    if (regResult != null) {
        data = data.replace(regResult[0],
            "Object.assign({ " + regResult[1] + " }, " + regResult[2] + ");"
        );
        fs.writeFileSync(filePath, data);
        console.log("Object rest spread in file-type fixed!");
    } else {
        console.log("No fix needed.");
    }
} else {
    console.log("File Not Found!");
}
