const ThreadsPlugin = require('threads-plugin');
module.exports = {
    publicPath: '',
    productionSourceMap: false,
    pwa: {
        manifestPath: "web-manifest.json",
        name: "音乐解锁",
        themeColor: "#4DBA87",
        msTileColor: "#000000",
        manifestOptions: {
            start_url: "./index.html",
            description: "在任何设备上解锁已购的加密音乐！",
            icons: [
                {
                    'src': './img/icons/android-chrome-192x192.png',
                    'sizes': '192x192',
                    'type': 'image/png'
                },
                {
                    'src': './img/icons/android-chrome-512x512.png',
                    'sizes': '512x512',
                    'type': 'image/png'
                }
            ]
        },
        appleMobileWebAppCapable: 'yes',
        iconPaths: {
            faviconSVG: './img/icons/safari-pinned-tab.svg',
            favicon32: './img/icons/favicon-32x32.png',
            favicon16: './img/icons/favicon-16x16.png',
            appleTouchIcon: './img/icons/apple-touch-icon-152x152.png',
            maskIcon: './img/icons/safari-pinned-tab.svg',
            msTileImage: './img/icons/msapplication-icon-144x144.png'
        },
        workboxPluginMode: "GenerateSW",
        workboxOptions: {
            skipWaiting: true
        }
    },
    configureWebpack: {
        plugins: [new ThreadsPlugin()]
    }
};
