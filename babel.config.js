module.exports = {
    presets: [
        '@vue/cli-plugin-babel/preset',
        ["@babel/preset-env", {
            "useBuiltIns": "entry",
            "corejs": 3,
            "modules": false
        }]
    ],
    plugins: [
        ["component", {
            "libraryName": "element-ui",
            "styleLibraryName": "theme-chalk"
        }]
    ]
};
