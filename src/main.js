import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import {
    Button, Col, Container, Footer, Icon, Image, Link, Main,
    Row, Table, TableColumn, Upload, Radio, Checkbox, Progress,
    Notification, Tooltip,
} from 'element-ui';
import 'element-ui/lib/theme-chalk/base.css';

Vue.use(Link);
Vue.use(Image);
Vue.use(Button);
Vue.use(Table);
Vue.use(TableColumn);
Vue.use(Main);
Vue.use(Footer);
Vue.use(Container);
Vue.use(Icon);
Vue.use(Row);
Vue.use(Col);
Vue.use(Upload);
Vue.use(Checkbox);
Vue.use(Radio);
Vue.use(Tooltip);
Vue.use(Progress);
Vue.prototype.$notify = Notification;

Vue.config.productionTip = false;

new Vue({
    render: h => h(App),
}).$mount('#app');
