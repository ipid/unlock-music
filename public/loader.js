(function () {
    setTimeout(function () {
        var ele = document.getElementById("loader-tips-timeout");
        if (ele != null) {
            ele.hidden = false;
        }
    }, 2000);

    var ua = navigator && navigator.userAgent;
    var detected = (function () {
        var m;
        if (!ua) return true;
        if (/MSIE |Trident\//.exec(ua)) return true; // no IE
        m = /Edge\/([\d.]+)/.exec(ua); // Edge >= 17
        if (m && Number(m[1]) < 17) return true;
        m = /Chrome\/([\d.]+)/.exec(ua); // Chrome >= 58
        if (m && Number(m[1]) < 58) return true;
        m = /Firefox\/([\d.]+)/.exec(ua); // Firefox >= 45
        return m && Number(m[1]) < 45;
    })();
    if (detected) {
        document.getElementById('loader-tips-outdated').hidden = false;
        document.getElementById("loader-tips-timeout").hidden = false;
    }
})();
