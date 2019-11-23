import Vue from 'vue'
import {
    Button,
    Col,
    Container,
    Footer,
    Icon,
    Image,
    Link,
    Main,
    Notification,
    Row,
    Table,
    TableColumn,
    Upload
} from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css'

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
Vue.prototype.$notify = Notification;
