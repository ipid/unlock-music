import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import './plugins/element.js'

// only if your build system can import css, otherwise import it wherever you would import your css.
Vue.config.productionTip = false;

new Vue({
    render: h => h(App),
}).$mount('#app');
