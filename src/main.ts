import Vue from 'vue';
import App from '@/App.vue';
import '@/registerServiceWorker';
import {
  Button,
  Checkbox,
  Col,
  Container,
  Dialog,
  Form,
  FormItem,
  Footer,
  Icon,
  Image,
  Input,
  Link,
  Main,
  Notification,
  Progress,
  Radio,
  Row,
  Table,
  TableColumn,
  Tooltip,
  Upload,
  MessageBox,
} from 'element-ui';
import 'element-ui/lib/theme-chalk/base.css';

Vue.use(Link);
Vue.use(Image);
Vue.use(Button);
Vue.use(Dialog);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Input);
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
Vue.prototype.$confirm = MessageBox.confirm;

Vue.config.productionTip = false;
new Vue({
  render: (h) => h(App),
}).$mount('#app');
