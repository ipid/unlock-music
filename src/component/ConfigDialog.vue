<style scoped>
label {
  cursor: pointer;
  line-height: 1.2;
  display: block;
}
.item-desc {
  color: #aaa;
  font-size: small;
  display: block;
  line-height: 1.2;
  margin-top: 0.2em;
}
.item-desc a {
  color: #aaa;
}

form >>> input {
  font-family: 'Courier New', Courier, monospace;
}

* >>> .um-config-dialog {
  max-width: 90%;
  width: 40em;
}
</style>

<template>
  <el-dialog @close="cancel()" title="解密设定" :visible="show" custom-class="um-config-dialog" center>
    <el-form ref="form" :rules="rules" status-icon :model="form" label-width="0">
      <section>
        <label>
          <span>
            JOOX Music ·
            <Ruby caption="Unique Device Identifier">设备唯一识别码</Ruby>
          </span>
          <el-form-item prop="jooxUUID">
            <el-input type="text" v-model="form.jooxUUID" clearable maxlength="32" show-word-limit> </el-input>
          </el-form-item>
        </label>

        <p class="item-desc">
          下载该加密文件的 JOOX 应用所记录的设备唯一识别码。
          <br />
          参见：
          <a href="https://github.com/unlock-music/joox-crypto/wiki/%E8%8E%B7%E5%8F%96%E8%AE%BE%E5%A4%87-UUID">
            获取设备 UUID · unlock-music/joox-crypto Wiki</a
          >。
        </p>
      </section>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button type="primary" :loading="saving" @click="emitConfirm()">确 定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { storage } from '@/utils/storage';
import Ruby from './Ruby';

// FIXME: 看起来不会触发这个验证提示？
function validateJooxUUID(rule, value, callback) {
  if (!value || !/^[\da-fA-F]{32}$/.test(value)) {
    callback(new Error('无效的 Joox UUID，请参考 Wiki 获取。'));
  } else {
    callback();
  }
}

const rules = {
  jooxUUID: { validator: validateJooxUUID, trigger: 'change' },
};

export default {
  components: {
    Ruby,
  },
  props: {
    show: { type: Boolean, required: true },
  },
  data() {
    return {
      rules,
      saving: false,
      form: {
        jooxUUID: '',
      },
      centerDialogVisible: false,
    };
  },
  async mounted() {
    await this.resetForm();
  },
  methods: {
    async resetForm() {
      this.form.jooxUUID = await storage.loadJooxUUID();
    },

    async cancel() {
      await this.resetForm();
      this.$emit('done');
    },

    async emitConfirm() {
      this.saving = true;
      await storage.saveJooxUUID(this.form.jooxUUID);
      this.saving = false;
      this.$emit('done');
    },
  },
};
</script>
